-- Sellar Mobile App - Database Functions and Stored Procedures
-- Functions used by the frontend application

-- =============================================
-- USER MANAGEMENT FUNCTIONS
-- =============================================

-- Function to check if email exists
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE email = email_to_check
        UNION
        SELECT 1 FROM auth.users WHERE email = email_to_check
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if username exists
CREATE OR REPLACE FUNCTION check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE username = username_to_check
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if phone exists
CREATE OR REPLACE FUNCTION check_phone_exists(phone_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE phone = phone_to_check
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure user profile exists (create if missing)
CREATE OR REPLACE FUNCTION ensure_user_profile(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_data JSONB;
    auth_user_data RECORD;
    user_first_name TEXT;
    user_last_name TEXT;
    user_email TEXT;
    user_phone TEXT;
    user_location TEXT;
    referral_code_value TEXT;
    verification_status_value TEXT;
BEGIN
    -- Check if profile already exists
    SELECT to_jsonb(p.*) INTO profile_data
    FROM profiles p
    WHERE p.id = user_id;
    
    -- If profile exists, return it
    IF profile_data IS NOT NULL THEN
        RETURN profile_data;
    END IF;
    
    -- Get user data from auth.users
    SELECT * INTO auth_user_data
    FROM auth.users
    WHERE id = user_id;
    
    -- If auth user doesn't exist, return error
    IF auth_user_data IS NULL THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'User not found in auth system'
        );
    END IF;
    
    -- Extract and validate user data
    user_first_name := COALESCE(
        NULLIF(TRIM((auth_user_data.raw_user_meta_data->>'firstName')::TEXT), ''),
        NULLIF(TRIM((auth_user_data.raw_user_meta_data->>'first_name')::TEXT), ''),
        'User'
    );
    
    user_last_name := COALESCE(
        NULLIF(TRIM((auth_user_data.raw_user_meta_data->>'lastName')::TEXT), ''),
        NULLIF(TRIM((auth_user_data.raw_user_meta_data->>'last_name')::TEXT), ''),
        ''
    );
    
    user_email := COALESCE(
        NULLIF(TRIM(auth_user_data.email), ''),
        NULLIF(TRIM((auth_user_data.raw_user_meta_data->>'email')::TEXT), '')
    );
    
    user_phone := NULLIF(TRIM((auth_user_data.raw_user_meta_data->>'phone')::TEXT), '');
    
    user_location := COALESCE(
        NULLIF(TRIM((auth_user_data.raw_user_meta_data->>'location')::TEXT), ''),
        'Accra, Greater Accra'
    );
    
    -- Generate unique referral code
    referral_code_value := UPPER(SUBSTRING(MD5(user_id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 8));
    
    -- Ensure referral code is unique
    WHILE EXISTS (SELECT 1 FROM profiles WHERE referral_code = referral_code_value) LOOP
        referral_code_value := UPPER(SUBSTRING(MD5(user_id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT || random()::TEXT), 1, 8));
    END LOOP;
    
    -- Determine verification status based on email confirmation
    verification_status_value := CASE 
        WHEN auth_user_data.email_confirmed_at IS NOT NULL THEN 'verified'
        ELSE 'unverified'
    END;
    
    -- Create profile from auth user data
    BEGIN
        INSERT INTO profiles (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url,
            location,
            is_business,
            account_type,
            verification_status,
            referral_code,
            referred_by,
            onboarding_completed,
            onboarding_completed_at,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            user_first_name,
            user_last_name,
            user_email,
            user_phone,
            (auth_user_data.raw_user_meta_data->>'avatar_url')::TEXT,
            user_location,
            COALESCE((auth_user_data.raw_user_meta_data->>'is_business')::BOOLEAN, false),
            COALESCE((auth_user_data.raw_user_meta_data->>'account_type')::TEXT, 'individual'),
            verification_status_value,
            referral_code_value,
            (auth_user_data.raw_user_meta_data->>'referralCode')::TEXT,
            false,
            NULL,
            COALESCE(auth_user_data.created_at, NOW()),
            NOW()
        );
        
        -- Process referral if applicable
        IF (auth_user_data.raw_user_meta_data->>'referralCode')::TEXT IS NOT NULL THEN
            BEGIN
                PERFORM process_signup_referral(user_id, (auth_user_data.raw_user_meta_data->>'referralCode')::TEXT);
            EXCEPTION
                WHEN OTHERS THEN
                    -- Log referral processing error but don't fail profile creation
                    RAISE WARNING 'Failed to process referral for user %: %', user_id, SQLERRM;
            END;
        END IF;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Profile already exists, update it with current auth data
            UPDATE profiles SET
                first_name = user_first_name,
                last_name = user_last_name,
                email = user_email,
                phone = user_phone,
                verification_status = verification_status_value,
                updated_at = NOW()
            WHERE id = user_id;
    END;
    
    -- Initialize user credits (ignore if already exists)
    BEGIN
        INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
        VALUES (user_id, 0, 0, 0);
    EXCEPTION
        WHEN unique_violation THEN
            -- Credits already exist, ignore
            NULL;
    END;
    
    -- Create default notification preferences (ignore if already exists)
    BEGIN
        INSERT INTO notification_preferences (user_id)
        VALUES (user_id);
    EXCEPTION
        WHEN unique_violation THEN
            -- Preferences already exist, ignore
            NULL;
    END;
    
    -- Create default user settings (ignore if already exists)
    BEGIN
        INSERT INTO user_settings (user_id)
        VALUES (user_id);
    EXCEPTION
        WHEN unique_violation THEN
            -- Settings already exist, ignore
            NULL;
    END;
    
    -- Get the created/updated profile
    SELECT to_jsonb(p.*) INTO profile_data
    FROM profiles p
    WHERE p.id = user_id;
    
    RETURN profile_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with fallback creation
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_data JSONB;
BEGIN
    -- Try to get existing profile
    SELECT to_jsonb(p.*) INTO profile_data
    FROM profiles p
    WHERE p.id = user_id;
    
    -- If profile exists, return it
    IF profile_data IS NOT NULL THEN
        RETURN profile_data;
    END IF;
    
    -- If profile doesn't exist, create it
    RETURN ensure_user_profile(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile for new user with error handling
    BEGIN
        PERFORM ensure_user_profile(NEW.id);
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
    
    -- If credit deduction successful, create feature purchase record and apply effects
    IF result_success THEN
        -- Create feature purchase record
        INSERT INTO feature_purchases (
            user_id,
            listing_id,
            feature_key,
            feature_name,
            credits_spent,
            status,
            activated_at,
            expires_at,
            metadata
        ) VALUES (
            p_user_id,
            p_listing_id,
            p_feature_key,
            CASE 
                WHEN p_feature_key = 'pulse_boost_24h' THEN 'Pulse Boost'
                WHEN p_feature_key = 'mega_pulse_7d' THEN 'Mega Pulse'
                WHEN p_feature_key = 'category_spotlight_3d' THEN 'Category Spotlight'
                WHEN p_feature_key = 'listing_highlight' THEN 'Listing Highlight'
                WHEN p_feature_key = 'urgent_badge' THEN 'Urgent Badge'
                WHEN p_feature_key = 'ad_refresh' THEN 'Ad Refresh'
                ELSE p_feature_key -- Fallback to key if not mapped
            END,
            p_credits,
            'active',
            NOW(),
            CASE 
                WHEN p_feature_key = 'pulse_boost_24h' THEN NOW() + INTERVAL '24 hours'
                WHEN p_feature_key = 'mega_pulse_7d' THEN NOW() + INTERVAL '7 days'
                WHEN p_feature_key = 'category_spotlight_3d' THEN NOW() + INTERVAL '3 days'
                WHEN p_feature_key = 'listing_highlight' THEN NOW() + INTERVAL '7 days'
                WHEN p_feature_key = 'urgent_badge' THEN NOW() + INTERVAL '3 days'
                WHEN p_feature_key = 'ad_refresh' THEN NULL -- Instant effect
                ELSE NOW() + INTERVAL '30 days' -- Default duration
            END,
            p_metadata
        );
        
        -- Apply the feature effect
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
    
    -- Feature effects are applied to listings table above
    -- The feature_purchases record is created by the purchase_feature function
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
    -- Get active OR cancelled subscription (cancelled but still within period)
    SELECT us.*, sp.features
    INTO user_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'cancelled')  -- Include cancelled subscriptions
    AND us.current_period_end > NOW()  -- Still within the current period
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    -- If no active subscription, return basic entitlements
    IF user_subscription IS NULL THEN
        entitlements := jsonb_build_object(
            'max_listings', 5,
            'analytics_level', 'none',
            'priority_support', false,
            'business_badge', false,
            'auto_boost', false,
            'business_features', false
        );
    ELSE
        -- Map subscription features to entitlements format
        -- Check if features is an array (new format) or object (legacy format)
        IF jsonb_typeof(user_subscription.features) = 'array' THEN
            -- New array format - map to entitlements object
            entitlements := jsonb_build_object(
                'max_listings', CASE WHEN user_subscription.features ? 'unlimited_listings' THEN 999999 ELSE 5 END,
                'analytics_level', CASE 
                    WHEN user_subscription.features ? 'comprehensive_analytics' THEN 'full'
                    WHEN user_subscription.features ? 'basic_analytics' THEN 'basic'
                    ELSE 'none' 
                END,
                'priority_support', user_subscription.features ? 'priority_support',
                'business_badge', true, -- All business plans get business badge
                'auto_boost', user_subscription.features ? 'auto_boost_listings',
                'business_features', true,
                'homepage_placement', user_subscription.features ? 'homepage_placement',
                'premium_branding', user_subscription.features ? 'premium_branding',
                'sponsored_posts', user_subscription.features ? 'sponsored_posts',
                'bulk_operations', user_subscription.features ? 'bulk_operations'
            );
        ELSE
            -- Legacy object format - use as is
            entitlements := user_subscription.features;
        END IF;
    END IF;
    
    RETURN entitlements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- REFERRAL AND REWARDS FUNCTIONS
-- =============================================

-- Function to lookup user by referral code
CREATE OR REPLACE FUNCTION get_user_by_referral_code(p_referral_code VARCHAR(50))
RETURNS UUID AS $$
DECLARE
    referrer_id UUID;
BEGIN
    -- Find user whose ID ends with the referral code (case insensitive)
    SELECT id INTO referrer_id
    FROM profiles
    WHERE UPPER(RIGHT(id::text, 8)) = UPPER(p_referral_code)
    LIMIT 1;
    
    RETURN referrer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral during signup
CREATE OR REPLACE FUNCTION process_signup_referral(
    p_new_user_id UUID,
    p_referral_code VARCHAR(50)
)
RETURNS TABLE (success BOOLEAN, message TEXT, credits_awarded INTEGER) AS $$
DECLARE
    referrer_id UUID;
    bonus_amount INTEGER := 50;
    result_success BOOLEAN := false;
    result_message TEXT := '';
    credits_given INTEGER := 0;
BEGIN
    -- Skip if no referral code provided
    IF p_referral_code IS NULL OR LENGTH(TRIM(p_referral_code)) = 0 THEN
        RETURN QUERY SELECT false, 'No referral code provided', 0;
        RETURN;
    END IF;
    
    -- Find the referrer
    SELECT get_user_by_referral_code(p_referral_code) INTO referrer_id;
    
    IF referrer_id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid referral code', 0;
        RETURN;
    END IF;
    
    -- Cannot refer yourself
    IF referrer_id = p_new_user_id THEN
        RETURN QUERY SELECT false, 'Cannot refer yourself', 0;
        RETURN;
    END IF;
    
    -- Check if this user was already referred
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_new_user_id 
        AND referred_by IS NOT NULL
    ) THEN
        RETURN QUERY SELECT false, 'User already has a referrer', 0;
        RETURN;
    END IF;
    
    -- Update the new user's profile with referral info
    UPDATE profiles 
    SET 
        referral_code = p_referral_code,
        referred_by = referrer_id,
        updated_at = NOW()
    WHERE id = p_new_user_id;
    
    -- Auto-claim the referral bonus
    SELECT * INTO result_success, result_message 
    FROM claim_referral_bonus(referrer_id, p_new_user_id, p_referral_code);
    
    IF result_success THEN
        credits_given := bonus_amount * 2; -- Both users get credits
        result_message := 'Referral bonus awarded successfully';
    END IF;
    
    RETURN QUERY SELECT result_success, result_message, credits_given;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Trigger function to auto-process referrals after profile creation
CREATE OR REPLACE FUNCTION trigger_process_referral()
RETURNS TRIGGER AS $$
DECLARE
    referral_result RECORD;
BEGIN
    -- Only process if there's a referral code and no existing referrer
    IF NEW.referral_code IS NOT NULL AND NEW.referred_by IS NULL THEN
        -- Process the referral
        SELECT * INTO referral_result
        FROM process_signup_referral(NEW.id, NEW.referral_code);
        
        -- Log the result (optional)
        IF referral_result.success THEN
            RAISE NOTICE 'Referral processed successfully for user %: % credits awarded', 
                NEW.id, referral_result.credits_awarded;
        ELSE
            RAISE NOTICE 'Referral processing failed for user %: %', 
                NEW.id, referral_result.message;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get referral statistics
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    total_referrals INTEGER := 0;
    successful_referrals INTEGER := 0;
    total_earned INTEGER := 0;
    recent_referrals JSONB;
BEGIN
    -- Count total people referred by this user
    SELECT COUNT(*) INTO total_referrals
    FROM profiles
    WHERE referred_by = p_user_id;
    
    -- Count successful referrals (those who got the bonus)
    SELECT COUNT(*) INTO successful_referrals
    FROM credit_transactions ct
    JOIN profiles p ON ct.reference_id = p.id
    WHERE ct.user_id = p_user_id
    AND ct.reference_type = 'referral_bonus'
    AND ct.type = 'earned';
    
    -- Calculate total credits earned from referrals
    SELECT COALESCE(SUM(amount), 0) INTO total_earned
    FROM credit_transactions
    WHERE user_id = p_user_id
    AND reference_type = 'referral_bonus'
    AND type = 'earned';
    
    -- Get recent referrals (last 5)
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'name', p.first_name || ' ' || p.last_name,
                'date', p.created_at,
                'credits_earned', 50
            ) ORDER BY p.created_at DESC
        ), '[]'::json
    ) INTO recent_referrals
    FROM profiles p
    WHERE p.referred_by = p_user_id
    LIMIT 5;
    
    RETURN jsonb_build_object(
        'totalReferrals', total_referrals,
        'successfulReferrals', successful_referrals,
        'pendingReferrals', total_referrals - successful_referrals,
        'totalEarned', total_earned,
        'recentReferrals', recent_referrals
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_process_referral ON profiles;
CREATE TRIGGER auto_process_referral
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_process_referral();

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
-- COMMUNITY REWARDS SYSTEM
-- =============================================

-- Function to award community reward
CREATE OR REPLACE FUNCTION award_community_reward(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_points INTEGER,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Insert community reward
    INSERT INTO community_rewards (
        user_id, type, points, description, metadata, is_validated
    )
    VALUES (
        p_user_id, p_type, p_points, p_description, p_metadata, true
    );
    
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO current_balance
    FROM user_credits WHERE user_id = p_user_id;
    
    -- Create credits record if it doesn't exist
    INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Award credits
    UPDATE user_credits
    SET 
        balance = balance + p_points,
        lifetime_earned = lifetime_earned + p_points,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after,
        reference_type, metadata
    )
    VALUES (
        p_user_id, 'earned', p_points, current_balance, current_balance + p_points,
        'community_reward', 
        jsonb_build_object('reward_type', p_type, 'description', p_description)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle first post bonus
CREATE OR REPLACE FUNCTION handle_first_post_bonus()
RETURNS TRIGGER AS $$
DECLARE
    post_count INTEGER;
    reward_already_given BOOLEAN;
BEGIN
    -- Check if user has already received the first post bonus
    SELECT EXISTS(
        SELECT 1 FROM community_rewards 
        WHERE user_id = NEW.user_id 
        AND type = 'first_post_bonus'
    ) INTO reward_already_given;
    
    -- If reward already given, don't award again
    IF reward_already_given THEN
        RETURN NEW;
    END IF;
    
    -- Check if this is the user's first post
    SELECT COUNT(*) INTO post_count
    FROM posts
    WHERE user_id = NEW.user_id;
    
    -- If this is the first post, award bonus
    IF post_count = 1 THEN
        PERFORM award_community_reward(
            NEW.user_id,
            'first_post_bonus',
            5,
            'Congratulations on your first community post!',
            jsonb_build_object('post_id', NEW.id, 'post_type', NEW.type)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to handle positive review rewards
CREATE OR REPLACE FUNCTION handle_positive_review_reward()
RETURNS TRIGGER AS $$
DECLARE
    reward_already_given BOOLEAN;
BEGIN
    -- Handle INSERT or UPDATE operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Award reward for 4-5 star reviews
        IF NEW.rating >= 4 THEN
            -- Check if reward already given for this specific review
            SELECT EXISTS(
                SELECT 1 FROM community_rewards 
                WHERE user_id = NEW.reviewed_user_id 
                AND type = 'positive_review'
                AND metadata->>'review_id' = NEW.id::text
            ) INTO reward_already_given;
            
            -- Only award if not already given for this review
            IF NOT reward_already_given THEN
                -- For UPDATE: only award if the OLD rating was < 4 (newly became positive)
                IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.rating < 4) THEN
                    PERFORM award_community_reward(
                        NEW.reviewed_user_id,
                        'positive_review',
                        3,
                        'You received a positive review!',
                        jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating, 'reviewer_id', NEW.reviewer_id)
                    );
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for reward system
DROP TRIGGER IF EXISTS trigger_first_post_bonus ON posts;
CREATE TRIGGER trigger_first_post_bonus
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION handle_first_post_bonus();


DROP TRIGGER IF EXISTS trigger_positive_review_reward ON reviews;
CREATE TRIGGER trigger_positive_review_reward
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION handle_positive_review_reward();

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
-- SECURITY DEFINER allows the function to bypass RLS policies
-- This is crucial so that when User B comments on User A's post,
-- the trigger can still update User A's post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
DECLARE
    post_user_id UUID;
    current_likes INTEGER;
    reward_given BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'likes' AND NEW.post_id IS NOT NULL THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
            
            -- Check for viral post rewards after updating likes count
            SELECT user_id, likes_count INTO post_user_id, current_likes
            FROM posts WHERE id = NEW.post_id;
            
            -- Check for 50+ likes (viral post)
            IF current_likes >= 50 THEN
                SELECT EXISTS(
                    SELECT 1 FROM community_rewards 
                    WHERE user_id = post_user_id 
                    AND type = 'viral_post' 
                    AND metadata->>'post_id' = NEW.post_id::text
                ) INTO reward_given;
                
                IF NOT reward_given THEN
                    PERFORM award_community_reward(
                        post_user_id,
                        'viral_post',
                        10,
                        'Your post went viral with 50+ likes!',
                        jsonb_build_object('post_id', NEW.post_id, 'likes_count', current_likes)
                    );
                END IF;
            END IF;
            
            -- Check for 100+ likes (super viral post)
            IF current_likes >= 100 THEN
                SELECT EXISTS(
                    SELECT 1 FROM community_rewards 
                    WHERE user_id = post_user_id 
                    AND type = 'super_viral_post' 
                    AND metadata->>'post_id' = NEW.post_id::text
                ) INTO reward_given;
                
                IF NOT reward_given THEN
                    PERFORM award_community_reward(
                        post_user_id,
                        'super_viral_post',
                        15,
                        'Your post is super viral with 100+ likes!',
                        jsonb_build_object('post_id', NEW.post_id, 'likes_count', current_likes)
                    );
                END IF;
            END IF;
            
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- =============================================
-- MIGRATION UTILITY FUNCTIONS
-- =============================================

-- Function to get listings with category (resolves ambiguous relationship)
CREATE OR REPLACE FUNCTION get_listings_with_category(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_category_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title VARCHAR(255),
    description TEXT,
    price DECIMAL(12,2),
    currency VARCHAR(3),
    category_id UUID,
    condition VARCHAR(20),
    quantity INTEGER,
    location VARCHAR(255),
    images JSONB,
    accept_offers BOOLEAN,
    status VARCHAR(20),
    views_count INTEGER,
    favorites_count INTEGER,
    boost_until TIMESTAMP WITH TIME ZONE,
    boost_score INTEGER,
    highlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    spotlight_category_id UUID,
    seo_title VARCHAR(300),
    keywords TEXT[],
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    category JSONB,
    profile JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.user_id,
        l.title,
        l.description,
        l.price,
        l.currency,
        l.category_id,
        l.condition,
        l.quantity,
        l.location,
        l.images,
        l.accept_offers,
        l.status,
        l.views_count,
        l.favorites_count,
        l.boost_until,
        l.boost_score,
        l.highlight_until,
        l.urgent_until,
        l.spotlight_until,
        l.spotlight_category_id,
        l.seo_title,
        l.keywords,
        l.attributes,
        l.created_at,
        l.updated_at,
        jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'icon', c.icon,
            'parent_id', c.parent_id,
            'is_active', c.is_active,
            'sort_order', c.sort_order
        ) as category,
        jsonb_build_object(
            'id', p.id,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'full_name', p.full_name,
            'username', p.username,
            'avatar_url', p.avatar_url,
            'location', p.location,
            'rating', p.rating,
            'total_sales', p.total_sales,
            'is_verified', p.is_verified,
            'is_online', p.is_online,
            'last_seen', p.last_seen,
            'response_time', p.response_time
        ) as profile
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN profiles p ON l.user_id = p.id
    WHERE 
        (p_category_id IS NULL OR l.category_id = p_category_id)
        AND (p_user_id IS NULL OR l.user_id = p_user_id)
        AND l.status = p_status
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user transaction summary
CREATE OR REPLACE FUNCTION get_user_transaction_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    summary JSONB;
    credit_stats RECORD;
    transaction_stats RECORD;
    recent_transactions JSONB;
BEGIN
    -- Get credit statistics
    SELECT 
        COALESCE(balance, 0) as current_balance,
        COALESCE(lifetime_earned, 0) as total_earned,
        COALESCE(lifetime_spent, 0) as total_spent
    INTO credit_stats
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- Get transaction statistics
    SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN type = 'earned' THEN 1 END) as earned_count,
        COUNT(CASE WHEN type = 'spent' THEN 1 END) as spent_count,
        COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE 0 END), 0) as total_earned_amount,
        COALESCE(SUM(CASE WHEN type = 'spent' THEN amount ELSE 0 END), 0) as total_spent_amount
    INTO transaction_stats
    FROM credit_transactions
    WHERE user_id = p_user_id;
    
    -- Get recent transactions (last 10)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', type,
            'amount', amount,
            'balance_before', balance_before,
            'balance_after', balance_after,
            'reference_type', reference_type,
            'reference_id', reference_id,
            'metadata', metadata,
            'created_at', created_at
        ) ORDER BY created_at DESC
    )
    INTO recent_transactions
    FROM (
        SELECT *
        FROM credit_transactions
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
    ) recent;
    
    -- Build summary
    summary := jsonb_build_object(
        'credits', jsonb_build_object(
            'current_balance', COALESCE(credit_stats.current_balance, 0),
            'lifetime_earned', COALESCE(credit_stats.total_earned, 0),
            'lifetime_spent', COALESCE(credit_stats.total_spent, 0)
        ),
        'transactions', jsonb_build_object(
            'total_count', COALESCE(transaction_stats.total_transactions, 0),
            'earned_count', COALESCE(transaction_stats.earned_count, 0),
            'spent_count', COALESCE(transaction_stats.spent_count, 0),
            'total_earned_amount', COALESCE(transaction_stats.total_earned_amount, 0),
            'total_spent_amount', COALESCE(transaction_stats.total_spent_amount, 0)
        ),
        'recent_transactions', COALESCE(recent_transactions, '[]'::jsonb)
    );
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user trust metrics
CREATE OR REPLACE FUNCTION get_user_trust_metrics(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    trust_metrics JSONB;
    profile_data RECORD;
    verification_score INTEGER := 0;
    activity_score INTEGER := 0;
    reputation_score INTEGER := 0;
    total_score INTEGER := 0;
BEGIN
    -- Get user profile data
    SELECT 
        is_verified,
        verification_status,
        rating,
        total_sales,
        total_reviews,
        created_at
    INTO profile_data
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', 'User not found'
        );
    END IF;
    
    -- Calculate verification score (0-30 points)
    IF profile_data.is_verified THEN
        verification_score := verification_score + 20;
    END IF;
    
    IF profile_data.verification_status = 'verified' THEN
        verification_score := verification_score + 10;
    END IF;
    
    -- Calculate activity score (0-40 points)
    activity_score := LEAST(40, profile_data.total_sales * 2);
    
    -- Calculate reputation score (0-30 points)
    IF profile_data.rating > 0 THEN
        reputation_score := LEAST(30, ROUND(profile_data.rating * 6)::INTEGER);
    END IF;
    
    -- Calculate total trust score
    total_score := verification_score + activity_score + reputation_score;
    
    -- Build trust metrics response
    trust_metrics := jsonb_build_object(
        'total_score', total_score,
        'verification_score', verification_score,
        'activity_score', activity_score,
        'reputation_score', reputation_score,
        'trust_level', CASE 
            WHEN total_score >= 80 THEN 'excellent'
            WHEN total_score >= 60 THEN 'good'
            WHEN total_score >= 40 THEN 'fair'
            WHEN total_score >= 20 THEN 'poor'
            ELSE 'new'
        END,
        'metrics', jsonb_build_object(
            'is_verified', profile_data.is_verified,
            'verification_status', profile_data.verification_status,
            'rating', profile_data.rating,
            'total_sales', profile_data.total_sales,
            'total_reviews', profile_data.total_reviews,
            'account_age_days', EXTRACT(DAYS FROM (NOW() - profile_data.created_at))
        )
    );
    
    RETURN trust_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize payment (fallback for Edge Function)
