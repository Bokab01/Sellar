-- =====================================================
-- ESCROW SYSTEM: ₵20 Flat Deposit for Pro Sellers
-- Completion Window: 3 days (72 hours)
-- =====================================================

-- 1. Create listing_deposits table
CREATE TABLE IF NOT EXISTS listing_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  conversation_id UUID REFERENCES conversations(id),
  
  -- Deposit details
  amount DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, released, refunded, expired, claimed
  
  -- Payment tracking
  paystack_reference VARCHAR(255) UNIQUE,
  paystack_transaction_id VARCHAR(255),
  payment_method VARCHAR(50), -- card, mobile_money, bank_transfer
  
  -- Meetup tracking
  meetup_scheduled_at TIMESTAMP,
  meetup_confirmed_by_buyer_at TIMESTAMP,
  meetup_confirmed_by_seller_at TIMESTAMP,
  buyer_showed_up BOOLEAN DEFAULT NULL,
  seller_showed_up BOOLEAN DEFAULT NULL,
  
  -- Release tracking
  released_at TIMESTAMP,
  released_to UUID REFERENCES profiles(id),
  refunded_at TIMESTAMP,
  refund_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Auto-refund after 3 days if no confirmation
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'released', 'refunded', 'expired', 'claimed')),
  CONSTRAINT amount_check CHECK (amount > 0)
);

-- Create indexes for performance
CREATE INDEX idx_listing_deposits_listing ON listing_deposits(listing_id);
CREATE INDEX idx_listing_deposits_buyer ON listing_deposits(buyer_id);
CREATE INDEX idx_listing_deposits_seller ON listing_deposits(seller_id);
CREATE INDEX idx_listing_deposits_status ON listing_deposits(status);
CREATE INDEX idx_listing_deposits_expires ON listing_deposits(expires_at);
CREATE INDEX idx_listing_deposits_paystack_ref ON listing_deposits(paystack_reference);
CREATE INDEX idx_listing_deposits_conversation ON listing_deposits(conversation_id);

-- 2. Update listings table to support deposit requirement
ALTER TABLE listings ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deposit_enabled_at TIMESTAMP;

-- 3. Update profiles table for user stats
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_no_show_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_success_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_banned_until TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_show_up_rate DECIMAL(5,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_confirm_rate DECIMAL(5,2) DEFAULT 100.0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deposit_completed_count INTEGER DEFAULT 0;

-- 4. Add cancellation fields to listing_deposits (for mutual cancellation)
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);
ALTER TABLE listing_deposits ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 5. Update status constraint to include 'cancelled'
ALTER TABLE listing_deposits DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE listing_deposits ADD CONSTRAINT valid_status 
  CHECK (status IN ('pending', 'paid', 'released', 'refunded', 'expired', 'claimed', 'cancelled'));

