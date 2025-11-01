-- =====================================================
-- UNIFIED OFFER + DEPOSIT SYSTEM
-- =====================================================
-- 
-- Business Logic:
-- 1. Regular Sellers: Accepted offers DO NOT reserve listing (stays active)
-- 2. Pro Sellers with deposits: Accepted offers require deposit payment
-- 3. Deposit payment triggers listing reservation
-- 4. This prevents conflicts between offer and deposit systems
-- =====================================================

-- 1. Add offer_id to listing_deposits (link deposit to accepted offer)
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_listing_deposits_offer ON listing_deposits(offer_id);

-- 2. Add awaiting_deposit flag to offers table
ALTER TABLE offers ADD COLUMN IF NOT EXISTS awaiting_deposit BOOLEAN DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deposit_deadline TIMESTAMP;

-- 3. Update the listing_reservations table to NOT change status for regular sellers
-- Drop the old createListingReservation function if it exists
DROP FUNCTION IF EXISTS create_listing_reservation(UUID, UUID, UUID, DECIMAL);

-- 4. Create new RPC: Accept Offer (Updated Logic)
CREATE OR REPLACE FUNCTION accept_offer_v2(
  p_offer_id UUID,
  p_seller_id UUID,
  p_acceptance_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_offer RECORD;
  v_listing RECORD;
  v_is_pro_seller BOOLEAN;
  v_requires_deposit BOOLEAN;
BEGIN
  -- Get offer details
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
    AND seller_id = p_seller_id
    AND status = 'pending';

  IF v_offer IS NULL THEN
    RAISE EXCEPTION 'Offer not found or already processed';
  END IF;

  -- Check if offer expired
  IF v_offer.expires_at < NOW() THEN
    UPDATE offers SET status = 'expired' WHERE id = p_offer_id;
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Get listing details
  SELECT 
    l.*,
    COALESCE(p.subscription_status IN ('active', 'trialing'), FALSE) as is_pro_seller
  INTO v_listing
  FROM listings l
  JOIN profiles p ON l.user_id = p.id
  WHERE l.id = v_offer.listing_id;

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_listing.status != 'active' THEN
    RAISE EXCEPTION 'Listing is no longer available';
  END IF;

  v_is_pro_seller := v_listing.is_pro_seller;
  v_requires_deposit := v_listing.requires_deposit;

  -- Update offer status to accepted
  UPDATE offers
  SET 
    status = 'accepted',
    updated_at = NOW(),
    awaiting_deposit = (v_is_pro_seller AND v_requires_deposit),
    deposit_deadline = CASE 
      WHEN v_is_pro_seller AND v_requires_deposit 
      THEN NOW() + INTERVAL '24 hours'
      ELSE NULL
    END
  WHERE id = p_offer_id;

  -- Reject all other pending offers for this listing
  UPDATE offers
  SET 
    status = 'rejected',
    updated_at = NOW()
  WHERE listing_id = v_offer.listing_id
    AND id != p_offer_id
    AND status = 'pending';

  -- Send notifications
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_offer.buyer_id,
    'offer_accepted',
    'Offer Accepted! 🎉',
    CASE 
      WHEN v_is_pro_seller AND v_requires_deposit 
      THEN 'Your offer has been accepted! Please secure this item with a ₵20 deposit within 24 hours.'
      ELSE 'Your offer has been accepted! The seller will contact you to complete the transaction.'
    END,
    json_build_object(
      'offer_id', p_offer_id,
      'listing_id', v_offer.listing_id,
      'amount', v_offer.amount,
      'requires_deposit', (v_is_pro_seller AND v_requires_deposit)
    )
  );

  -- Return result
  RETURN json_build_object(
    'success', true,
    'offer_id', p_offer_id,
    'requires_deposit', (v_is_pro_seller AND v_requires_deposit),
    'is_pro_seller', v_is_pro_seller,
    'deposit_deadline', CASE 
      WHEN v_is_pro_seller AND v_requires_deposit 
      THEN NOW() + INTERVAL '24 hours'
      ELSE NULL
    END,
    'message', CASE 
      WHEN v_is_pro_seller AND v_requires_deposit 
      THEN 'Offer accepted. Buyer must pay deposit within 24 hours.'
      ELSE 'Offer accepted. Buyer has been notified.'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_offer_v2 TO authenticated;

-- 5. Update initialize_deposit to accept offer_id
DROP FUNCTION IF EXISTS initialize_deposit(UUID, UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION initialize_deposit(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_reserved_quantity INTEGER DEFAULT 1,
  p_conversation_id UUID DEFAULT NULL,
  p_offer_id UUID DEFAULT NULL  -- New parameter
)
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_deposit_id UUID;
  v_paystack_reference VARCHAR(255);
  v_buyer_active_deposits INTEGER;
  v_available_quantity INTEGER;
  v_offer RECORD;
BEGIN
  -- If offer_id provided, validate it
  IF p_offer_id IS NOT NULL THEN
    SELECT * INTO v_offer
    FROM offers
    WHERE id = p_offer_id
      AND buyer_id = p_buyer_id
      AND status = 'accepted'
      AND awaiting_deposit = TRUE;

    IF v_offer IS NULL THEN
      RAISE EXCEPTION 'Offer not found or not awaiting deposit';
    END IF;

    -- Check deposit deadline
    IF v_offer.deposit_deadline IS NOT NULL AND v_offer.deposit_deadline < NOW() THEN
      -- Expire the offer
      UPDATE offers SET status = 'expired', awaiting_deposit = FALSE WHERE id = p_offer_id;
      RAISE EXCEPTION 'Deposit deadline has passed. Offer has expired.';
    END IF;

    -- Use the listing from the offer
    p_listing_id := v_offer.listing_id;
  END IF;

  -- Get listing details
  SELECT * INTO v_listing
  FROM listings
  WHERE id = p_listing_id;

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF NOT v_listing.requires_deposit THEN
    RAISE EXCEPTION 'This listing does not require a deposit';
  END IF;

  IF v_listing.user_id = p_buyer_id THEN
    RAISE EXCEPTION 'You cannot commit to your own listing';
  END IF;

  IF v_listing.status != 'active' THEN
    RAISE EXCEPTION 'This listing is no longer available';
  END IF;

  -- Validate quantity
  IF p_reserved_quantity < 1 THEN
    RAISE EXCEPTION 'Reserved quantity must be at least 1';
  END IF;

  -- Check available quantity
  v_available_quantity := v_listing.quantity - v_listing.reserved_quantity;
  
  IF v_available_quantity < p_reserved_quantity THEN
    RAISE EXCEPTION 'Not enough units available. Only % units remaining.', v_available_quantity;
  END IF;

  -- Check buyer limits (max 3 active deposits)
  SELECT COUNT(*) INTO v_buyer_active_deposits
  FROM listing_deposits
  WHERE buyer_id = p_buyer_id
    AND status IN ('pending', 'paid')
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_buyer_active_deposits >= 3 THEN
    RAISE EXCEPTION 'You have reached the maximum of 3 active deposit commitments';
  END IF;

  -- Check if buyer is banned
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_buyer_id
      AND deposit_banned_until IS NOT NULL
      AND deposit_banned_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Your deposit privileges are temporarily suspended';
  END IF;

  -- Generate Paystack reference
  v_paystack_reference := 'DEP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12));

  -- Calculate total deposit amount (₵20 per unit)
  DECLARE
    v_total_amount DECIMAL(10,2) := 20.00 * p_reserved_quantity;
    v_total_pesewas INTEGER := CAST(v_total_amount * 100 AS INTEGER);
  BEGIN
    -- Create deposit record
    INSERT INTO listing_deposits (
      listing_id,
      buyer_id,
      seller_id,
      conversation_id,
      offer_id,  -- Link to offer if provided
      amount,
      reserved_quantity,
      status,
      paystack_reference,
      expires_at
    ) VALUES (
      p_listing_id,
      p_buyer_id,
      v_listing.user_id,
      p_conversation_id,
      p_offer_id,
      v_total_amount,
      p_reserved_quantity,
      'pending',
      v_paystack_reference,
      NOW() + INTERVAL '24 hours' -- Initial payment window
    )
    RETURNING id INTO v_deposit_id;

    -- Return deposit details for payment initialization
    RETURN json_build_object(
      'deposit_id', v_deposit_id,
      'reference', v_paystack_reference,
      'amount', v_total_pesewas, -- Amount in pesewas
      'reserved_quantity', p_reserved_quantity,
      'unit_price', 2000, -- ₵20 per unit in pesewas
      'email', (SELECT email FROM auth.users WHERE id = p_buyer_id),
      'listing_title', v_listing.title,
      'seller_name', (SELECT full_name FROM profiles WHERE id = v_listing.user_id),
      'available_quantity', v_available_quantity,
      'offer_id', p_offer_id
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION initialize_deposit TO authenticated;

-- 6. Trigger: Mark listing as reserved when deposit is PAID (not pending)
-- This replaces the old listing reservation system for offer-based deposits
CREATE OR REPLACE FUNCTION mark_listing_reserved_on_deposit_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
BEGIN
  -- When deposit status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    -- Get listing details
    SELECT * INTO v_listing
    FROM listings
    WHERE id = NEW.listing_id;

    -- If this deposit is linked to an offer, update the offer
    IF NEW.offer_id IS NOT NULL THEN
      UPDATE offers
      SET 
        awaiting_deposit = FALSE,
        updated_at = NOW()
      WHERE id = NEW.offer_id;
    END IF;

    -- Check if all units are now reserved
    IF v_listing.quantity = (v_listing.reserved_quantity + NEW.reserved_quantity) THEN
      -- All units reserved, mark listing as reserved
      UPDATE listings
      SET 
        status = 'reserved',
        reserved_until = NEW.expires_at,
        updated_at = NOW()
      WHERE id = NEW.listing_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_listing_reserved_on_deposit ON listing_deposits;
CREATE TRIGGER trigger_mark_listing_reserved_on_deposit
  AFTER INSERT OR UPDATE ON listing_deposits
  FOR EACH ROW
  EXECUTE FUNCTION mark_listing_reserved_on_deposit_paid();

-- 7. Trigger: Restore listing to active when deposit is released/refunded/expired
CREATE OR REPLACE FUNCTION restore_listing_on_deposit_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
BEGIN
  -- When deposit moves to final state
  IF NEW.status IN ('released', 'refunded', 'expired', 'cancelled') AND OLD.status = 'paid' THEN
    -- Get listing details
    SELECT * INTO v_listing
    FROM listings
    WHERE id = OLD.listing_id;

    -- Check remaining reserved quantity
    DECLARE
      v_remaining_reserved INTEGER;
    BEGIN
      SELECT COALESCE(SUM(reserved_quantity), 0) INTO v_remaining_reserved
      FROM listing_deposits
      WHERE listing_id = OLD.listing_id
        AND status = 'paid'
        AND id != OLD.id;

      -- If no more active reservations and listing was reserved, restore to active
      IF v_remaining_reserved = 0 AND v_listing.status = 'reserved' THEN
        UPDATE listings
        SET 
          status = 'active',
          reserved_until = NULL,
          updated_at = NOW()
        WHERE id = OLD.listing_id;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restore_listing_on_deposit_complete ON listing_deposits;
CREATE TRIGGER trigger_restore_listing_on_deposit_complete
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  EXECUTE FUNCTION restore_listing_on_deposit_complete();

-- 8. Cron job: Expire offers awaiting deposit past deadline
CREATE OR REPLACE FUNCTION expire_offers_awaiting_deposit()
RETURNS JSON AS $$
DECLARE
  v_expired_count INTEGER := 0;
BEGIN
  UPDATE offers
  SET 
    status = 'expired',
    awaiting_deposit = FALSE,
    updated_at = NOW()
  WHERE status = 'accepted'
    AND awaiting_deposit = TRUE
    AND deposit_deadline < NOW();
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'message', 'Expired ' || v_expired_count || ' offers awaiting deposit'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION expire_offers_awaiting_deposit TO service_role;

-- Schedule cron job to run every hour
SELECT cron.schedule(
  'expire-offers-awaiting-deposit',
  '0 * * * *',  -- Every hour
  $$
  SELECT expire_offers_awaiting_deposit();
  $$
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Unified Offer + Deposit System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Business Logic:';
  RAISE NOTICE '  ✓ Regular Sellers: Accepted offers DO NOT reserve listing';
  RAISE NOTICE '  ✓ Pro Sellers with deposits: Accepted offers require deposit (24h deadline)';
  RAISE NOTICE '  ✓ Deposit payment triggers listing reservation';
  RAISE NOTICE '  ✓ No conflicts between offer and deposit systems';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  • accept_offer_v2() - Smart offer acceptance';
  RAISE NOTICE '  • initialize_deposit() - Now accepts offer_id';
  RAISE NOTICE '  • expire_offers_awaiting_deposit() - Cron job';
END $$;