CREATE OR REPLACE FUNCTION initialize_payment(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_reference_type VARCHAR(50),
    p_currency VARCHAR(3) DEFAULT 'GHS',
    p_payment_method VARCHAR(50) DEFAULT 'mobile_money',
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    payment_id UUID;
    payment_reference VARCHAR(100);
    result JSONB;
BEGIN
    -- Generate payment ID and reference
    payment_id := uuid_generate_v4();
    payment_reference := 'PAY_' || UPPER(SUBSTRING(MD5(payment_id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 12));
    
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid amount'
        );
    END IF;
    
    -- Create payment record
    BEGIN
        INSERT INTO payments (
            id,
            user_id,
            amount,
            currency,
            payment_method,
            reference,
            status,
            reference_type,
            reference_id,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            payment_id,
            p_user_id,
            p_amount,
            p_currency,
            p_payment_method,
            payment_reference,
            'pending',
            p_reference_type,
            p_reference_id,
            p_metadata,
            NOW(),
            NOW()
        );
        
        -- Build success response
        result := jsonb_build_object(
            'success', true,
            'payment_id', payment_id,
            'reference', payment_reference,
            'amount', p_amount,
            'currency', p_currency,
            'payment_method', p_payment_method,
            'status', 'pending',
            'message', 'Payment initialized successfully'
        );
        
        -- Add payment method specific instructions
        CASE p_payment_method
            WHEN 'mobile_money' THEN
                result := result || jsonb_build_object(
                    'instructions', 'Please complete payment using your mobile money service',
                    'next_step', 'mobile_money_prompt',
                    'provider_details', jsonb_build_object(
                        'mtn', jsonb_build_object('code', '*170#', 'name', 'MTN Mobile Money'),
                        'vodafone', jsonb_build_object('code', '*110#', 'name', 'Vodafone Cash'),
                        'airteltigo', jsonb_build_object('code', '*185#', 'name', 'AirtelTigo Money')
                    )
                );
            WHEN 'bank_transfer' THEN
                result := result || jsonb_build_object(
                    'instructions', 'Please transfer the amount to the provided bank details',
                    'next_step', 'bank_details',
                    'bank_details', jsonb_build_object(
                        'account_name', 'Sellar Ghana Ltd',
                        'account_number', '1234567890',
                        'bank', 'GCB Bank',
                        'branch', 'Accra Main'
                    )
                );
            WHEN 'card' THEN
                result := result || jsonb_build_object(
                    'instructions', 'Please complete card payment',
                    'next_step', 'card_form',
                    'supported_cards', jsonb_build_array('visa', 'mastercard', 'verve')
                );
            ELSE
                result := result || jsonb_build_object(
                    'instructions', 'Please complete payment using the selected method',
                    'next_step', 'payment_confirmation'
                );
        END CASE;
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to initialize payment: ' || SQLERRM
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process payment completion
CREATE OR REPLACE FUNCTION complete_payment(
    p_payment_id UUID,
    p_transaction_reference VARCHAR(255),
    p_status VARCHAR(50) DEFAULT 'completed',
    p_gateway_response JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    payment_record RECORD;
    result JSONB;
BEGIN
    -- Get payment record
    SELECT * INTO payment_record
    FROM payments
    WHERE id = p_payment_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment not found'
        );
    END IF;
    
    -- Check if payment is already processed
    IF payment_record.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payment already processed',
            'current_status', payment_record.status
        );
    END IF;
    
    -- Update payment status
    UPDATE payments
    SET 
        status = p_status,
        transaction_reference = p_transaction_reference,
        gateway_response = p_gateway_response,
        completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    -- Process successful payment
    IF p_status = 'completed' THEN
        -- Handle different reference types
        CASE payment_record.reference_type
            WHEN 'credit_purchase' THEN
                -- Award credits to user
                PERFORM award_credits_from_payment(payment_record.user_id, payment_record.amount, p_payment_id);
            WHEN 'subscription' THEN
                -- Log subscription payment (subscription activation handled elsewhere)
                RAISE NOTICE 'Subscription payment completed for user %', payment_record.user_id;
            WHEN 'feature_purchase' THEN
                -- Log feature payment (feature activation handled elsewhere)
                RAISE NOTICE 'Feature payment completed for user %', payment_record.user_id;
            ELSE
                -- Log unknown reference type
                RAISE NOTICE 'Unknown payment reference type: %', payment_record.reference_type;
        END CASE;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'status', p_status,
        'message', 'Payment processed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Failed to process payment: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to award credits from payment
