-- =============================================
-- CHECK WHY CRON IS DEACTIVATING AUTO-REFRESH
-- =============================================

-- 1. Manually test the subscription check logic
DO $$
DECLARE
    v_user_id UUID;
    has_active_subscription BOOLEAN;
    has_active_boost BOOLEAN;
    listing_count INTEGER;
BEGIN
    -- Get the Sellar Pro user
    SELECT us.user_id INTO v_user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          TESTING SUBSCRIPTION LOGIC                       ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE '';
    
    -- Test 1: Check if user has active Sellar Pro subscription (EXACT SAME QUERY AS FUNCTION)
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = v_user_id
        AND us.status = 'active'
        AND sp.name = 'Sellar Pro'
        AND us.current_period_end > NOW()
    ) INTO has_active_subscription;
    
    RAISE NOTICE '📋 Subscription Check Results:';
    RAISE NOTICE '   • User ID: %', v_user_id;
    RAISE NOTICE '   • Has Active Subscription: %', has_active_subscription;
    
    IF NOT has_active_subscription THEN
        RAISE NOTICE '   ❌ PROBLEM: Subscription check FAILED!';
        
        -- Debug: Show what the query sees
        RAISE NOTICE '';
        RAISE NOTICE '🔍 Debugging subscription query:';
        
        FOR listing_count IN
            SELECT 
                us.user_id,
                us.status,
                sp.name,
                us.current_period_end,
                us.current_period_end > NOW() as is_future
            FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = v_user_id
        LOOP
            NULL; -- Results will be shown by RAISE NOTICE below
        END LOOP;
    ELSE
        RAISE NOTICE '   ✅ Subscription check PASSED';
    END IF;
    
    RAISE NOTICE '';
    
    -- Test 2: Check for active boosts on each listing
    RAISE NOTICE '📋 Checking for active boosts on listings:';
    
    FOR listing_count IN 1..3 LOOP
        -- Sample 3 listings
        DECLARE
            test_listing_id UUID;
            listing_title TEXT;
        BEGIN
            SELECT l.id, l.title INTO test_listing_id, listing_title
            FROM listings l
            WHERE l.user_id = v_user_id
            AND l.status = 'active'
            ORDER BY l.created_at DESC
            OFFSET listing_count - 1
            LIMIT 1;
            
            IF test_listing_id IS NULL THEN
                EXIT;
            END IF;
            
            SELECT EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = test_listing_id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) INTO has_active_boost;
            
            RAISE NOTICE '   • Listing % (%): Boost = %', 
                listing_count, 
                SUBSTRING(listing_title FROM 1 FOR 30),
                has_active_boost;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- Final verdict
    IF has_active_subscription THEN
        RAISE NOTICE '✅ VERDICT: Auto-refresh SHOULD STAY ENABLED';
        RAISE NOTICE '   (User has active Sellar Pro subscription)';
    ELSE
        RAISE NOTICE '❌ VERDICT: Auto-refresh WILL BE DEACTIVATED';
        RAISE NOTICE '   (Subscription check failed - this is the bug!)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- 2. Show current subscription details (raw data)
SELECT 
    '=== RAW SUBSCRIPTION DATA ===' as section,
    us.id,
    us.user_id,
    us.plan_id,
    sp.name as plan_name,
    us.status,
    us.current_period_start,
    us.current_period_end,
    NOW() as current_time,
    us.current_period_end > NOW() as is_valid,
    us.auto_renew,
    us.is_trial
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE sp.name = 'Sellar Pro';

-- 3. Check recent cron job runs
SELECT 
    '=== RECENT CRON RUNS ===' as section,
    runid,
    jobid,
    start_time,
    end_time,
    status,
    return_message,
    EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details
WHERE jobid = (
    SELECT jobid FROM cron.job 
    WHERE jobname = 'auto-refresh-business-listings'
)
ORDER BY start_time DESC
LIMIT 5;

-- 4. Manually run the auto-refresh function to see what happens
SELECT 
    '=== MANUAL FUNCTION TEST ===' as section,
    processed_count,
    error_count,
    deactivated_count
FROM process_business_auto_refresh();

-- 5. Check status after function ran
SELECT 
    '=== STATUS AFTER FUNCTION ===' as section,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as enabled,
    COUNT(*) FILTER (WHERE is_active = false) as disabled
FROM business_auto_refresh
WHERE user_id IN (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
);

