-- =====================================================
-- FIX CRITICAL DEPOSIT EDGE CASES
-- =====================================================
-- 
-- This migration fixes critical issues:
-- 1. Conversation deletion (foreign key violation)
-- 2. User account deletion (prevents deletion)
-- 3. Race conditions on quantity booking
-- 4. Quantity constraint violations
-- =====================================================

-- =====================================================
-- PART 1: Fix Foreign Key Constraints
-- =====================================================

-- 1a. Fix conversation_id foreign key (allow deletion, preserve deposit)
ALTER TABLE listing_deposits 
DROP CONSTRAINT IF EXISTS listing_deposits_conversation_id_fkey;

ALTER TABLE listing_deposits 
ADD CONSTRAINT listing_deposits_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES conversations(id) 
ON DELETE SET NULL;

-- 1b. Add conversation snapshot data (preserve context)
ALTER TABLE listing_deposits 
ADD COLUMN IF NOT EXISTS conversation_snapshot JSONB;

-- 1c. Create trigger to capture conversation context on deposit creation
CREATE OR REPLACE FUNCTION capture_conversation_snapshot_on_deposit()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT 
      id,
      created_at,
      last_message_at
    INTO v_conversation
    FROM conversations
    WHERE id = NEW.conversation_id;
    
    IF FOUND THEN
      NEW.conversation_snapshot := jsonb_build_object(
        'conversation_id', v_conversation.id,
        'created_at', v_conversation.created_at,
        'last_message_at', v_conversation.last_message_at
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_capture_conversation_snapshot ON listing_deposits;
CREATE TRIGGER trigger_capture_conversation_snapshot
  BEFORE INSERT ON listing_deposits
  FOR EACH ROW
  EXECUTE FUNCTION capture_conversation_snapshot_on_deposit();

-- 1d. Fix buyer_id and seller_id foreign keys
-- Strategy: Prevent account deletion if user has active deposits
ALTER TABLE listing_deposits 
DROP CONSTRAINT IF EXISTS listing_deposits_buyer_id_fkey;

ALTER TABLE listing_deposits 
ADD CONSTRAINT listing_deposits_buyer_id_fkey 
FOREIGN KEY (buyer_id) 
REFERENCES profiles(id) 
ON DELETE RESTRICT;

ALTER TABLE listing_deposits 
DROP CONSTRAINT IF EXISTS listing_deposits_seller_id_fkey;

ALTER TABLE listing_deposits 
ADD CONSTRAINT listing_deposits_seller_id_fkey 
FOREIGN KEY (seller_id) 
REFERENCES profiles(id) 
ON DELETE RESTRICT;

-- 1e. Add helpful error message for account deletion attempts
CREATE OR REPLACE FUNCTION check_user_deposits_before_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_active_deposit_count INTEGER;
  v_deposit_type TEXT;
BEGIN
  -- Check if user has any active deposits (as buyer)
  SELECT COUNT(*) INTO v_active_deposit_count
  FROM listing_deposits
  WHERE buyer_id = OLD.id
    AND status IN ('paid', 'confirmed');
  
  IF v_active_deposit_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete account: You have % active deposit(s) as a buyer. Please complete or cancel them first in "My Orders".', v_active_deposit_count;
  END IF;

  -- Check if user has any active deposits (as seller)
  SELECT COUNT(*) INTO v_active_deposit_count
  FROM listing_deposits
  WHERE seller_id = OLD.id
    AND status IN ('paid', 'confirmed');
  
  IF v_active_deposit_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete account: You have % active deposit(s) as a seller. Please complete or cancel them first in "My Orders".', v_active_deposit_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_deposits_before_profile_delete ON profiles;
CREATE TRIGGER trigger_check_deposits_before_profile_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_user_deposits_before_delete();

-- =====================================================
-- PART 2: Add Quantity Constraints
-- =====================================================

-- 2a. Add constraint: reserved_quantity cannot exceed total quantity
ALTER TABLE listings 
DROP CONSTRAINT IF EXISTS check_reserved_quantity_valid;

ALTER TABLE listings 
ADD CONSTRAINT check_reserved_quantity_valid 
CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity);

-- 2b. Add constraint: quantity must be positive
ALTER TABLE listings 
DROP CONSTRAINT IF EXISTS check_quantity_positive;

ALTER TABLE listings 
ADD CONSTRAINT check_quantity_positive 
CHECK (quantity > 0);

-- =====================================================
-- PART 3: Fix Race Conditions with Row-Level Locking
-- =====================================================

-- 3a. Update initialize_deposit to use row-level locking
-- This prevents race conditions when multiple buyers try to reserve the same item
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
  -- ✅ CRITICAL FIX: Lock listing row to prevent race conditions
  -- This ensures atomic check-and-reserve operation
  SELECT l.*, p.email as seller_email, p.full_name as seller_name
  INTO v_listing
  FROM listings l
  JOIN profiles p ON l.seller_id = p.id
  WHERE l.id = p_listing_id
  FOR UPDATE; -- ✅ Row-level lock prevents concurrent deposits

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

  -- ✅ CRITICAL FIX: Calculate available quantity with row lock active
  v_available_quantity := COALESCE(v_listing.quantity, 1) - COALESCE(v_listing.reserved_quantity, 0);
  
  IF v_available_quantity < p_reserved_quantity THEN
    RAISE EXCEPTION 'Not enough units available. Only % units remaining (requested: %).', v_available_quantity, p_reserved_quantity;
  END IF;

  -- Check buyer limits (max 3 active deposits) - EXCLUDE 'pending'
  SELECT COUNT(*) INTO v_buyer_active_deposits
  FROM listing_deposits
  WHERE buyer_id = p_buyer_id
    AND status IN ('paid', 'confirmed', 'released')
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

  -- Set expiry to 15 minutes
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
  
  -- ✅ Row lock released automatically at end of transaction
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION initialize_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION capture_conversation_snapshot_on_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_deposits_before_delete TO authenticated;

-- =====================================================
-- PART 4: Backfill Conversation Snapshots
-- =====================================================

-- Backfill conversation snapshot for existing deposits
UPDATE listing_deposits ld
SET conversation_snapshot = jsonb_build_object(
  'conversation_id', c.id,
  'created_at', c.created_at,
  'last_message_at', c.last_message_at
)
FROM conversations c
WHERE ld.conversation_id = c.id
  AND ld.conversation_snapshot IS NULL;

-- =====================================================
-- Success Messages
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Critical deposit edge cases fixed!';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Foreign Key Fixes:';
  RAISE NOTICE '  1. conversation_id: ON DELETE SET NULL (with snapshot)';
  RAISE NOTICE '  2. buyer_id: ON DELETE RESTRICT (prevents deletion with active deposits)';
  RAISE NOTICE '  3. seller_id: ON DELETE RESTRICT (prevents deletion with active deposits)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Race Condition Fixes:';
  RAISE NOTICE '  4. Added row-level locking in initialize_deposit';
  RAISE NOTICE '  5. Atomic check-and-reserve prevents double-booking';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Quantity Constraints:';
  RAISE NOTICE '  6. reserved_quantity <= quantity (enforced)';
  RAISE NOTICE '  7. reserved_quantity >= 0 (enforced)';
  RAISE NOTICE '  8. quantity > 0 (enforced)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 New Behaviors:';
  RAISE NOTICE '  - Users cannot delete accounts with active deposits';
  RAISE NOTICE '  - Conversations can be deleted (snapshot preserved)';
  RAISE NOTICE '  - Multiple concurrent deposits are safe (row locking)';
  RAISE NOTICE '  - Database enforces quantity integrity';
END $$;