CREATE OR REPLACE FUNCTION award_credits_from_payment(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_id UUID
)
RETURNS VOID AS $$
DECLARE
    credits_to_award INTEGER;
    current_balance INTEGER;
BEGIN
    -- Calculate credits based on amount (1 GHS = 10 credits)
    credits_to_award := (p_amount * 10)::INTEGER;
    
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO current_balance
    FROM user_credits WHERE user_id = p_user_id;
    
    -- Create credits record if it doesn't exist
    INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Award credits
    UPDATE user_credits
    SET 
        balance = balance + credits_to_award,
        lifetime_earned = lifetime_earned + credits_to_award,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after,
        reference_id, reference_type, metadata
    )
    VALUES (
        p_user_id, 'earned', credits_to_award, current_balance, current_balance + credits_to_award,
        p_payment_id, 'payment_purchase',
        jsonb_build_object('payment_amount', p_amount, 'conversion_rate', 10)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_ticket_number VARCHAR(20);
    counter INTEGER;
    date_prefix VARCHAR(8);
BEGIN
    -- Generate date prefix (YYYYMMDD)
    date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get count of tickets created today
    SELECT COUNT(*) + 1 INTO counter
    FROM support_tickets
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Generate ticket number: TKT-YYYYMMDD-XXXX
    new_ticket_number := 'TKT-' || date_prefix || '-' || LPAD(counter::TEXT, 4, '0');
    
    -- Ensure uniqueness (in case of race conditions)
    WHILE EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.ticket_number = new_ticket_number) LOOP
        counter := counter + 1;
        new_ticket_number := 'TKT-' || date_prefix || '-' || LPAD(counter::TEXT, 4, '0');
    END LOOP;
    
    RETURN new_ticket_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create support ticket
CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id UUID,
    p_subject VARCHAR(255),
    p_description TEXT,
    p_category VARCHAR(50),
    p_priority VARCHAR(20) DEFAULT 'medium',
    p_attachments JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_app_version VARCHAR(20) DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}'::jsonb,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    ticket_id UUID;
    generated_ticket_number VARCHAR(20);
    result JSONB;
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Validate category
    IF p_category NOT IN ('technical', 'billing', 'account', 'feature_request', 'bug_report', 'general') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid category'
        );
    END IF;
    
    -- Validate priority
    IF p_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid priority'
        );
    END IF;
    
    -- Generate ticket number
    generated_ticket_number := generate_ticket_number();
    
    -- Create ticket
    BEGIN
        INSERT INTO support_tickets (
            user_id,
            subject,
            description,
            category,
            priority,
            status,
            attachments,
            metadata,
            app_version,
            device_info,
            ticket_number,
            user_agent,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            p_subject,
            p_description,
            p_category,
            p_priority,
            'open',
            p_attachments,
            p_metadata,
            p_app_version,
            p_device_info,
            generated_ticket_number,
            p_user_agent,
            NOW(),
            NOW()
        ) RETURNING id INTO ticket_id;
        
        -- Create initial message
        INSERT INTO support_ticket_messages (
            ticket_id,
            user_id,
            message,
            is_staff_response,
            attachments,
            created_at
        ) VALUES (
            ticket_id,
            p_user_id,
            p_description,
            false,
            p_attachments,
            NOW()
        );
        
        -- Build success response
        result := jsonb_build_object(
            'success', true,
            'ticket_id', ticket_id,
            'ticket_number', generated_ticket_number,
            'status', 'open',
            'message', 'Support ticket created successfully'
        );
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to create support ticket: ' || SQLERRM
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user support tickets
CREATE OR REPLACE FUNCTION get_user_support_tickets(
    p_user_id UUID,
    p_status VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    subject VARCHAR(255),
    description TEXT,
    category VARCHAR(50),
    priority VARCHAR(20),
    status VARCHAR(20),
    ticket_number VARCHAR(20),
    assigned_to_name TEXT,
    message_count INTEGER,
    last_message_at TIMESTAMP WITH TIME ZONE,
    app_version VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.subject,
        st.description,
        st.category,
        st.priority,
        st.status,
        st.ticket_number,
        COALESCE(p.first_name || ' ' || p.last_name, 'Unassigned') as assigned_to_name,
        (
            SELECT COUNT(*)::INTEGER 
            FROM support_ticket_messages stm 
            WHERE stm.ticket_id = st.id
        ) as message_count,
        COALESCE(
            (SELECT MAX(stm.created_at) 
             FROM support_ticket_messages stm 
             WHERE stm.ticket_id = st.id),
            st.created_at
        ) as last_message_at,
        st.app_version,
        st.created_at,
        st.updated_at,
        st.resolved_at
    FROM support_tickets st
    LEFT JOIN profiles p ON st.assigned_to = p.id
    WHERE st.user_id = p_user_id
    AND (p_status IS NULL OR st.status = p_status)
    ORDER BY st.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add message to support ticket
CREATE OR REPLACE FUNCTION add_support_ticket_message(
    p_ticket_id UUID,
    p_user_id UUID,
    p_message TEXT,
    p_is_staff_response BOOLEAN DEFAULT false,
    p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    message_id UUID;
    ticket_exists BOOLEAN;
BEGIN
    -- Check if ticket exists and user has access
    SELECT EXISTS(
        SELECT 1 FROM support_tickets 
        WHERE id = p_ticket_id 
        AND (user_id = p_user_id OR p_is_staff_response = true)
    ) INTO ticket_exists;
    
    IF NOT ticket_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ticket not found or access denied'
        );
    END IF;
    
    -- Add message
    BEGIN
        INSERT INTO support_ticket_messages (
            ticket_id,
            user_id,
            message,
            is_staff_response,
            attachments,
            created_at
        ) VALUES (
            p_ticket_id,
            p_user_id,
            p_message,
            p_is_staff_response,
            p_attachments,
            NOW()
        ) RETURNING id INTO message_id;
        
        -- Update ticket timestamp
        UPDATE support_tickets 
        SET updated_at = NOW()
        WHERE id = p_ticket_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message_id', message_id,
            'message', 'Message added successfully'
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to add message: ' || SQLERRM
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix existing users who don't have profiles
CREATE OR REPLACE FUNCTION fix_missing_user_profiles()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    status TEXT,
    message TEXT
) AS $$
DECLARE
    auth_user RECORD;
    result_status TEXT;
    result_message TEXT;
