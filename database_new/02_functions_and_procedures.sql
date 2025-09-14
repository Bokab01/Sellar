-- Sellar Mobile App - Database Functions and Stored Procedures
-- Functions used by the frontend application

-- =============================================
-- NOTIFICATION FUNCTIONS
-- =============================================

-- Function to create and queue notifications
CREATE OR REPLACE FUNCTION create_notification(
    target_user_id UUID,
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_body TEXT,
    notification_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (target_user_id, notification_type, notification_title, notification_body, notification_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue push notifications
CREATE OR REPLACE FUNCTION queue_push_notification(
    p_user_ids UUID[],
    p_title VARCHAR(255),
    p_body TEXT,
    p_notification_type VARCHAR(50),
    p_data JSONB DEFAULT '{}'::jsonb,
    p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
    queue_id UUID;
BEGIN
    -- Insert into push notification queue
    INSERT INTO push_notification_queue (
        user_ids, title, body, notification_type, data, scheduled_for
    )
    VALUES (
        p_user_ids, p_title, p_body, p_notification_type, p_data, p_scheduled_for
    )
    RETURNING id INTO queue_id;
    
    RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
    push_enabled BOOLEAN,
    messages_enabled BOOLEAN,
    offers_enabled BOOLEAN,
    community_enabled BOOLEAN,
    system_enabled BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_start_time TIME,
    quiet_end_time TIME,
    instant_notifications BOOLEAN,
    daily_digest BOOLEAN,
    weekly_summary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        np.push_enabled,
        np.messages_enabled,
        np.offers_enabled,
        np.community_enabled,
        np.system_enabled,
        np.quiet_hours_enabled,
        np.quiet_start_time,
        np.quiet_end_time,
        np.instant_notifications,
        np.daily_digest,
        np.weekly_summary
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;
    
    -- If no preferences exist, return defaults
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            true::BOOLEAN,  -- push_enabled
            true::BOOLEAN,  -- messages_enabled
            true::BOOLEAN,  -- offers_enabled
            true::BOOLEAN,  -- community_enabled
            true::BOOLEAN,  -- system_enabled
            false::BOOLEAN, -- quiet_hours_enabled
            '22:00'::TIME,  -- quiet_start_time
            '08:00'::TIME,  -- quiet_end_time
            true::BOOLEAN,  -- instant_notifications
            false::BOOLEAN, -- daily_digest
            false::BOOLEAN; -- weekly_summary
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
    p_user_id UUID,
    p_preferences JSONB
)
RETURNS TABLE (
    push_enabled BOOLEAN,
    messages_enabled BOOLEAN,
    offers_enabled BOOLEAN,
    community_enabled BOOLEAN,
    system_enabled BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_start_time TIME,
    quiet_end_time TIME,
    instant_notifications BOOLEAN,
    daily_digest BOOLEAN,
    weekly_summary BOOLEAN
) AS $$
BEGIN
    -- Upsert notification preferences
    INSERT INTO notification_preferences (
        user_id,
        push_enabled,
        messages_enabled,
        offers_enabled,
        community_enabled,
        system_enabled,
        quiet_hours_enabled,
        quiet_start_time,
        quiet_end_time,
        instant_notifications,
        daily_digest,
        weekly_summary
    )
    VALUES (
        p_user_id,
        COALESCE((p_preferences->>'push_enabled')::BOOLEAN, true),
        COALESCE((p_preferences->>'messages_enabled')::BOOLEAN, true),
        COALESCE((p_preferences->>'offers_enabled')::BOOLEAN, true),
        COALESCE((p_preferences->>'community_enabled')::BOOLEAN, true),
        COALESCE((p_preferences->>'system_enabled')::BOOLEAN, true),
        COALESCE((p_preferences->>'quiet_hours_enabled')::BOOLEAN, false),
        COALESCE((p_preferences->>'quiet_start_time')::TIME, '22:00'::TIME),
        COALESCE((p_preferences->>'quiet_end_time')::TIME, '08:00'::TIME),
        COALESCE((p_preferences->>'instant_notifications')::BOOLEAN, true),
        COALESCE((p_preferences->>'daily_digest')::BOOLEAN, false),
        COALESCE((p_preferences->>'weekly_summary')::BOOLEAN, false)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        push_enabled = COALESCE((p_preferences->>'push_enabled')::BOOLEAN, notification_preferences.push_enabled),
        messages_enabled = COALESCE((p_preferences->>'messages_enabled')::BOOLEAN, notification_preferences.messages_enabled),
        offers_enabled = COALESCE((p_preferences->>'offers_enabled')::BOOLEAN, notification_preferences.offers_enabled),
        community_enabled = COALESCE((p_preferences->>'community_enabled')::BOOLEAN, notification_preferences.community_enabled),
        system_enabled = COALESCE((p_preferences->>'system_enabled')::BOOLEAN, notification_preferences.system_enabled),
        quiet_hours_enabled = COALESCE((p_preferences->>'quiet_hours_enabled')::BOOLEAN, notification_preferences.quiet_hours_enabled),
        quiet_start_time = COALESCE((p_preferences->>'quiet_start_time')::TIME, notification_preferences.quiet_start_time),
        quiet_end_time = COALESCE((p_preferences->>'quiet_end_time')::TIME, notification_preferences.quiet_end_time),
        instant_notifications = COALESCE((p_preferences->>'instant_notifications')::BOOLEAN, notification_preferences.instant_notifications),
        daily_digest = COALESCE((p_preferences->>'daily_digest')::BOOLEAN, notification_preferences.daily_digest),
        weekly_summary = COALESCE((p_preferences->>'weekly_summary')::BOOLEAN, notification_preferences.weekly_summary),
        updated_at = NOW();
    
    -- Return updated preferences
    RETURN QUERY
    SELECT 
        np.push_enabled,
        np.messages_enabled,
        np.offers_enabled,
        np.community_enabled,
        np.system_enabled,
        np.quiet_hours_enabled,
        np.quiet_start_time,
        np.quiet_end_time,
        np.instant_notifications,
        np.daily_digest,
        np.weekly_summary
    FROM notification_preferences np
    WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FOLLOW SYSTEM FUNCTIONS
-- =============================================

-- Function to follow a user
CREATE OR REPLACE FUNCTION follow_user(
    follower_id UUID,
    following_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
    -- Check if already following
    IF EXISTS (
        SELECT 1 FROM follows 
        WHERE follows.follower_id = follow_user.follower_id 
        AND follows.following_id = follow_user.following_id
    ) THEN
        RETURN QUERY SELECT false, 'Already following this user';
        RETURN;
    END IF;
    
    -- Check if trying to follow self
    IF follower_id = following_id THEN
        RETURN QUERY SELECT false, 'Cannot follow yourself';
        RETURN;
    END IF;
    
    -- Insert follow relationship
    INSERT INTO follows (follower_id, following_id)
    VALUES (follower_id, following_id);
    
    RETURN QUERY SELECT true, 'Successfully followed user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unfollow a user
CREATE OR REPLACE FUNCTION unfollow_user(
    follower_id UUID,
    following_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
    -- Delete follow relationship
    DELETE FROM follows 
    WHERE follows.follower_id = unfollow_user.follower_id 
    AND follows.following_id = unfollow_user.following_id;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Successfully unfollowed user';
    ELSE
        RETURN QUERY SELECT false, 'Not following this user';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user followers
CREATE OR REPLACE FUNCTION get_user_followers(
    target_user_id UUID,
    page_limit INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    username VARCHAR(50),
    avatar_url TEXT,
    is_verified BOOLEAN,
    followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.full_name,
        p.username,
        p.avatar_url,
        p.is_verified,
        f.created_at as followed_at
    FROM follows f
    JOIN profiles p ON f.follower_id = p.id
    WHERE f.following_id = target_user_id
    ORDER BY f.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users being followed
CREATE OR REPLACE FUNCTION get_user_following(
    target_user_id UUID,
    page_limit INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    username VARCHAR(50),
    avatar_url TEXT,
    is_verified BOOLEAN,
    followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.full_name,
        p.username,
        p.avatar_url,
        p.is_verified,
        f.created_at as followed_at
    FROM follows f
    JOIN profiles p ON f.following_id = p.id
    WHERE f.follower_id = target_user_id
    ORDER BY f.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CREDITS AND MONETIZATION FUNCTIONS
-- =============================================

-- Function to spend user credits
CREATE OR REPLACE FUNCTION spend_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT) AS $$
DECLARE
    current_balance INTEGER;
    new_bal INTEGER;
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- If no credits record exists, create one
    IF current_balance IS NULL THEN
        INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
        VALUES (p_user_id, 0, 0, 0);
        current_balance := 0;
    END IF;
    
    -- Check if user has enough credits
    IF current_balance < p_amount THEN
        RETURN QUERY SELECT false, current_balance, 'Insufficient credits';
        RETURN;
    END IF;
    
    -- Calculate new balance
    new_bal := current_balance - p_amount;
    
    -- Update user credits
    UPDATE user_credits
    SET 
        balance = new_bal,
        lifetime_spent = lifetime_spent + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after, 
        reference_id, reference_type, metadata
    )
    VALUES (
        p_user_id, 'spent', p_amount, current_balance, new_bal,
        p_reference_id, p_reference_type, jsonb_build_object('reason', p_reason)
    );
    
    RETURN QUERY SELECT true, new_bal, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to purchase a feature with credits
CREATE OR REPLACE FUNCTION purchase_feature(
    p_user_id UUID,
    p_feature_key VARCHAR(100),
    p_credits INTEGER,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT) AS $$
DECLARE
    result_success BOOLEAN;
    result_balance INTEGER;
    result_error TEXT;
    p_listing_id UUID;
BEGIN
    -- Extract listing_id from metadata if provided
    p_listing_id := (p_metadata->>'listing_id')::UUID;
    
    -- Use the spend_user_credits function
    SELECT * INTO result_success, result_balance, result_error
    FROM spend_user_credits(
        p_user_id, 
        p_credits, 
        'Feature purchase: ' || p_feature_key,
        p_listing_id,
        'feature_purchase'
    );
    
    -- If credit deduction successful, apply the feature effect
    IF result_success THEN
        PERFORM apply_feature_effect(p_user_id, p_feature_key, p_listing_id, p_metadata);
    END IF;
    
    RETURN QUERY SELECT result_success, result_balance, result_error;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply feature effects
CREATE OR REPLACE FUNCTION apply_feature_effect(
    p_user_id UUID,
    p_feature_key VARCHAR(100),
    p_listing_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
    feature_duration INTERVAL;
    boost_multiplier INTEGER;
BEGIN
    -- Apply feature effects based on feature key
    CASE p_feature_key
        WHEN 'pulse_boost_24h' THEN
            -- 24-hour visibility boost
            UPDATE listings 
            SET 
                boost_until = NOW() + INTERVAL '24 hours',
                boost_score = 200,
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'mega_pulse_7d' THEN
            -- 7-day mega visibility boost
            UPDATE listings 
            SET 
                boost_until = NOW() + INTERVAL '7 days',
                boost_score = 500,
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'category_spotlight_3d' THEN
            -- 3-day category spotlight
            UPDATE listings 
            SET 
                spotlight_until = NOW() + INTERVAL '3 days',
                spotlight_category_id = category_id,
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'ad_refresh' THEN
            -- Refresh listing to top (update timestamp)
            UPDATE listings 
            SET 
                updated_at = NOW(),
                created_at = NOW() -- This moves it to top of recent listings
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'listing_highlight' THEN
            -- 7-day listing highlight with colored border
            UPDATE listings 
            SET 
                highlight_until = NOW() + INTERVAL '7 days',
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'urgent_badge' THEN
            -- 3-day urgent sale badge
            UPDATE listings 
            SET 
                urgent_until = NOW() + INTERVAL '3 days',
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        ELSE
            -- Unknown feature, log but don't fail
            RAISE NOTICE 'Unknown feature key: %', p_feature_key;
    END CASE;
    
    -- Log feature activation
    INSERT INTO feature_purchases (
        user_id,
        listing_id,
        feature_key,
        feature_name,
        credits_spent,
        status,
        expires_at,
        metadata
    ) VALUES (
        p_user_id,
        p_listing_id,
        p_feature_key,
        CASE p_feature_key
            WHEN 'pulse_boost_24h' THEN 'Pulse Boost'
            WHEN 'mega_pulse_7d' THEN 'Mega Pulse'
            WHEN 'category_spotlight_3d' THEN 'Category Spotlight'
            WHEN 'ad_refresh' THEN 'Ad Refresh'
            WHEN 'listing_highlight' THEN 'Listing Highlight'
            WHEN 'urgent_badge' THEN 'Urgent Badge'
            ELSE p_feature_key
        END,
        p_credits,
        'active',
        CASE p_feature_key
            WHEN 'pulse_boost_24h' THEN NOW() + INTERVAL '24 hours'
            WHEN 'mega_pulse_7d' THEN NOW() + INTERVAL '7 days'
            WHEN 'category_spotlight_3d' THEN NOW() + INTERVAL '3 days'
            WHEN 'ad_refresh' THEN NOW() -- Instant effect
            WHEN 'listing_highlight' THEN NOW() + INTERVAL '7 days'
            WHEN 'urgent_badge' THEN NOW() + INTERVAL '3 days'
            ELSE NOW()
        END,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired features
CREATE OR REPLACE FUNCTION cleanup_expired_features()
RETURNS TABLE (
    expired_boosts INTEGER,
    expired_highlights INTEGER,
    expired_urgent INTEGER,
    expired_spotlights INTEGER
) AS $$
DECLARE
    boost_count INTEGER := 0;
    highlight_count INTEGER := 0;
    urgent_count INTEGER := 0;
    spotlight_count INTEGER := 0;
BEGIN
    -- Clear expired boosts
    UPDATE listings 
    SET boost_until = NULL, boost_score = 0, updated_at = NOW()
    WHERE boost_until IS NOT NULL AND boost_until < NOW();
    GET DIAGNOSTICS boost_count = ROW_COUNT;
    
    -- Clear expired highlights
    UPDATE listings 
    SET highlight_until = NULL, updated_at = NOW()
    WHERE highlight_until IS NOT NULL AND highlight_until < NOW();
    GET DIAGNOSTICS highlight_count = ROW_COUNT;
    
    -- Clear expired urgent badges
    UPDATE listings 
    SET urgent_until = NULL, updated_at = NOW()
    WHERE urgent_until IS NOT NULL AND urgent_until < NOW();
    GET DIAGNOSTICS urgent_count = ROW_COUNT;
    
    -- Clear expired spotlights
    UPDATE listings 
    SET spotlight_until = NULL, spotlight_category_id = NULL, updated_at = NOW()
    WHERE spotlight_until IS NOT NULL AND spotlight_until < NOW();
    GET DIAGNOSTICS spotlight_count = ROW_COUNT;
    
    -- Mark expired feature purchases as expired
    UPDATE feature_purchases 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expires_at < NOW();
    
    RETURN QUERY SELECT boost_count, highlight_count, urgent_count, spotlight_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user entitlements (subscription benefits)
CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_subscription RECORD;
    entitlements JSONB;
BEGIN
    -- Get active subscription
    SELECT us.*, sp.features
    INTO user_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    -- If no active subscription, return basic entitlements
    IF user_subscription IS NULL THEN
        entitlements := jsonb_build_object(
            'max_listings', 5,
            'boost_credits', 0,
            'analytics_level', 'none',
            'priority_support', false,
            'business_badge', false,
            'auto_boost', false
        );
    ELSE
        -- Return subscription entitlements
        entitlements := user_subscription.features;
    END IF;
    
    RETURN entitlements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- REFERRAL AND REWARDS FUNCTIONS
-- =============================================

-- Function to claim referral bonus
CREATE OR REPLACE FUNCTION claim_referral_bonus(
    p_referrer_id UUID,
    p_referee_id UUID,
    p_referral_code VARCHAR(50)
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    bonus_amount INTEGER := 50; -- 50 credits bonus
    referrer_balance INTEGER;
    referee_balance INTEGER;
BEGIN
    -- Validate that users exist and are different
    IF p_referrer_id = p_referee_id THEN
        RETURN QUERY SELECT false, 'Cannot refer yourself';
        RETURN;
    END IF;
    
    -- Check if referral already claimed
    IF EXISTS (
        SELECT 1 FROM credit_transactions 
        WHERE reference_id = p_referee_id 
        AND reference_type = 'referral_bonus'
        AND metadata->>'referrer_id' = p_referrer_id::text
    ) THEN
        RETURN QUERY SELECT false, 'Referral bonus already claimed';
        RETURN;
    END IF;
    
    -- Get current balances
    SELECT COALESCE(balance, 0) INTO referrer_balance
    FROM user_credits WHERE user_id = p_referrer_id;
    
    SELECT COALESCE(balance, 0) INTO referee_balance
    FROM user_credits WHERE user_id = p_referee_id;
    
    -- Create credits records if they don't exist
    INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_referrer_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_referee_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Award bonus to referrer
    UPDATE user_credits
    SET 
        balance = balance + bonus_amount,
        lifetime_earned = lifetime_earned + bonus_amount,
        updated_at = NOW()
    WHERE user_id = p_referrer_id;
    
    -- Award bonus to referee
    UPDATE user_credits
    SET 
        balance = balance + bonus_amount,
        lifetime_earned = lifetime_earned + bonus_amount,
        updated_at = NOW()
    WHERE user_id = p_referee_id;
    
    -- Log referrer transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after,
        reference_id, reference_type, metadata
    )
    VALUES (
        p_referrer_id, 'earned', bonus_amount, referrer_balance, referrer_balance + bonus_amount,
        p_referee_id, 'referral_bonus', 
        jsonb_build_object('referral_code', p_referral_code, 'referee_id', p_referee_id)
    );
    
    -- Log referee transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after,
        reference_id, reference_type, metadata
    )
    VALUES (
        p_referee_id, 'earned', bonus_amount, referee_balance, referee_balance + bonus_amount,
        p_referrer_id, 'referral_bonus',
        jsonb_build_object('referral_code', p_referral_code, 'referrer_id', p_referrer_id)
    );
    
    RETURN QUERY SELECT true, 'Referral bonus awarded successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user reward summary
CREATE OR REPLACE FUNCTION get_user_reward_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    credits_info RECORD;
    rewards_info RECORD;
    summary JSONB;
BEGIN
    -- Get credits information
    SELECT 
        COALESCE(balance, 0) as current_balance,
        COALESCE(lifetime_earned, 0) as total_earned,
        COALESCE(lifetime_spent, 0) as total_spent
    INTO credits_info
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- Get community rewards information
    SELECT 
        COALESCE(SUM(points), 0) as total_points,
        COUNT(*) as total_rewards
    INTO rewards_info
    FROM community_rewards
    WHERE user_id = p_user_id;
    
    -- Build summary
    summary := jsonb_build_object(
        'credits', jsonb_build_object(
            'current_balance', COALESCE(credits_info.current_balance, 0),
            'lifetime_earned', COALESCE(credits_info.total_earned, 0),
            'lifetime_spent', COALESCE(credits_info.total_spent, 0)
        ),
        'community_points', jsonb_build_object(
            'total_points', COALESCE(rewards_info.total_points, 0),
            'total_rewards', COALESCE(rewards_info.total_rewards, 0)
        )
    );
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim anniversary bonus
CREATE OR REPLACE FUNCTION claim_anniversary_bonus(p_user_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    user_created_date DATE;
    anniversary_date DATE;
    bonus_amount INTEGER := 100; -- 100 credits for anniversary
    current_balance INTEGER;
BEGIN
    -- Get user creation date
    SELECT DATE(created_at) INTO user_created_date
    FROM profiles
    WHERE id = p_user_id;
    
    IF user_created_date IS NULL THEN
        RETURN QUERY SELECT false, 'User not found';
        RETURN;
    END IF;
    
    -- Calculate anniversary date for current year
    anniversary_date := DATE(EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                            EXTRACT(MONTH FROM user_created_date) || '-' || 
                            EXTRACT(DAY FROM user_created_date));
    
    -- Check if today is anniversary (within 7 days)
    IF ABS(EXTRACT(DAYS FROM (CURRENT_DATE - anniversary_date))) > 7 THEN
        RETURN QUERY SELECT false, 'Not within anniversary period';
        RETURN;
    END IF;
    
    -- Check if already claimed this year
    IF EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE user_id = p_user_id
        AND reference_type = 'anniversary_bonus'
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    ) THEN
        RETURN QUERY SELECT false, 'Anniversary bonus already claimed this year';
        RETURN;
    END IF;
    
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO current_balance
    FROM user_credits WHERE user_id = p_user_id;
    
    -- Create credits record if it doesn't exist
    INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Award anniversary bonus
    UPDATE user_credits
    SET 
        balance = balance + bonus_amount,
        lifetime_earned = lifetime_earned + bonus_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after,
        reference_type, metadata
    )
    VALUES (
        p_user_id, 'earned', bonus_amount, current_balance, current_balance + bonus_amount,
        'anniversary_bonus', 
        jsonb_build_object('anniversary_year', EXTRACT(YEAR FROM CURRENT_DATE))
    );
    
    RETURN QUERY SELECT true, 'Anniversary bonus awarded successfully!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to update listing view count
CREATE OR REPLACE FUNCTION increment_listing_views(
    p_listing_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert view record
    INSERT INTO listing_views (listing_id, user_id, ip_address)
    VALUES (p_listing_id, p_user_id, p_ip_address);
    
    -- Update listing view count
    UPDATE listings
    SET views_count = views_count + 1
    WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update post engagement counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'likes' AND NEW.post_id IS NOT NULL THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_TABLE_NAME = 'comments' THEN
            UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_TABLE_NAME = 'shares' THEN
            UPDATE posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF TG_TABLE_NAME = 'likes' AND OLD.post_id IS NOT NULL THEN
            UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        ELSIF TG_TABLE_NAME = 'comments' THEN
            UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        ELSIF TG_TABLE_NAME = 'shares' THEN
            UPDATE posts SET shares_count = shares_count - 1 WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for post engagement counts
CREATE TRIGGER update_post_likes_count
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_post_counts();

CREATE TRIGGER update_post_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_counts();

CREATE TRIGGER update_post_shares_count
    AFTER INSERT OR DELETE ON shares
    FOR EACH ROW EXECUTE FUNCTION update_post_counts();
