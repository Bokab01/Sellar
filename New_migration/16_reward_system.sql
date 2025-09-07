-- =============================================
-- SELLAR MOBILE APP - REWARD SYSTEM
-- Migration 16: Complete community rewards and achievements system
-- =============================================

-- =============================================
-- COMMUNITY REWARDS TABLE
-- =============================================

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique rewards per user per reference (where applicable)
    UNIQUE(user_id, reward_type, reference_id) WHERE reference_id IS NOT NULL
);

-- =============================================
-- USER ACHIEVEMENTS TABLE
-- =============================================

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Achievement Details
    achievement_type TEXT NOT NULL CHECK (achievement_type IN (
        'first_post', 'first_like', 'viral_creator', 'helpful_commenter',
        'community_guardian', 'referral_master', 'anniversary_member',
        'engagement_expert', 'review_collector', 'moderation_helper'
    )),
    achievement_name TEXT NOT NULL CHECK (char_length(achievement_name) >= 5 AND char_length(achievement_name) <= 100),
    description TEXT CHECK (char_length(description) <= 500),
    icon TEXT DEFAULT '🏆',
    
    -- Progress Tracking
    progress_current INTEGER DEFAULT 0,
    progress_required INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT false,
    
    -- Rewards
    credits_rewarded INTEGER DEFAULT 0,
    
    -- Timestamps
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one achievement per type per user
    UNIQUE(user_id, achievement_type)
);

-- =============================================
-- USER REWARD HISTORY TABLE
-- =============================================

CREATE TABLE user_reward_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Reward Details
    reward_type TEXT NOT NULL,
    credits_earned INTEGER NOT NULL,
    is_claimed BOOLEAN DEFAULT false,
    
    -- Claim Information
    claimed_at TIMESTAMPTZ,
    claim_method TEXT CHECK (claim_method IN ('automatic', 'manual', 'system')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one reward history per type per user (for one-time rewards)
    UNIQUE(user_id, reward_type) WHERE reward_type IN (
        'first_post_bonus', 'anniversary_bonus', 'referral_bonus'
    )
);

-- =============================================
-- REWARD TRIGGERS TABLE
-- =============================================

CREATE TABLE reward_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trigger Configuration
    trigger_name TEXT UNIQUE NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('post', 'review', 'comment', 'report', 'referral', 'anniversary')),
    trigger_condition JSONB NOT NULL, -- Conditions that must be met
    
    -- Reward Configuration
    reward_type TEXT NOT NULL,
    credits_earned INTEGER NOT NULL,
    is_automatic BOOLEAN DEFAULT true,
    is_one_time BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Community rewards indexes
CREATE INDEX idx_community_rewards_user_id ON community_rewards(user_id);
CREATE INDEX idx_community_rewards_reward_type ON community_rewards(reward_type);
CREATE INDEX idx_community_rewards_reference_id ON community_rewards(reference_id);
CREATE INDEX idx_community_rewards_created_at ON community_rewards(created_at DESC);
CREATE INDEX idx_community_rewards_is_validated ON community_rewards(is_validated);

-- User achievements indexes
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_type ON user_achievements(achievement_type);
CREATE INDEX idx_user_achievements_is_completed ON user_achievements(is_completed);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- User reward history indexes
CREATE INDEX idx_user_reward_history_user_id ON user_reward_history(user_id);
CREATE INDEX idx_user_reward_history_reward_type ON user_reward_history(reward_type);
CREATE INDEX idx_user_reward_history_is_claimed ON user_reward_history(is_claimed);
CREATE INDEX idx_user_reward_history_created_at ON user_reward_history(created_at DESC);

-- Reward triggers indexes
CREATE INDEX idx_reward_triggers_trigger_type ON reward_triggers(trigger_type);
CREATE INDEX idx_reward_triggers_is_active ON reward_triggers(is_active);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on reward triggers
CREATE TRIGGER update_reward_triggers_updated_at
    BEFORE UPDATE ON reward_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- REWARD SYSTEM FUNCTIONS
-- =============================================

