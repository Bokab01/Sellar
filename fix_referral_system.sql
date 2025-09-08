-- =============================================
-- FIX: Complete Referral System Implementation
-- =============================================

-- Create referral_tracking table to track successful referrals
CREATE TABLE IF NOT EXISTS referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referral Information
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    
    -- Status and Rewards
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'failed')),
    referrer_rewarded BOOLEAN DEFAULT false,
    referee_rewarded BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    UNIQUE(referrer_id, referee_id), -- One referral per referrer-referee pair
    UNIQUE(referee_id) -- Each user can only be referred once
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer_id ON referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referee_id ON referral_tracking(referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referral_code ON referral_tracking(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_status ON referral_tracking(status);

-- Add RLS policies for referral_tracking
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer or referee)
CREATE POLICY "Users can view their own referrals" ON referral_tracking 
FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referee_id
);

-- Authenticated users can insert referral records
CREATE POLICY "Authenticated users can create referrals" ON referral_tracking 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only system can update referral status
CREATE POLICY "System can update referral status" ON referral_tracking 
FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to claim referral bonus
CREATE OR REPLACE FUNCTION claim_referral_bonus(
    p_referrer_id UUID,
    p_referee_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_record RECORD;
    v_referrer_credits INTEGER;
    v_referee_credits INTEGER;
    v_referral_tracking_id UUID;
    v_reward_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Validate input parameters
    IF p_referrer_id IS NULL OR p_referee_id IS NULL OR p_referral_code IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing required parameters');
    END IF;
    
    -- Check if referrer and referee exist
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_referrer_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referrer not found');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_referee_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referee not found');
    END IF;
    
    -- Check if referral record exists and is completed
    SELECT * INTO v_referral_record 
    FROM referral_tracking 
    WHERE referrer_id = p_referrer_id 
    AND referee_id = p_referee_id 
    AND referral_code = p_referral_code
    AND status = 'completed';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Referral not found or not completed');
    END IF;
    
    -- Check if already rewarded
    IF v_referral_record.referrer_rewarded THEN
        RETURN json_build_object('success', false, 'error', 'Referral bonus already claimed');
    END IF;
    
    -- Set reward amounts (20 credits for referrer, 20 credits for referee)
    v_referrer_credits := 20;
    v_referee_credits := 20;
    
    -- Award credits to referrer
    UPDATE user_credits 
    SET balance = balance + v_referrer_credits,
        lifetime_earned = lifetime_earned + v_referrer_credits
    WHERE user_id = p_referrer_id;
    
    -- Award credits to referee
    UPDATE user_credits 
    SET balance = balance + v_referee_credits,
        lifetime_earned = lifetime_earned + v_referee_credits
    WHERE user_id = p_referee_id;
    
    -- Create reward record for referrer
    INSERT INTO community_rewards (
        user_id, reward_type, credits_earned, trigger_action,
        reference_id, reference_type, metadata
    ) VALUES (
        p_referrer_id, 'referral_bonus', v_referrer_credits, 'Successfully referred a new user',
        v_referral_record.id, 'referral_tracking', 
        json_build_object('referee_id', p_referee_id, 'referral_code', p_referral_code)
    ) RETURNING id INTO v_reward_id;
    
    -- Create reward record for referee
    INSERT INTO community_rewards (
        user_id, reward_type, credits_earned, trigger_action,
        reference_id, reference_type, metadata
    ) VALUES (
        p_referee_id, 'referral_bonus', v_referee_credits, 'Joined via referral',
        v_referral_record.id, 'referral_tracking', 
        json_build_object('referrer_id', p_referrer_id, 'referral_code', p_referral_code)
    );
    
    -- Create credit transaction for referrer
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, description,
        balance_before, balance_after, metadata
    ) VALUES (
        p_referrer_id, 'referral_bonus', v_referrer_credits, 
        'Referral bonus for inviting a friend',
        (SELECT balance FROM user_credits WHERE user_id = p_referrer_id) - v_referrer_credits,
        (SELECT balance FROM user_credits WHERE user_id = p_referrer_id),
        json_build_object('referral_id', v_referral_record.id, 'referee_id', p_referee_id)
    ) RETURNING id INTO v_transaction_id;
    
    -- Create credit transaction for referee
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, description,
        balance_before, balance_after, metadata
    ) VALUES (
        p_referee_id, 'referral_bonus', v_referee_credits, 
        'Welcome bonus for joining via referral',
        (SELECT balance FROM user_credits WHERE user_id = p_referee_id) - v_referee_credits,
        (SELECT balance FROM user_credits WHERE user_id = p_referee_id),
        json_build_object('referral_id', v_referral_record.id, 'referrer_id', p_referrer_id)
    );
    
    -- Update referral tracking record
    UPDATE referral_tracking 
    SET referrer_rewarded = true,
        referee_rewarded = true,
        rewarded_at = NOW(),
        status = 'rewarded'
    WHERE id = v_referral_record.id;
    
    -- Add to reward history for both users
    INSERT INTO user_reward_history (user_id, reward_type, credits_earned, is_claimed, claim_method)
    VALUES 
        (p_referrer_id, 'referral_bonus', v_referrer_credits, true, 'automatic'),
        (p_referee_id, 'referral_bonus', v_referee_credits, true, 'automatic')
    ON CONFLICT (user_id, reward_type) DO NOTHING;
    
    RETURN json_build_object(
        'success', true,
        'referrer_credits', v_referrer_credits,
        'referee_credits', v_referee_credits,
        'referral_id', v_referral_record.id,
        'message', 'Referral bonus claimed successfully'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_referral_bonus(UUID, UUID, TEXT) TO authenticated;

-- Create function to create referral record
CREATE OR REPLACE FUNCTION create_referral_record(
    p_referrer_id UUID,
    p_referee_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_id UUID;
BEGIN
    -- Validate input parameters
    IF p_referrer_id IS NULL OR p_referee_id IS NULL OR p_referral_code IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing required parameters');
    END IF;
    
    -- Check if referrer exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_referrer_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referrer not found');
    END IF;
    
    -- Check if referee already exists (should not happen during signup)
    IF EXISTS (SELECT 1 FROM profiles WHERE id = p_referee_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referee already exists');
    END IF;
    
    -- Create referral record
    INSERT INTO referral_tracking (
        referrer_id, referee_id, referral_code, status
    ) VALUES (
        p_referrer_id, p_referee_id, p_referral_code, 'pending'
    ) RETURNING id INTO v_referral_id;
    
    RETURN json_build_object(
        'success', true,
        'referral_id', v_referral_id,
        'message', 'Referral record created successfully'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_referral_record(UUID, UUID, TEXT) TO authenticated;

-- Create function to complete referral (called when referee completes signup)
CREATE OR REPLACE FUNCTION complete_referral(
    p_referee_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_record RECORD;
BEGIN
    -- Find pending referral for this referee
    SELECT * INTO v_referral_record 
    FROM referral_tracking 
    WHERE referee_id = p_referee_id 
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'No pending referral found');
    END IF;
    
    -- Update referral status to completed
    UPDATE referral_tracking 
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_referral_record.id;
    
    RETURN json_build_object(
        'success', true,
        'referral_id', v_referral_record.id,
        'referrer_id', v_referral_record.referrer_id,
        'message', 'Referral completed successfully'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_referral(UUID) TO authenticated;

-- Create function to get user referral stats
CREATE OR REPLACE FUNCTION get_user_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_invites INTEGER;
    v_successful_invites INTEGER;
    v_pending_invites INTEGER;
    v_total_earned DECIMAL(10,2);
BEGIN
    -- Get total invites sent
    SELECT COUNT(*) INTO v_total_invites
    FROM referral_tracking 
    WHERE referrer_id = p_user_id;
    
    -- Get successful invites (completed and rewarded)
    SELECT COUNT(*) INTO v_successful_invites
    FROM referral_tracking 
    WHERE referrer_id = p_user_id 
    AND status IN ('completed', 'rewarded');
    
    -- Get pending invites
    SELECT COUNT(*) INTO v_pending_invites
    FROM referral_tracking 
    WHERE referrer_id = p_user_id 
    AND status = 'pending';
    
    -- Get total earned from referrals
    SELECT COALESCE(SUM(credits_earned), 0) INTO v_total_earned
    FROM community_rewards 
    WHERE user_id = p_user_id 
    AND reward_type = 'referral_bonus';
    
    RETURN json_build_object(
        'total_invites', v_total_invites,
        'successful_invites', v_successful_invites,
        'pending_invites', v_pending_invites,
        'total_earned', v_total_earned
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_referral_stats(UUID) TO authenticated;

-- Add comments to document the functions
COMMENT ON FUNCTION claim_referral_bonus(UUID, UUID, TEXT) IS 'Claims referral bonus for both referrer and referee when referral is completed';
COMMENT ON FUNCTION create_referral_record(UUID, UUID, TEXT) IS 'Creates a new referral tracking record when someone uses a referral code';
COMMENT ON FUNCTION complete_referral(UUID) IS 'Marks a referral as completed when the referee finishes signup';
COMMENT ON FUNCTION get_user_referral_stats(UUID) IS 'Returns referral statistics for a user including total invites, successful invites, and earnings';

-- Success message
SELECT 'Referral system functions and tables created successfully!' as status;