BEGIN
    -- Loop through all authenticated users who don't have profiles
    FOR auth_user IN 
        SELECT au.* 
        FROM auth.users au 
        LEFT JOIN profiles p ON au.id = p.id 
        WHERE p.id IS NULL
    LOOP
        BEGIN
            -- Use the ensure_user_profile function to create the profile
            PERFORM ensure_user_profile(auth_user.id);
            
            result_status := 'SUCCESS';
            result_message := 'Profile created successfully';
            
        EXCEPTION
            WHEN OTHERS THEN
                result_status := 'ERROR';
                result_message := SQLERRM;
        END;
        
        -- Return the result for this user
        RETURN QUERY SELECT 
            auth_user.id,
            auth_user.email,
            result_status,
            result_message;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- KNOWLEDGE BASE FUNCTIONS
-- =============================================

-- Function to get published knowledge base articles
CREATE OR REPLACE FUNCTION get_kb_articles(
    p_category VARCHAR DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    content TEXT,
    excerpt TEXT,
    category VARCHAR,
    tags TEXT[],
    author_id UUID,
    view_count INTEGER,
    helpful_count INTEGER,
    not_helpful_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kb.id,
        kb.title,
        kb.slug,
        kb.content,
        kb.excerpt,
        kb.category,
        kb.tags,
        kb.author_id,
        kb.view_count,
        kb.helpful_count,
        kb.not_helpful_count,
        kb.created_at,
        kb.updated_at,
        kb.published_at
    FROM kb_articles kb
    WHERE 
        kb.is_published = true
        AND (p_category IS NULL OR kb.category = p_category)
        AND (p_search_term IS NULL OR 
             kb.search_vector @@ plainto_tsquery('english', p_search_term) OR
             kb.title ILIKE '%' || p_search_term || '%' OR
             kb.content ILIKE '%' || p_search_term || '%')
    ORDER BY 
        CASE WHEN p_search_term IS NOT NULL THEN
            ts_rank(kb.search_vector, plainto_tsquery('english', p_search_term))
        ELSE 0 END DESC,
        kb.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get FAQ items
CREATE OR REPLACE FUNCTION get_faq_items(
    p_category VARCHAR DEFAULT NULL,
    p_featured_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    question TEXT,
    answer TEXT,
    category VARCHAR,
    order_index INTEGER,
    is_featured BOOLEAN,
    view_count INTEGER,
    helpful_count INTEGER,
    not_helpful_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        faq.id,
        faq.question,
        faq.answer,
        faq.category,
        faq.order_index,
        faq.is_featured,
        faq.view_count,
        faq.helpful_count,
        faq.not_helpful_count,
        faq.created_at,
        faq.updated_at
    FROM faq_items faq
    WHERE 
        (p_category IS NULL OR faq.category = p_category)
        AND (p_featured_only = FALSE OR faq.is_featured = TRUE)
    ORDER BY 
        faq.order_index ASC,
        faq.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment article view count
CREATE OR REPLACE FUNCTION increment_article_views(p_article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE kb_articles 
    SET view_count = view_count + 1,
        updated_at = now()
    WHERE id = p_article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment FAQ view count
CREATE OR REPLACE FUNCTION increment_faq_views(p_faq_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE faq_items 
    SET view_count = view_count + 1,
        updated_at = now()
    WHERE id = p_faq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update search vector for articles
CREATE OR REPLACE FUNCTION update_kb_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
CREATE TRIGGER update_kb_article_search_vector_trigger
    BEFORE INSERT OR UPDATE ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_kb_article_search_vector();

-- =============================================
-- ACCOUNT DELETION FUNCTIONS
-- =============================================

-- Function to request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    deletion_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RETURN QUERY SELECT false, 'User not found', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if there's already a pending deletion request
    IF EXISTS (
        SELECT 1 FROM data_deletion_requests 
        WHERE user_id = p_user_id AND status IN ('pending', 'processing')
    ) THEN
        RETURN QUERY SELECT false, 'Account deletion already requested', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Set deletion date (30 days from now)
    deletion_date := NOW() + INTERVAL '30 days';
    
    -- Create deletion request
    INSERT INTO data_deletion_requests (
        user_id,
        reason,
        scheduled_for
    ) VALUES (
        p_user_id,
        p_reason,
        deletion_date
    );
    
    -- Mark account as pending deletion to prevent login
    UPDATE profiles 
    SET 
        account_status = 'pending_deletion',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT true, 'Account deletion scheduled successfully', deletion_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel account deletion
CREATE OR REPLACE FUNCTION cancel_account_deletion(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    -- Update the deletion request status to cancelled
    UPDATE data_deletion_requests 
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE 
        user_id = p_user_id 
        AND status IN ('pending', 'processing');
    
    IF FOUND THEN
        -- Restore account status to active
        UPDATE profiles 
        SET 
            account_status = 'active',
            updated_at = NOW()
        WHERE id = p_user_id;
        
        RETURN QUERY SELECT true, 'Account deletion cancelled successfully';
    ELSE
        RETURN QUERY SELECT false, 'No pending deletion request found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user deletion requests
CREATE OR REPLACE FUNCTION get_user_deletion_requests(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    reason TEXT,
    status VARCHAR,
    requested_at TIMESTAMP WITH TIME ZONE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.reason,
        dr.status,
        dr.requested_at,
        dr.scheduled_for,
        dr.processed_at
    FROM data_deletion_requests dr
    WHERE dr.user_id = p_user_id
    ORDER BY dr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize user data (for GDPR compliance)
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update profile with anonymized data
    UPDATE profiles SET
        first_name = 'Deleted',
        last_name = 'User',
        phone = NULL,
        avatar_url = NULL,
        bio = NULL,
        location = NULL,
        date_of_birth = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Anonymize messages (keep for conversation context but remove personal info)
    UPDATE messages SET
        content = '[Message deleted by user]',
        updated_at = NOW()
    WHERE sender_id = p_user_id;
    
    -- Anonymize reviews (keep for business integrity but remove personal info)
    UPDATE reviews SET
        comment = '[Review deleted by user]',
        updated_at = NOW()
    WHERE reviewer_id = p_user_id;
    
    -- Delete personal notifications
    DELETE FROM notifications WHERE user_id = p_user_id;
    
    -- Delete user settings
    DELETE FROM user_settings WHERE user_id = p_user_id;
    
    -- Delete favorites
    DELETE FROM favorites WHERE user_id = p_user_id;
    
    -- Delete follows
    DELETE FROM follows WHERE follower_id = p_user_id OR following_id = p_user_id;
    
    -- Delete likes
    DELETE FROM likes WHERE user_id = p_user_id;
    
    -- Delete shares
    DELETE FROM shares WHERE user_id = p_user_id;
    
    -- Delete listing views
    DELETE FROM listing_views WHERE user_id = p_user_id;
    
    -- Delete search analytics
    DELETE FROM search_analytics WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process account deletion (called by admin or scheduled job)
CREATE OR REPLACE FUNCTION process_account_deletion(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    deletion_request_id UUID;
BEGIN
    -- Check if there's a pending deletion request
    SELECT id INTO deletion_request_id
    FROM data_deletion_requests 
    WHERE user_id = p_user_id AND status = 'pending'
    AND scheduled_for <= NOW();
    
    IF deletion_request_id IS NULL THEN
        RETURN QUERY SELECT false, 'No eligible deletion request found';
        RETURN;
    END IF;
    
    -- Update status to processing
    UPDATE data_deletion_requests 
    SET status = 'processing', updated_at = NOW()
    WHERE id = deletion_request_id;
    
    BEGIN
        -- Anonymize user data
        PERFORM anonymize_user_data(p_user_id);
        
        -- Mark deletion as completed
        UPDATE data_deletion_requests 
        SET 
            status = 'completed',
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = deletion_request_id;
        
        RETURN QUERY SELECT true, 'Account deletion processed successfully';
        
    EXCEPTION WHEN OTHERS THEN
        -- Mark deletion as failed
        UPDATE data_deletion_requests 
        SET 
            status = 'failed',
            updated_at = NOW()
        WHERE id = deletion_request_id;
        
        RETURN QUERY SELECT false, 'Account deletion failed: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can login (not pending deletion)
CREATE OR REPLACE FUNCTION check_user_login_status(p_user_id UUID)
RETURNS TABLE (
    can_login BOOLEAN,
    account_status VARCHAR,
    message TEXT,
    deletion_scheduled_for TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    user_status VARCHAR;
    deletion_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user account status with qualified column name
    SELECT profiles.account_status INTO user_status
    FROM profiles 
    WHERE profiles.id = p_user_id;
    
    -- If user not found
    IF user_status IS NULL THEN
        RETURN QUERY SELECT false, 'not_found'::VARCHAR, 'User account not found', NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if account is pending deletion
    IF user_status = 'pending_deletion' THEN
        -- Get deletion scheduled date
        SELECT scheduled_for INTO deletion_date
        FROM data_deletion_requests 
        WHERE user_id = p_user_id AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1;
        
        RETURN QUERY SELECT 
            false, 
            user_status, 
            'Account is scheduled for deletion. Contact support to cancel deletion request.',
            deletion_date;
        RETURN;
    END IF;
    
    -- Check if account is suspended
    IF user_status = 'suspended' THEN
        RETURN QUERY SELECT 
            false, 
            user_status, 
            'Account is suspended. Contact support for assistance.',
            NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if account is deleted
    IF user_status = 'deleted' THEN
        RETURN QUERY SELECT 
            false, 
            user_status, 
            'Account has been deleted.',
            NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Account is active
    RETURN QUERY SELECT 
        true, 
        user_status, 
        'Account is active',
        NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email can be used for signup (not pending deletion)
CREATE OR REPLACE FUNCTION check_email_signup_eligibility(p_email TEXT)
RETURNS TABLE (
    can_signup BOOLEAN,
    message TEXT,
    existing_user_id UUID,
    account_status VARCHAR,
    deletion_scheduled_for TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    existing_user_record RECORD;
    deletion_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if there's an existing user with this email
    SELECT au.id, au.email, profiles.account_status
    INTO existing_user_record
    FROM auth.users au
    LEFT JOIN profiles ON au.id = profiles.id
    WHERE au.email = p_email;
    
    -- If no existing user, signup is allowed
    IF existing_user_record IS NULL THEN
        RETURN QUERY SELECT 
            true, 
            'Email available for signup',
            NULL::UUID,
            NULL::VARCHAR,
            NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- If user exists but account is pending deletion
    IF existing_user_record.account_status = 'pending_deletion' THEN
        -- Get deletion scheduled date
        SELECT scheduled_for INTO deletion_date
        FROM data_deletion_requests 
        WHERE user_id = existing_user_record.id AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1;
        
        RETURN QUERY SELECT 
            false,
            'An account with this email is scheduled for deletion. Please wait for the deletion to complete or contact support to cancel the deletion request.',
            existing_user_record.id,
            existing_user_record.account_status,
            deletion_date;
        RETURN;
    END IF;
    
    -- If user exists and account is deleted, allow signup (reuse email)
    IF existing_user_record.account_status = 'deleted' THEN
        RETURN QUERY SELECT 
            true,
            'Previous account was deleted, email available for signup',
            existing_user_record.id,
            existing_user_record.account_status,
            NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- If user exists and account is active or suspended
    RETURN QUERY SELECT 
        false,
        'An account with this email already exists. Please sign in instead.',
        existing_user_record.id,
        existing_user_record.account_status,
        NULL::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIXES FOR AMBIGUOUS COLUMNS AND MISSING PROFILES
-- =============================================

-- Create the missing function to fix users without profiles
CREATE OR REPLACE FUNCTION fix_missing_user_profiles()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    profile_created BOOLEAN,
    message TEXT
) AS $$
DECLARE
    user_record RECORD;
    profile_created_count INTEGER := 0;
BEGIN
    -- Find auth users without profiles
    FOR user_record IN 
        SELECT au.id, au.email::TEXT as email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.id
        WHERE p.id IS NULL
        AND au.email_confirmed_at IS NOT NULL
    LOOP
        BEGIN
            -- Create profile for this user
            PERFORM ensure_user_profile(user_record.id);
            
            profile_created_count := profile_created_count + 1;
            
            RETURN QUERY SELECT 
                user_record.id,
                user_record.email,
                true,
                'Profile created successfully'::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                user_record.id,
                user_record.email,
                false,
                ('Error creating profile: ' || SQLERRM)::TEXT;
        END;
    END LOOP;
    
    -- If no users found, return a summary message
    IF profile_created_count = 0 THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            'No missing profiles found'::TEXT,
            true,
            'All verified users already have profiles'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FEATURE PURCHASES UTILITY FUNCTIONS
-- =============================================

-- Function to get user's active features
CREATE OR REPLACE FUNCTION get_user_active_features(
    p_user_id UUID,
    p_listing_id UUID DEFAULT NULL
)
RETURNS TABLE (
    feature_key VARCHAR(100),
    feature_name VARCHAR(200),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    credits_spent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fp.feature_key,
        fp.feature_name,
        fp.activated_at,
        fp.expires_at,
        fp.credits_spent
    FROM feature_purchases fp
    WHERE fp.user_id = p_user_id
    AND fp.status = 'active'
    AND (p_listing_id IS NULL OR fp.listing_id = p_listing_id OR fp.listing_id IS NULL)
    AND (fp.expires_at IS NULL OR fp.expires_at > NOW())
    ORDER BY fp.activated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUBSCRIPTION CANCELLATION FUNCTION
-- =============================================

-- Function to cancel user subscription (bypasses RLS)
CREATE OR REPLACE FUNCTION cancel_user_subscription(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS JSONB AS $$
DECLARE
    subscription_record RECORD;
    result JSONB;
BEGIN
    -- Verify the subscription exists and belongs to the user
    SELECT * INTO subscription_record
    FROM user_subscriptions
    WHERE id = p_subscription_id
    AND user_id = p_user_id
    AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Active subscription not found for user'
        );
    END IF;

    -- Update the subscription status
    UPDATE user_subscriptions
    SET 
        status = 'cancelled',
        auto_renew = false,
        updated_at = NOW()
    WHERE id = p_subscription_id
    AND user_id = p_user_id
    AND status = 'active';

    -- Check if the update was successful
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Subscription cancelled successfully',
            'subscription_id', p_subscription_id,
            'cancelled_at', NOW()
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'error', 'Failed to update subscription'
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cancel_user_subscription(UUID, UUID) TO authenticated;