-- Function to award community credits
CREATE OR REPLACE FUNCTION award_community_credits(
    p_user_id UUID,
    p_reward_type TEXT,
    p_credits_earned INTEGER,
    p_trigger_action TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    v_reward_id UUID;
    v_credit_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Check if this is a one-time reward that's already been given
    IF p_reward_type IN ('first_post_bonus', 'anniversary_bonus', 'referral_bonus') THEN
        IF EXISTS (
            SELECT 1 FROM user_reward_history 
            WHERE user_id = p_user_id AND reward_type = p_reward_type
        ) THEN
            RETURN json_build_object('success', false, 'error', 'Reward already claimed');
        END IF;
    END IF;
    
    -- Create reward record
    INSERT INTO community_rewards (
        user_id, reward_type, credits_earned, trigger_action,
        reference_id, reference_type, metadata
    ) VALUES (
        p_user_id, p_reward_type, p_credits_earned, p_trigger_action,
        p_reference_id, p_reference_type, p_metadata
    ) RETURNING id INTO v_reward_id;
    
    -- Update user credit balance
    UPDATE user_credits 
    SET balance = balance + p_credits_earned,
        lifetime_earned = lifetime_earned + p_credits_earned
    WHERE user_id = p_user_id
    RETURNING balance INTO v_credit_balance;
    
    -- Create credit transaction record
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, description,
        balance_before, balance_after, metadata
    ) VALUES (
        p_user_id, 'earned', p_credits_earned, 
        'Community reward: ' || p_trigger_action,
        v_credit_balance - p_credits_earned, v_credit_balance,
        json_build_object('reward_id', v_reward_id, 'reward_type', p_reward_type)
    ) RETURNING id INTO v_transaction_id;
    
    -- Add to reward history
    INSERT INTO user_reward_history (user_id, reward_type, credits_earned, is_claimed, claim_method)
    VALUES (p_user_id, p_reward_type, p_credits_earned, true, 'automatic')
    ON CONFLICT (user_id, reward_type) WHERE reward_type IN ('first_post_bonus', 'anniversary_bonus', 'referral_bonus')
    DO NOTHING;
    
    RETURN json_build_object(
        'success', true, 
        'reward_id', v_reward_id,
        'transaction_id', v_transaction_id,
        'new_balance', v_credit_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user reward summary
CREATE OR REPLACE FUNCTION get_user_reward_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_credits INTEGER;
    v_total_rewards INTEGER;
    v_achievements_count INTEGER;
    v_recent_rewards JSON;
BEGIN
    -- Get total credits earned from rewards
    SELECT COALESCE(SUM(credits_earned), 0) INTO v_total_credits
    FROM community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get total rewards count
    SELECT COUNT(*) INTO v_total_rewards
    FROM community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get completed achievements count
    SELECT COUNT(*) INTO v_achievements_count
    FROM user_achievements
    WHERE user_id = p_user_id AND is_completed = true;
    
    -- Get recent rewards (last 10)
    SELECT json_agg(
        json_build_object(
            'id', id,
            'reward_type', reward_type,
            'credits_earned', credits_earned,
            'trigger_action', trigger_action,
            'created_at', created_at
        )
    ) INTO v_recent_rewards
    FROM (
        SELECT id, reward_type, credits_earned, trigger_action, created_at
        FROM community_rewards
        WHERE user_id = p_user_id AND is_validated = true
        ORDER BY created_at DESC
        LIMIT 10
    ) recent;
    
    RETURN json_build_object(
        'total_credits_earned', v_total_credits,
        'total_rewards', v_total_rewards,
        'achievements_unlocked', v_achievements_count,
        'recent_rewards', COALESCE(v_recent_rewards, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award achievement
CREATE OR REPLACE FUNCTION check_and_award_achievement(
    p_user_id UUID,
    p_achievement_type TEXT
)
RETURNS JSON AS $$
DECLARE
    v_achievement user_achievements%ROWTYPE;
    v_progress INTEGER;
    v_required INTEGER;
    v_is_completed BOOLEAN;
BEGIN
    -- Get or create achievement record
    SELECT * INTO v_achievement
    FROM user_achievements
    WHERE user_id = p_user_id AND achievement_type = p_achievement_type;
    
    IF NOT FOUND THEN
        -- Create new achievement record
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, progress_required)
        VALUES (
            p_user_id, 
            p_achievement_type,
            CASE p_achievement_type
                WHEN 'first_post' THEN 'First Post'
                WHEN 'first_like' THEN 'First Like'
                WHEN 'viral_creator' THEN 'Viral Creator'
                WHEN 'helpful_commenter' THEN 'Helpful Commenter'
                WHEN 'community_guardian' THEN 'Community Guardian'
                WHEN 'referral_master' THEN 'Referral Master'
                WHEN 'anniversary_member' THEN 'Anniversary Member'
                WHEN 'engagement_expert' THEN 'Engagement Expert'
                WHEN 'review_collector' THEN 'Review Collector'
                WHEN 'moderation_helper' THEN 'Moderation Helper'
                ELSE 'Achievement'
            END,
            CASE p_achievement_type
                WHEN 'first_post' THEN 'Create your first community post'
                WHEN 'first_like' THEN 'Get your first like on a post'
                WHEN 'viral_creator' THEN 'Create a viral post with 50+ likes'
                WHEN 'helpful_commenter' THEN 'Write 10 helpful comments'
                WHEN 'community_guardian' THEN 'Submit 5 valid reports'
                WHEN 'referral_master' THEN 'Refer 5 new users'
                WHEN 'anniversary_member' THEN 'Celebrate your first anniversary'
                WHEN 'engagement_expert' THEN 'Reach 100 total likes'
                WHEN 'review_collector' THEN 'Collect 10 positive reviews'
                WHEN 'moderation_helper' THEN 'Help moderate the community'
                ELSE 'Complete this achievement'
            END,
            CASE p_achievement_type
                WHEN 'first_post' THEN 1
                WHEN 'first_like' THEN 1
                WHEN 'viral_creator' THEN 1
                WHEN 'helpful_commenter' THEN 10
                WHEN 'community_guardian' THEN 5
                WHEN 'referral_master' THEN 5
                WHEN 'anniversary_member' THEN 1
                WHEN 'engagement_expert' THEN 100
                WHEN 'review_collector' THEN 10
                WHEN 'moderation_helper' THEN 5
                ELSE 1
            END
        ) RETURNING * INTO v_achievement;
    END IF;
    
    -- Calculate current progress based on achievement type
    CASE p_achievement_type
        WHEN 'first_post' THEN
            SELECT COUNT(*) INTO v_progress FROM posts WHERE user_id = p_user_id;
        WHEN 'first_like' THEN
            SELECT COUNT(*) INTO v_progress 
            FROM post_likes pl 
            JOIN posts p ON pl.post_id = p.id 
            WHERE p.user_id = p_user_id;
        WHEN 'viral_creator' THEN
            SELECT COUNT(*) INTO v_progress 
            FROM posts 
            WHERE user_id = p_user_id AND like_count >= 50;
        WHEN 'helpful_commenter' THEN
            SELECT COUNT(*) INTO v_progress 
            FROM comments 
            WHERE user_id = p_user_id AND like_count >= 1;
        WHEN 'community_guardian' THEN
            SELECT COUNT(*) INTO v_progress 
            FROM reports 
            WHERE reporter_id = p_user_id AND status = 'resolved';
        WHEN 'referral_master' THEN
            SELECT COUNT(*) INTO v_progress 
            FROM profiles 
            WHERE referred_by = p_user_id;
        WHEN 'anniversary_member' THEN
            SELECT 1 INTO v_progress 
            WHERE EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = p_user_id 
                AND created_at <= NOW() - INTERVAL '1 year'
            );
        WHEN 'engagement_expert' THEN
            SELECT COALESCE(SUM(like_count), 0) INTO v_progress 
            FROM posts 
            WHERE user_id = p_user_id;
        WHEN 'review_collector' THEN
            SELECT COUNT(*) INTO v_progress 
            FROM reviews 
            WHERE reviewed_user_id = p_user_id AND rating >= 4;
        WHEN 'moderation_helper' THEN
            SELECT COUNT(*) INTO v_progress 
            FROM reports 
            WHERE reporter_id = p_user_id AND status = 'resolved';
        ELSE
            v_progress := 0;
    END CASE;
    
    -- Update progress
    UPDATE user_achievements 
    SET progress_current = v_progress,
        is_completed = (v_progress >= progress_required),
        unlocked_at = CASE 
            WHEN v_progress >= progress_required AND unlocked_at IS NULL 
            THEN NOW() 
            ELSE unlocked_at 
        END
    WHERE id = v_achievement.id
    RETURNING is_completed INTO v_is_completed;
    
    -- Award credits if achievement is newly completed
    IF v_is_completed AND v_achievement.unlocked_at IS NULL THEN
        PERFORM award_community_credits(
            p_user_id,
            'achievement_' || p_achievement_type,
            10, -- 10 credits for achievements
            'Achievement unlocked: ' || v_achievement.achievement_name
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'achievement_id', v_achievement.id,
        'progress_current', v_progress,
        'progress_required', v_achievement.progress_required,
        'is_completed', v_is_completed,
        'newly_completed', v_is_completed AND v_achievement.unlocked_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- REWARD TRIGGER FUNCTIONS
-- =============================================

-- Function to handle positive review reward
CREATE OR REPLACE FUNCTION handle_positive_review_reward()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger for new reviews with 4+ stars
    IF TG_OP = 'INSERT' AND NEW.rating >= 4 THEN
        PERFORM award_community_credits(
            NEW.reviewed_user_id,
            'positive_review',
            3,
            'Received a ' || NEW.rating || '-star review',
            NEW.id,
            'review'
        );
        
        -- Check review collector achievement
        PERFORM check_and_award_achievement(NEW.reviewed_user_id, 'review_collector');
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to handle first post bonus
CREATE OR REPLACE FUNCTION handle_first_post_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_post_count INTEGER;
BEGIN
    -- Only trigger for new posts
    IF TG_OP = 'INSERT' THEN
        -- Check if this is the user's first post
        SELECT COUNT(*) INTO v_post_count
        FROM posts
        WHERE user_id = NEW.user_id;
        
        IF v_post_count = 1 THEN
            PERFORM award_community_credits(
                NEW.user_id,
                'first_post_bonus',
                5,
                'Created your first community post',
                NEW.id,
                'post'
            );
            
            -- Check first post achievement
            PERFORM check_and_award_achievement(NEW.user_id, 'first_post');
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to handle viral post reward
CREATE OR REPLACE FUNCTION check_viral_post_reward()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger for new likes
    IF TG_OP = 'INSERT' THEN
        -- Check if post has reached viral threshold
        IF EXISTS (
            SELECT 1 FROM posts 
            WHERE id = NEW.post_id AND like_count >= 50
        ) THEN
            -- Award viral post reward
            PERFORM award_community_credits(
                (SELECT user_id FROM posts WHERE id = NEW.post_id),
                'viral_post',
                10,
                'Your post went viral with 50+ likes',
                NEW.post_id,
                'post'
            );
            
            -- Check viral creator achievement
            PERFORM check_and_award_achievement(
                (SELECT user_id FROM posts WHERE id = NEW.post_id),
                'viral_creator'
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to handle report validation reward
CREATE OR REPLACE FUNCTION handle_report_validation_reward()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when report is resolved with action taken
    IF TG_OP = 'UPDATE' AND NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        IF NEW.action_taken IS NOT NULL AND NEW.action_taken != '' THEN
            PERFORM award_community_credits(
                NEW.reporter_id,
                'report_validation',
                5,
                'Your report led to action being taken',
                NEW.id,
                'report'
            );
            
            -- Check community guardian achievement
            PERFORM check_and_award_achievement(NEW.reporter_id, 'community_guardian');
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Trigger for positive review rewards
CREATE TRIGGER positive_review_reward_trigger
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION handle_positive_review_reward();

-- Trigger for first post bonus
CREATE TRIGGER first_post_bonus_trigger
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION handle_first_post_bonus();

-- Trigger for viral post rewards
CREATE TRIGGER viral_post_reward_trigger
    AFTER INSERT ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION check_viral_post_reward();

-- Trigger for report validation rewards
CREATE TRIGGER report_validation_reward_trigger
    AFTER UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION handle_report_validation_reward();

-- Success message
SELECT 'Reward system tables created successfully!' as status;
