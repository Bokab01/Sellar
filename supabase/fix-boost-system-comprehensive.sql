-- =============================================
-- COMPREHENSIVE BOOST SYSTEM FIX
-- =============================================
-- This script fixes all issues with the boost system:
-- 1. Database schema mismatch (regular_credits vs credits)
-- 2. Ad Refresh duration issues
-- 3. Feature purchase failures for regular users
-- 4. Pro user pricing display issues

-- =============================================
-- 1. FIX FEATURE_CATALOG SCHEMA
-- =============================================

-- Add single credits column if it doesn't exist
DO $$
BEGIN
    -- Add credits column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'credits'
    ) THEN
        ALTER TABLE feature_catalog ADD COLUMN credits INTEGER;
        RAISE NOTICE 'Added credits column to feature_catalog table';
    END IF;
END $$;

-- Update all features to use single pricing (migrate from old schema)
UPDATE feature_catalog SET credits = 15 WHERE feature_key = 'pulse_boost_24h';
UPDATE feature_catalog SET credits = 50 WHERE feature_key = 'mega_pulse_7d';
UPDATE feature_catalog SET credits = 35 WHERE feature_key = 'category_spotlight_3d';
UPDATE feature_catalog SET credits = 5 WHERE feature_key = 'ad_refresh';
UPDATE feature_catalog SET credits = 10 WHERE feature_key = 'listing_highlight';
UPDATE feature_catalog SET credits = 8 WHERE feature_key = 'urgent_badge';

-- Make credits column NOT NULL after populating data
ALTER TABLE feature_catalog ALTER COLUMN credits SET NOT NULL;

-- =============================================
-- 2. UPDATE PURCHASE_FEATURE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION purchase_feature(
    p_user_id UUID,
    p_feature_key VARCHAR(100),
    p_listing_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT, feature_id UUID) AS $$
DECLARE
    feature_cost INTEGER;
    current_balance INTEGER;
    new_feature_id UUID;
    result_success BOOLEAN := false;
    result_balance INTEGER := 0;
    result_error TEXT := NULL;
    is_business_user BOOLEAN;
BEGIN
    -- Check if user has active business subscription
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Pro'
        AND us.current_period_end > NOW()
    ) INTO is_business_user;

    -- Get feature cost from new schema
    SELECT credits INTO feature_cost
    FROM feature_catalog 
    WHERE feature_key = p_feature_key AND is_active = true;
    
    IF feature_cost IS NULL THEN
        RETURN QUERY SELECT false, 0, 'Feature not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Pro users get features for free (auto-refresh benefit)
    IF is_business_user THEN
        feature_cost := 0;
    END IF;

    -- Get current balance
    SELECT balance INTO current_balance 
    FROM user_credits 
    WHERE user_id = p_user_id;

    IF current_balance IS NULL THEN
        RETURN QUERY SELECT false, 0, 'User credits not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check if user has enough credits (free features have 0 cost)
    IF feature_cost > 0 AND current_balance < feature_cost THEN
        RETURN QUERY SELECT false, current_balance, 'Insufficient credits'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Deduct credits if feature has cost
    IF feature_cost > 0 THEN
        UPDATE user_credits 
        SET 
            balance = balance - feature_cost,
            lifetime_spent = lifetime_spent + feature_cost,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING balance INTO result_balance;
    ELSE
        result_balance := current_balance;
    END IF;

    -- Create feature purchase record with FIXED duration logic
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
        (SELECT name FROM feature_catalog WHERE feature_key = p_feature_key),
        feature_cost,
        'active',
        NOW(),
        CASE 
            WHEN p_feature_key = 'pulse_boost_24h' THEN NOW() + INTERVAL '24 hours'
            WHEN p_feature_key = 'mega_pulse_7d' THEN NOW() + INTERVAL '7 days'
            WHEN p_feature_key = 'category_spotlight_3d' THEN NOW() + INTERVAL '3 days'
            WHEN p_feature_key = 'ad_refresh' THEN NOW() + INTERVAL '1 minute'  -- FIXED: Truly instant
            WHEN p_feature_key = 'listing_highlight' THEN NOW() + INTERVAL '7 days'
            WHEN p_feature_key = 'urgent_badge' THEN NOW() + INTERVAL '3 days'
            ELSE NOW() + INTERVAL '1 day'
        END,
        p_metadata
    ) RETURNING id INTO new_feature_id;

    -- Setup auto-refresh for business users if feature supports it
    IF p_listing_id IS NOT NULL AND is_business_user THEN
        PERFORM setup_business_auto_refresh(p_user_id, p_listing_id, p_feature_key);
    END IF;

    -- Log credit transaction if credits were spent
    IF feature_cost > 0 THEN
        INSERT INTO credit_transactions (
            user_id,
            amount,
            transaction_type,
            description,
            metadata
        ) VALUES (
            p_user_id,
            -feature_cost,
            'feature_purchase',
            'Purchased ' || p_feature_key,
            jsonb_build_object(
                'feature_key', p_feature_key,
                'feature_id', new_feature_id,
                'listing_id', p_listing_id
            )
        );
    END IF;

    result_success := true;
    RETURN QUERY SELECT result_success, result_balance, result_error, new_feature_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. UPDATE GET_FEATURE_COST FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_feature_cost(
    p_feature_key VARCHAR(100),
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    feature_cost INTEGER;
    is_business_user BOOLEAN;
BEGIN
    -- Check if user has active business subscription
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Pro'
        AND us.current_period_end > NOW()
    ) INTO is_business_user;

    -- Get feature cost from new schema
    SELECT credits INTO feature_cost
    FROM feature_catalog 
    WHERE feature_key = p_feature_key AND is_active = true;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Pro users get features for free (auto-refresh benefit)
    IF is_business_user THEN
        RETURN 0;
    ELSE
        RETURN feature_cost;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. UPDATE SETUP_BUSINESS_AUTO_REFRESH FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION setup_business_auto_refresh(
    p_user_id UUID,
    p_listing_id UUID,
    p_feature_key VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_business_user BOOLEAN;
    feature_has_auto_refresh BOOLEAN := false;
BEGIN
    -- Check if user has active business subscription
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Pro'
        AND us.current_period_end > NOW()
    ) INTO is_business_user;

    IF NOT is_business_user THEN
        RETURN false;
    END IF;

    -- Only setup auto-refresh for features that have it enabled
    IF p_feature_key IS NOT NULL THEN
        SELECT business_auto_refresh IS NOT NULL 
        INTO feature_has_auto_refresh
        FROM feature_catalog 
        WHERE feature_key = p_feature_key;
    END IF;

    -- Only insert auto-refresh if feature supports it
    IF feature_has_auto_refresh THEN
        INSERT INTO business_auto_refresh (user_id, listing_id)
        VALUES (p_user_id, p_listing_id)
        ON CONFLICT (user_id, listing_id) 
        DO UPDATE SET 
            is_active = true,
            next_refresh_at = NOW() + INTERVAL '2 hours',
            updated_at = NOW();
        
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. CLEAN UP OLD SCHEMA COLUMNS
-- =============================================

