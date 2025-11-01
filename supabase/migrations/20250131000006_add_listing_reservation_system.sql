-- =====================================================
-- LISTING RESERVATION SYSTEM: Quantity & Multi-Unit Support
-- =====================================================
-- 
-- Features:
-- 1. Sellers can list items with quantity (bulk listings)
-- 2. Buyers can reserve 1 or more units with deposit
-- 3. Automatic reservation tracking per listing
-- 4. Prevents over-reservation
-- 5. Auto-releases reserved units when deposits expire/cancel
-- =====================================================

-- 1. Add quantity and reservation fields to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED;

-- Add constraint to ensure we don't over-reserve
ALTER TABLE listings ADD CONSTRAINT check_reservation_valid 
  CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity);

-- 2. Add quantity field to listing_deposits (how many units buyer is reserving)
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 1;
ALTER TABLE listing_deposits ADD CONSTRAINT check_deposit_quantity_positive 
  CHECK (reserved_quantity > 0);

-- 3. Trigger: Reserve units when deposit is paid
CREATE OR REPLACE FUNCTION reserve_listing_units()
RETURNS TRIGGER AS $$
BEGIN
  -- When deposit changes from 'pending' to 'paid', reserve the units
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    -- Check if enough units are available
    IF NOT EXISTS (
      SELECT 1 FROM listings
      WHERE id = NEW.listing_id
        AND (quantity - reserved_quantity) >= NEW.reserved_quantity
    ) THEN
      RAISE EXCEPTION 'Not enough units available. Only % units remaining.', 
        (SELECT quantity - reserved_quantity FROM listings WHERE id = NEW.listing_id);
    END IF;

    -- Reserve the units
    UPDATE listings
    SET reserved_quantity = reserved_quantity + NEW.reserved_quantity
    WHERE id = NEW.listing_id;

    RAISE NOTICE 'Reserved % unit(s) for listing %', NEW.reserved_quantity, NEW.listing_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reserve_listing_units ON listing_deposits;
CREATE TRIGGER trigger_reserve_listing_units
  AFTER INSERT OR UPDATE ON listing_deposits
  FOR EACH ROW
  EXECUTE FUNCTION reserve_listing_units();

-- 4. Trigger: Release units when deposit is released/cancelled/expired/refunded
CREATE OR REPLACE FUNCTION release_listing_units()
RETURNS TRIGGER AS $$
BEGIN
  -- When deposit moves to final state (released, refunded, expired, cancelled)
  -- from 'paid' status, release the reserved units back to available
  IF NEW.status IN ('released', 'refunded', 'expired', 'cancelled') AND OLD.status = 'paid' THEN
    UPDATE listings
    SET reserved_quantity = reserved_quantity - OLD.reserved_quantity
    WHERE id = OLD.listing_id;

    RAISE NOTICE 'Released % unit(s) for listing %', OLD.reserved_quantity, OLD.listing_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_release_listing_units ON listing_deposits;
CREATE TRIGGER trigger_release_listing_units
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  EXECUTE FUNCTION release_listing_units();

-- 5. Trigger: Release units when deposit is deleted (cleanup)
CREATE OR REPLACE FUNCTION release_listing_units_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If deposit was in 'paid' status, release the units
  IF OLD.status = 'paid' THEN
    UPDATE listings
    SET reserved_quantity = reserved_quantity - OLD.reserved_quantity
    WHERE id = OLD.listing_id;

    RAISE NOTICE 'Released % unit(s) for listing % (deposit deleted)', OLD.reserved_quantity, OLD.listing_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_release_units_on_delete ON listing_deposits;
CREATE TRIGGER trigger_release_units_on_delete
  AFTER DELETE ON listing_deposits
  FOR EACH ROW
  EXECUTE FUNCTION release_listing_units_on_delete();

-- 6. Drop old initialize_deposit function and create new one with quantity parameter
DROP FUNCTION IF EXISTS initialize_deposit(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS initialize_deposit(UUID, UUID);

CREATE OR REPLACE FUNCTION initialize_deposit(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_reserved_quantity INTEGER DEFAULT 1, -- New parameter
  p_conversation_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_deposit_id UUID;
  v_paystack_reference VARCHAR(255);
  v_buyer_active_deposits INTEGER;
  v_available_quantity INTEGER;
BEGIN
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

  -- Check if enough units are available
  v_available_quantity := v_listing.quantity - v_listing.reserved_quantity;
  IF v_available_quantity < p_reserved_quantity THEN
    RAISE EXCEPTION 'Only % unit(s) available. You requested %.', v_available_quantity, p_reserved_quantity;
  END IF;

  -- Check if buyer already has a paid deposit for this listing
  IF EXISTS (
    SELECT 1 FROM listing_deposits
    WHERE listing_id = p_listing_id
      AND buyer_id = p_buyer_id
      AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'You already have an active deposit for this listing';
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
      'available_quantity', v_available_quantity
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update grant permissions
GRANT EXECUTE ON FUNCTION initialize_deposit TO authenticated;

-- 7. Add helper function to check available quantity for a listing
CREATE OR REPLACE FUNCTION get_listing_availability(p_listing_id UUID)
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
BEGIN
  SELECT 
    id,
    title,
    quantity,
    reserved_quantity,
    (quantity - reserved_quantity) as available_quantity,
    requires_deposit,
    status
  INTO v_listing
  FROM listings
  WHERE id = p_listing_id;

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  RETURN json_build_object(
    'listing_id', v_listing.id,
    'title', v_listing.title,
    'total_quantity', v_listing.quantity,
    'reserved_quantity', v_listing.reserved_quantity,
    'available_quantity', v_listing.available_quantity,
    'requires_deposit', v_listing.requires_deposit,
    'is_available', v_listing.status = 'active' AND v_listing.available_quantity > 0
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_listing_availability TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Listing Reservation System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  ✓ Bulk listings with quantity support';
  RAISE NOTICE '  ✓ Multi-unit reservations (buyers can reserve 2+)';
  RAISE NOTICE '  ✓ Automatic reservation tracking';
  RAISE NOTICE '  ✓ Prevents over-reservation';
  RAISE NOTICE '  ✓ Auto-releases units on expiry/cancel';
  RAISE NOTICE '';
  RAISE NOTICE 'Examples:';
  RAISE NOTICE '  - Seller lists 10 phones';
  RAISE NOTICE '  - Buyer A reserves 2 units (₵40 deposit)';
  RAISE NOTICE '  - 8 units remain available';
  RAISE NOTICE '  - Buyer B can reserve up to 8 units';
  RAISE NOTICE '  - If Buyer A cancels, 2 units released back';
END $$;

