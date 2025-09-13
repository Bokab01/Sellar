-- =============================================
-- SELLAR MOBILE APP - FIX MISSING TABLES AND FUNCTIONS
-- Migration 38: Recreate missing community_rewards table and verification function
-- =============================================

-- =============================================
-- 1. RECREATE COMMUNITY REWARDS TABLE
-- =============================================

-- Drop and recreate community_rewards table if it doesn't exist properly
DROP TABLE IF EXISTS community_rewards CASCADE;

CREATE TABLE community_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Reward Details
    reward_type TEXT NOT NULL CHECK (reward_type IN (
        'positive_review', 'first_post_bonus', 'first_like_bonus', 
        'engagement_milestone_10', 'engagement_milestone_25', 'engagement_milestone_50',
        'viral_post', 'super_viral_post', 'helpful_commenter', 'report_validation',
        'community_guardian', 'referral_bonus', 'anniversary_bonus'
    )),
    credits_earned INTEGER NOT NULL CHECK (credits_earned > 0),
    trigger_action TEXT NOT NULL CHECK (char_length(trigger_action) >= 5 AND char_length(trigger_action) <= 200),
    
    -- Reference Information
    reference_id UUID, -- ID of the post, review, etc. that triggered the reward
    reference_type TEXT CHECK (reference_type IN ('post', 'review', 'comment', 'report', 'referral', 'anniversary')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    is_validated BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for community_rewards
CREATE INDEX idx_community_rewards_user_id ON community_rewards(user_id);
CREATE INDEX idx_community_rewards_reward_type ON community_rewards(reward_type);
CREATE INDEX idx_community_rewards_reference_id ON community_rewards(reference_id);
CREATE INDEX idx_community_rewards_created_at ON community_rewards(created_at DESC);
CREATE INDEX idx_community_rewards_is_validated ON community_rewards(is_validated);

-- Create partial unique index to ensure unique rewards per user per reference (where applicable)
CREATE UNIQUE INDEX idx_community_rewards_unique_user_reward_reference 
ON community_rewards(user_id, reward_type, reference_id) 
WHERE reference_id IS NOT NULL;

-- Enable RLS
ALTER TABLE community_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own rewards" ON community_rewards 
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create rewards" ON community_rewards 
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 2. RECREATE VERIFICATION SIGNALS FUNCTION
-- =============================================

-- Drop and recreate the verification signals function
DROP FUNCTION IF EXISTS update_single_user_verification_signals(UUID);

CREATE OR REPLACE FUNCTION update_single_user_verification_signals(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_account_age_days INTEGER;
    v_successful_transactions INTEGER;
    v_total_transactions INTEGER;
    v_reviews_given INTEGER;
    v_reviews_received INTEGER;
    v_trust_score INTEGER;
BEGIN
    -- Calculate account age in days
    SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER
    INTO v_account_age_days
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Default to 0 if user not found
    v_account_age_days := COALESCE(v_account_age_days, 0);
    
    -- Count successful transactions (completed meetup transactions)
    SELECT COUNT(*)::INTEGER
    INTO v_successful_transactions
    FROM public.meetup_transactions
    WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND status = 'completed';
    
    -- Count total transactions
    SELECT COUNT(*)::INTEGER
    INTO v_total_transactions
    FROM public.meetup_transactions
    WHERE (buyer_id = p_user_id OR seller_id = p_user_id);
    
    -- Count reviews given by this user
    SELECT COUNT(*)::INTEGER
    INTO v_reviews_given
    FROM public.reviews
    WHERE reviewer_id = p_user_id;
    
    -- Count reviews received by this user
    SELECT COUNT(*)::INTEGER
    INTO v_reviews_received
    FROM public.reviews
    WHERE reviewed_user_id = p_user_id;
    
    -- Calculate trust score (0-100)
    v_trust_score := 0;
    
    -- Successful transactions: +5 per transaction (max 50 points)
    v_trust_score := v_trust_score + LEAST(v_successful_transactions * 5, 50);
    
    -- Reviews received: +2 per review (max 20 points)
    v_trust_score := v_trust_score + LEAST(v_reviews_received * 2, 20);
    
    -- Reviews given: +1 per review (max 10 points)
    v_trust_score := v_trust_score + LEAST(v_reviews_given, 10);
    
    -- Account age: +1 per 30 days (max 10 points)
    v_trust_score := v_trust_score + LEAST(v_account_age_days / 30, 10);
    
    -- Ensure trust score doesn't exceed 100
    v_trust_score := LEAST(v_trust_score, 100);
    
    -- Insert or update verification signals
    INSERT INTO public.user_verification_signals (
        user_id, successful_transactions, total_transactions, 
        reviews_given, reviews_received, trust_score, account_age_days,
        last_activity_at, updated_at
    ) VALUES (
        p_user_id, v_successful_transactions, v_total_transactions,
        v_reviews_given, v_reviews_received, v_trust_score, v_account_age_days,
        NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        successful_transactions = EXCLUDED.successful_transactions,
        total_transactions = EXCLUDED.total_transactions,
        reviews_given = EXCLUDED.reviews_given,
        reviews_received = EXCLUDED.reviews_received,
        trust_score = EXCLUDED.trust_score,
        account_age_days = EXCLUDED.account_age_days,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_single_user_verification_signals TO authenticated;

-- =============================================
-- 3. RECREATE GET_USER_REWARD_SUMMARY FUNCTION
-- =============================================

-- Create the reward summary function that's likely being called
CREATE OR REPLACE FUNCTION get_user_reward_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_credits INTEGER := 0;
    v_total_rewards INTEGER := 0;
    v_recent_rewards JSON;
BEGIN
    -- Get total credits earned from rewards
    SELECT COALESCE(SUM(credits_earned), 0)
    INTO v_total_credits
    FROM public.community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get total number of rewards
    SELECT COUNT(*)
    INTO v_total_rewards
    FROM public.community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get recent rewards (last 10)
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'reward_type', reward_type,
            'credits_earned', credits_earned,
            'trigger_action', trigger_action,
            'created_at', created_at
        ) ORDER BY created_at DESC
    ), '[]'::json)
    INTO v_recent_rewards
    FROM (
        SELECT id, reward_type, credits_earned, trigger_action, created_at
        FROM public.community_rewards
        WHERE user_id = p_user_id AND is_validated = true
        ORDER BY created_at DESC
        LIMIT 10
    ) recent;
    
    RETURN json_build_object(
        'total_credits_earned', v_total_credits,
        'total_rewards', v_total_rewards,
        'recent_rewards', v_recent_rewards
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_reward_summary TO authenticated;

-- =============================================
-- 4. VERIFICATION TESTS
-- =============================================

DO $$
BEGIN
    -- Test community_rewards table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'community_rewards'
    ) THEN
        RAISE NOTICE 'SUCCESS: community_rewards table created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: community_rewards table was not created';
    END IF;
    
    -- Test update_single_user_verification_signals function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_single_user_verification_signals'
    ) THEN
        RAISE NOTICE 'SUCCESS: update_single_user_verification_signals function created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: update_single_user_verification_signals function was not created';
    END IF;
    
    -- Test get_user_reward_summary function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'get_user_reward_summary'
    ) THEN
        RAISE NOTICE 'SUCCESS: get_user_reward_summary function created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: get_user_reward_summary function was not created';
    END IF;
END $$;
