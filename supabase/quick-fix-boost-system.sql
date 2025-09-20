-- =============================================
-- QUICK FIX FOR BOOST SYSTEM
-- =============================================
-- This is a minimal fix script for immediate deployment
-- Fixes the most critical issues without major schema changes

-- =============================================
-- 1. FIX AD REFRESH DURATION
-- =============================================

-- Update purchase_feature function to fix Ad Refresh duration
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

    -- Get feature cost (use regular_credits for now, will be fixed in full migration)
    SELECT COALESCE(regular_credits, credits, 0) INTO feature_cost
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

    -- Create feature purchase record with FIXED Ad Refresh duration
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
-- 2. UPDATE GET_FEATURE_COST FUNCTION
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

    -- Get feature cost (use regular_credits for now, will be fixed in full migration)
    SELECT COALESCE(regular_credits, credits, 0) INTO feature_cost
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
-- 3. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION purchase_feature(UUID, VARCHAR(100), UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_cost(VARCHAR(100), UUID) TO authenticated;

-- =============================================
-- 4. SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 QUICK BOOST SYSTEM FIX APPLIED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed Ad Refresh duration (now truly instant)';
    RAISE NOTICE '✅ Fixed Pro user pricing (free with auto-refresh)';
    RAISE NOTICE '✅ Regular users can now purchase features';
    RAISE NOTICE '';
    RAISE NOTICE '📊 This is a quick fix. Run the comprehensive fix for full schema cleanup.';
    RAISE NOTICE '';
END $$;