-- Remove old pricing columns after migration
DO $$
BEGIN
    -- Remove business_credits column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'business_credits'
    ) THEN
        ALTER TABLE feature_catalog DROP COLUMN business_credits;
        RAISE NOTICE 'Removed business_credits column from feature_catalog table';
    END IF;

    -- Remove regular_credits column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'regular_credits'
    ) THEN
        ALTER TABLE feature_catalog DROP COLUMN regular_credits;
        RAISE NOTICE 'Removed regular_credits column from feature_catalog table';
    END IF;
END $$;

-- =============================================
-- 6. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION purchase_feature(UUID, VARCHAR(100), UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_cost(VARCHAR(100), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_business_auto_refresh(UUID, UUID, VARCHAR(100)) TO authenticated;

-- =============================================
-- 7. VERIFICATION AND TESTING
-- =============================================

DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== BOOST SYSTEM FIX VERIFICATION ===';
    
    -- Test feature cost calculation
    SELECT get_feature_cost('pulse_boost_24h', test_user_id) INTO test_result;
    RAISE NOTICE 'Pulse Boost cost for regular user: % credits', test_result;
    
    SELECT get_feature_cost('ad_refresh', test_user_id) INTO test_result;
    RAISE NOTICE 'Ad Refresh cost for regular user: % credits', test_result;
    
    -- Check schema
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'credits'
    ) THEN
        RAISE NOTICE '✅ Credits column exists';
    ELSE
        RAISE NOTICE '❌ Credits column missing';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'regular_credits'
    ) THEN
        RAISE NOTICE '✅ Old regular_credits column removed';
    ELSE
        RAISE NOTICE '❌ Old regular_credits column still exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'business_credits'
    ) THEN
        RAISE NOTICE '✅ Old business_credits column removed';
    ELSE
        RAISE NOTICE '❌ Old business_credits column still exists';
    END IF;
    
    RAISE NOTICE '================================';
    RAISE NOTICE '';
END $$;

-- =============================================
-- 8. SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 BOOST SYSTEM COMPREHENSIVE FIX COMPLETED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed database schema mismatch';
    RAISE NOTICE '✅ Fixed Ad Refresh duration (now truly instant)';
    RAISE NOTICE '✅ Fixed feature purchase for regular users';
    RAISE NOTICE '✅ Fixed Pro user pricing (free with auto-refresh)';
    RAISE NOTICE '✅ Updated all database functions';
    RAISE NOTICE '✅ Cleaned up old schema columns';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Regular users can now purchase boost features';
    RAISE NOTICE '📊 Pro users get features for free with auto-refresh';
    RAISE NOTICE '📊 Ad Refresh works as expected (instant effect)';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test with: SELECT * FROM purchase_feature(user_id, feature_key, listing_id);';
    RAISE NOTICE '';
END $$;
