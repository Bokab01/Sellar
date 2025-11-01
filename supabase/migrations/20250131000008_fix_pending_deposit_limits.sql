-- =====================================================
-- FIX PENDING DEPOSIT LIMITS
-- =====================================================
-- 
-- Problem: Pending deposits (payment not completed) count 
-- toward the 3-deposit limit, blocking users who cancel payments
--
-- Solution: Only count 'paid' and later statuses toward limit
-- Also reduce pending timeout from 24h to 15 minutes
-- =====================================================

-- Drop and recreate initialize_deposit to exclude 'pending' from limit check
CREATE OR REPLACE FUNCTION initialize_deposit(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_reserved_quantity INTEGER DEFAULT 1,
  p_conversation_id UUID DEFAULT NULL,
  p_offer_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_buyer RECORD;
  v_deposit_record RECORD;
  v_reference TEXT;
  v_amount INTEGER; -- Amount in pesewas
  v_expires_at TIMESTAMPTZ;
  v_buyer_active_deposits INTEGER;
  v_available_quantity INTEGER;
  v_offer RECORD;
BEGIN
  -- Fetch listing with seller info
  SELECT l.*, p.email as seller_email, p.full_name as seller_name
  INTO v_listing
  FROM listings l
  JOIN profiles p ON l.seller_id = p.id
  WHERE l.id = p_listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  -- Fetch buyer info
  SELECT * INTO v_buyer FROM profiles WHERE id = p_buyer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buyer profile not found';
  END IF;

  -- Validate listing status
  IF v_listing.status != 'active' AND v_listing.status != 'reserved' THEN
    RAISE EXCEPTION 'This listing is not available for deposit';
  END IF;

  -- Prevent self-deposit
  IF v_listing.seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'You cannot commit to your own listing';
  END IF;

  -- Check if this is for an accepted offer
  IF p_offer_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM offers WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Offer not found or not awaiting deposit';
    END IF;

    IF v_offer.status != 'accepted' OR NOT v_offer.awaiting_deposit THEN
      RAISE EXCEPTION 'Offer not found or not awaiting deposit';
    END IF;

    IF v_offer.deposit_deadline IS NOT NULL AND v_offer.deposit_deadline < NOW() THEN
      RAISE EXCEPTION 'Deposit deadline has passed for this offer';
    END IF;
  END IF;

  -- Calculate available quantity
  v_available_quantity := COALESCE(v_listing.quantity, 1) - COALESCE(v_listing.reserved_quantity, 0);
  
  IF v_available_quantity < p_reserved_quantity THEN
    RAISE EXCEPTION 'Not enough units available. Only % units remaining.', v_available_quantity;
  END IF;

  -- ✅ FIX: Check buyer limits (max 3 active deposits) - EXCLUDE 'pending'
  -- Only count deposits that have been paid or are in progress
  SELECT COUNT(*) INTO v_buyer_active_deposits
  FROM listing_deposits
  WHERE buyer_id = p_buyer_id
    AND status IN ('paid', 'confirmed', 'released') -- ✅ Removed 'pending'
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
    RAISE EXCEPTION 'Your deposit privileges are temporarily suspended. Please contact support.';
  END IF;

  -- Generate unique reference
  v_reference := 'DEP-' || UPPER(LEFT(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 12));

  -- Calculate amount (20 GHS per unit in pesewas)
  v_amount := p_reserved_quantity * 2000; -- 20 GHS = 2000 pesewas per unit

  -- ✅ FIX: Set expiry to 15 minutes (down from 24 hours)
  v_expires_at := NOW() + INTERVAL '15 minutes';

  -- Create deposit record
  INSERT INTO listing_deposits (
    listing_id,
    buyer_id,
    seller_id,
    amount,
    currency,
    status,
    reference,
    reserved_quantity,
    conversation_id,
    offer_id,
    expires_at
  )
  VALUES (
    p_listing_id,
    p_buyer_id,
    v_listing.seller_id,
    v_amount / 100.0, -- Store in GHS (cedis)
    'GHS',
    'pending',
    v_reference,
    p_reserved_quantity,
    p_conversation_id,
    p_offer_id,
    v_expires_at
  )
  RETURNING * INTO v_deposit_record;

  -- Return payment initialization data
  RETURN json_build_object(
    'reference', v_reference,
    'amount', v_amount, -- Amount in pesewas for Paystack
    'email', v_buyer.email,
    'listing_title', v_listing.title,
    'listing_id', p_listing_id,
    'deposit_id', v_deposit_record.id,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update cleanup function to use 15 minute timeout
CREATE OR REPLACE FUNCTION cleanup_pending_deposits()
RETURNS JSON AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- ✅ FIX: Delete pending deposits that have expired (15 minutes after creation)
  DELETE FROM listing_deposits
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'deleted_count', v_deleted_count,
    'message', format('%s abandoned pending deposit(s) cleaned up', v_deleted_count)
  );
END;
$$ LANGUAGE plpgsql;

-- Update cron to run more frequently (every 5 minutes instead of hourly)
SELECT cron.unschedule('cleanup-pending-deposits');

SELECT cron.schedule(
  'cleanup-pending-deposits',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT cleanup_pending_deposits();
  $$
);

-- Immediately cleanup any existing abandoned pending deposits
SELECT cleanup_pending_deposits();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Pending deposit limits fixed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '  1. Pending deposits no longer count toward 3-deposit limit';
  RAISE NOTICE '  2. Pending timeout reduced from 24h to 15 minutes';
  RAISE NOTICE '  3. Cleanup job now runs every 5 minutes';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now retry immediately if payment fails!';
END $$;