-- 6. Create deposit cancellation requests table (for mutual cancellation)
CREATE TABLE IF NOT EXISTS deposit_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deposit_id UUID NOT NULL REFERENCES listing_deposits(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  confirmed_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  declined_at TIMESTAMP,
  declined_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_cancellation_requests_deposit ON deposit_cancellation_requests(deposit_id);
CREATE INDEX idx_cancellation_requests_status ON deposit_cancellation_requests(confirmed_at, declined_at);

-- 4. Trigger: Only Pro sellers can enable deposits
CREATE OR REPLACE FUNCTION check_pro_seller_for_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requires_deposit = TRUE THEN
    -- Check if seller has active Pro subscription
    IF NOT EXISTS (
      SELECT 1 FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = NEW.user_id
        AND sp.name = 'Sellar Pro'
        AND us.status IN ('active', 'trialing')
        AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
    ) THEN
      RAISE EXCEPTION 'Only Sellar Pro members can require deposits';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_pro_seller_deposit ON listings;
CREATE TRIGGER enforce_pro_seller_deposit
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION check_pro_seller_for_deposit();

-- 5. Trigger: Track buyer confirm rate (for reputation system)
CREATE OR REPLACE FUNCTION update_deposit_confirm_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_total_deposits INTEGER;
  v_confirmed_deposits INTEGER;
BEGIN
  IF NEW.status IN ('released', 'refunded', 'expired') AND OLD.status = 'paid' THEN
    -- Count total completed deposits for this buyer
    SELECT COUNT(*) INTO v_total_deposits
    FROM listing_deposits
    WHERE buyer_id = NEW.buyer_id
      AND status IN ('released', 'refunded', 'expired');
    
    -- Count confirmed deposits (buyer actually completed transaction)
    SELECT COUNT(*) INTO v_confirmed_deposits
    FROM listing_deposits
    WHERE buyer_id = NEW.buyer_id
      AND status = 'released';
    
    -- Update buyer's confirm rate
    UPDATE profiles
    SET 
      deposit_completed_count = v_confirmed_deposits,
      deposit_confirm_rate = CASE
        WHEN v_total_deposits > 0 
        THEN (CAST(v_confirmed_deposits AS DECIMAL) / v_total_deposits) * 100
        ELSE 100.0
      END
    WHERE id = NEW.buyer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_confirm_rate ON listing_deposits;
CREATE TRIGGER track_confirm_rate
  AFTER UPDATE ON listing_deposits
  FOR EACH ROW
  WHEN (NEW.status IN ('released', 'refunded', 'expired') AND OLD.status = 'paid')
  EXECUTE FUNCTION update_deposit_confirm_rate();

-- 6. Trigger: Calculate show-up rate
CREATE OR REPLACE FUNCTION update_deposit_show_up_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET deposit_show_up_rate = (
    CASE 
      WHEN (deposit_success_count + deposit_no_show_count) > 0
      THEN (deposit_success_count::DECIMAL / (deposit_success_count + deposit_no_show_count)) * 100
      ELSE NULL
    END
  )
  WHERE id = NEW.buyer_id OR id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_show_up_rate ON listing_deposits;
CREATE TRIGGER calculate_show_up_rate
AFTER UPDATE ON listing_deposits
FOR EACH ROW
WHEN (OLD.status != NEW.status AND NEW.status IN ('released', 'refunded'))
EXECUTE FUNCTION update_deposit_show_up_rate();

-- 6. RPC: Initialize Deposit
CREATE OR REPLACE FUNCTION initialize_deposit(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_buyer_active_deposits INTEGER;
  v_deposit_id UUID;
  v_paystack_reference VARCHAR(255);
BEGIN
  -- Get listing details
  SELECT l.*, p.id as seller_id
  INTO v_listing
  FROM listings l
  JOIN profiles p ON l.user_id = p.id
  WHERE l.id = p_listing_id;

  -- Validations
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

  -- Create deposit record
  INSERT INTO listing_deposits (
    listing_id,
    buyer_id,
    seller_id,
    conversation_id,
    amount,
    status,
    paystack_reference,
    expires_at
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    v_listing.seller_id,
    p_conversation_id,
    20.00,
    'pending',
    v_paystack_reference,
    NOW() + INTERVAL '24 hours' -- Initial payment window
  )
  RETURNING id INTO v_deposit_id;

  -- Return deposit details for payment initialization
  RETURN json_build_object(
    'deposit_id', v_deposit_id,
    'reference', v_paystack_reference,
    'amount', 2000, -- Amount in pesewas (₵20 = 2000 pesewas)
    'email', (SELECT email FROM auth.users WHERE id = p_buyer_id),
    'listing_title', v_listing.title,
    'seller_name', (SELECT full_name FROM profiles WHERE id = v_listing.seller_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: Verify Deposit Payment
CREATE OR REPLACE FUNCTION verify_deposit_payment(
  p_reference VARCHAR(255),
  p_transaction_id VARCHAR(255),
  p_payment_method VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE paystack_reference = p_reference
    AND status = 'pending';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or already processed';
  END IF;

  -- Update deposit status
  UPDATE listing_deposits
  SET 
    status = 'paid',
    paystack_transaction_id = p_transaction_id,
    payment_method = p_payment_method,
    updated_at = NOW(),
    expires_at = NOW() + INTERVAL '3 days' -- 3 days to complete meetup
  WHERE id = v_deposit.id;

  -- Send notification to seller
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.seller_id,
    'deposit_received',
    'Buyer Committed with Deposit',
    'A buyer has paid a ₵20 deposit for your listing. They are serious!',
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id,
      'buyer_id', v_deposit.buyer_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Deposit confirmed. Please meet with the seller to complete the transaction.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: Confirm Meetup (Buyer)
CREATE OR REPLACE FUNCTION confirm_meetup_buyer(
  p_deposit_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not in paid status';
  END IF;

  -- Check authorization
  IF v_deposit.buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update confirmation
  UPDATE listing_deposits
  SET 
    meetup_confirmed_by_buyer_at = NOW(),
    buyer_showed_up = TRUE,
    status = 'released',
    released_at = NOW(),
    released_to = seller_id,
    updated_at = NOW()
  WHERE id = p_deposit_id;

  -- Update buyer success stats
  UPDATE profiles
  SET deposit_success_count = deposit_success_count + 1
  WHERE id = v_deposit.buyer_id;

  -- Send notification to seller
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.seller_id,
    'deposit_released',
    'Deposit Released',
    'The buyer confirmed the meetup. ₵20 has been released to you!',
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id,
      'amount', v_deposit.amount
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Thank you for confirming! The deposit has been released to the seller.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: Claim No-Show Deposit (REMOVED - Zero-Dispute System)
-- Seller can NO LONGER claim deposits unilaterally
-- Only buyer can release deposits via confirmation
-- Expired deposits auto-refund to buyer

-- 10. RPC: Request Mutual Cancellation
CREATE OR REPLACE FUNCTION request_mutual_cancellation(
  p_deposit_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
  v_request_id UUID;
  v_other_party_id UUID;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not eligible for cancellation';
  END IF;

  -- Check authorization (buyer or seller)
  IF v_deposit.buyer_id != auth.uid() AND v_deposit.seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check if request already exists and is pending
  IF EXISTS (
    SELECT 1 FROM deposit_cancellation_requests
    WHERE deposit_id = p_deposit_id
      AND confirmed_at IS NULL
      AND declined_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cancellation request already pending';
  END IF;

  -- Determine other party
  v_other_party_id := CASE 
    WHEN auth.uid() = v_deposit.buyer_id THEN v_deposit.seller_id
    ELSE v_deposit.buyer_id
  END;

  -- Create request
  INSERT INTO deposit_cancellation_requests (
    deposit_id,
    requested_by,
    reason
  ) VALUES (
    p_deposit_id,
    auth.uid(),
    p_reason
  )
  RETURNING id INTO v_request_id;

  -- Notify other party
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_other_party_id,
    'cancellation_request',
    'Cancellation Request',
    CASE 
      WHEN auth.uid() = v_deposit.buyer_id 
      THEN 'The buyer has requested to cancel the deposit.'
      ELSE 'The seller has requested to cancel the deposit.'
    END,
    json_build_object(
      'deposit_id', v_deposit.id,
      'request_id', v_request_id,
      'listing_id', v_deposit.listing_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Cancellation request sent. Waiting for other party to confirm.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Confirm Mutual Cancellation
CREATE OR REPLACE FUNCTION confirm_mutual_cancellation(
  p_request_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_deposit RECORD;
BEGIN
  -- Get request
  SELECT * INTO v_request
  FROM deposit_cancellation_requests
  WHERE id = p_request_id
    AND confirmed_at IS NULL
    AND declined_at IS NULL;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Cancellation request not found or already processed';
  END IF;

  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = v_request.deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not in valid status';
  END IF;

  -- Check authorization (must be the other party)
  IF auth.uid() = v_request.requested_by THEN
    RAISE EXCEPTION 'Cannot confirm your own cancellation request';
  END IF;

  IF v_deposit.buyer_id != auth.uid() AND v_deposit.seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Confirm request
  UPDATE deposit_cancellation_requests
  SET 
    confirmed_by = auth.uid(),
    confirmed_at = NOW()
  WHERE id = p_request_id;

  -- Cancel deposit
  UPDATE listing_deposits
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    cancellation_reason = v_request.reason,
    updated_at = NOW()
  WHERE id = v_request.deposit_id;

  -- Notify both parties (full refund to buyer)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT 
    user_id,
    'deposit_cancelled',
    'Mutual Cancellation Confirmed',
    CASE 
      WHEN user_id = v_deposit.buyer_id
      THEN 'Both parties agreed to cancel. Full refund: ₵20.'
      ELSE 'Both parties agreed to cancel the deposit.'
    END,
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id
    )
  FROM unnest(ARRAY[v_deposit.buyer_id, v_deposit.seller_id]) AS user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Cancellation confirmed. Buyer will receive full refund (₵20).'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: Decline Mutual Cancellation
CREATE OR REPLACE FUNCTION decline_mutual_cancellation(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_deposit RECORD;
BEGIN
  -- Get request
  SELECT * INTO v_request
  FROM deposit_cancellation_requests
  WHERE id = p_request_id
    AND confirmed_at IS NULL
    AND declined_at IS NULL;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Cancellation request not found or already processed';
  END IF;

  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = v_request.deposit_id;

  -- Check authorization (must be the other party)
  IF auth.uid() = v_request.requested_by THEN
    RAISE EXCEPTION 'Cannot decline your own cancellation request';
  END IF;

  IF v_deposit.buyer_id != auth.uid() AND v_deposit.seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Decline request
  UPDATE deposit_cancellation_requests
  SET 
    declined_by = auth.uid(),
    declined_at = NOW()
  WHERE id = p_request_id;

  -- Notify requester
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_request.requested_by,
    'cancellation_declined',
    'Cancellation Request Declined',
    CASE 
      WHEN v_request.requested_by = v_deposit.buyer_id 
      THEN 'The seller declined your cancellation request.'
      ELSE 'The buyer declined your cancellation request.'
    END,
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Cancellation request declined.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC: Auto-Refund Expired Deposits (Cron Job)
CREATE OR REPLACE FUNCTION auto_refund_expired_deposits()
RETURNS JSON AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_deposit RECORD;
BEGIN
  -- Process all expired deposits
  FOR v_deposit IN
    SELECT * FROM listing_deposits
    WHERE status = 'paid'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
  LOOP
    -- Update to refunded
    UPDATE listing_deposits
    SET 
      status = 'refunded',
      refunded_at = NOW(),
      refund_reason = 'Auto-refund: No meetup confirmation within 3 days',
      updated_at = NOW()
    WHERE id = v_deposit.id;

    -- Notify buyer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_deposit.buyer_id,
      'deposit_refunded',
      'Deposit Refunded',
      'Your ₵20 deposit has been refunded as the meetup was not confirmed within 3 days.',
      json_build_object('deposit_id', v_deposit.id)
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'refunded_count', v_expired_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Enable RLS on listing_deposits
ALTER TABLE listing_deposits ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own deposits
CREATE POLICY "Buyers can view their deposits"
  ON listing_deposits FOR SELECT
  USING (buyer_id = auth.uid());

-- Sellers can view deposits for their listings
CREATE POLICY "Sellers can view deposits for their listings"
  ON listing_deposits FOR SELECT
  USING (seller_id = auth.uid());

-- Only system can insert deposits (via RPC)
CREATE POLICY "System can insert deposits"
  ON listing_deposits FOR INSERT
  WITH CHECK (false);

-- Only system can update deposits (via RPC)
CREATE POLICY "System can update deposits"
  ON listing_deposits FOR UPDATE
  USING (false);

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION initialize_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION verify_deposit_payment TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_meetup_buyer TO authenticated;
-- claim_no_show_deposit REMOVED (zero-dispute system)
GRANT EXECUTE ON FUNCTION request_mutual_cancellation TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_mutual_cancellation TO authenticated;
GRANT EXECUTE ON FUNCTION decline_mutual_cancellation TO authenticated;
GRANT EXECUTE ON FUNCTION auto_refund_expired_deposits TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Escrow system successfully created! ₵20 flat deposit with 3-day completion window.';
END $$;

