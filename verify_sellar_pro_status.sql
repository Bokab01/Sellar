-- =============================================
-- VERIFY SELLAR PRO AUTO-REFRESH STATUS
-- =============================================

-- 1. Check for Sellar Pro subscription plan
SELECT 
    '=== SELLAR PRO PLAN EXISTS ===' as check_section,
    id,
    name,
    description,
    created_at
FROM subscription_plans
WHERE name = 'Sellar Pro';

-- 2. Check for active Sellar Pro subscriptions
SELECT 
    '=== ACTIVE SELLAR PRO SUBSCRIPTIONS ===' as check_section,
    us.id,
    us.user_id,
    p.full_name,
    p.email,
    us.status,
    us.is_trial,
    us.current_period_end,
    CASE 
        WHEN us.current_period_end > NOW() THEN '✅ Active'
        ELSE '❌ Expired'
    END as subscription_status
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN profiles p ON us.user_id = p.id
WHERE sp.name = 'Sellar Pro'
ORDER BY us.created_at DESC
LIMIT 10;

-- 3. Check for active listings from Sellar Pro users
SELECT 
    '=== SELLAR PRO USER LISTINGS ===' as check_section,
    l.id as listing_id,
    l.title,
    l.status,
    l.user_id,
    p.full_name,
    l.created_at,
    l.updated_at
FROM listings l
JOIN user_subscriptions us ON l.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN profiles p ON l.user_id = p.id
WHERE sp.name = 'Sellar Pro'
AND us.status = 'active'
AND us.current_period_end > NOW()
ORDER BY l.created_at DESC
LIMIT 10;

-- 4. Check business_auto_refresh entries
SELECT 
    '=== AUTO-REFRESH SCHEDULES ===' as check_section,
    bar.id,
    bar.user_id,
    p.full_name,
    bar.listing_id,
    l.title as listing_title,
    bar.is_active,
    bar.last_refresh_at,
    bar.next_refresh_at,
    bar.refresh_interval_hours
FROM business_auto_refresh bar
LEFT JOIN profiles p ON bar.user_id = p.id
LEFT JOIN listings l ON bar.listing_id = l.id
ORDER BY bar.created_at DESC
LIMIT 10;

-- 5. Check cron job status
SELECT 
    '=== CRON JOB STATUS ===' as check_section,
    jobname,
    schedule,
    active,
    database,
    username
FROM cron.job
WHERE jobname = 'auto-refresh-business-listings';

-- 6. Summary counts
SELECT 
    '=== SUMMARY ===' as check_section,
    (SELECT COUNT(*) FROM subscription_plans WHERE name = 'Sellar Pro') as sellar_pro_plan_exists,
    (SELECT COUNT(*) FROM user_subscriptions us 
     JOIN subscription_plans sp ON us.plan_id = sp.id 
     WHERE sp.name = 'Sellar Pro' AND us.status = 'active' AND us.current_period_end > NOW()) as active_pro_users,
    (SELECT COUNT(*) FROM listings l
     JOIN user_subscriptions us ON l.user_id = us.user_id
     JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE sp.name = 'Sellar Pro' AND us.status = 'active' AND us.current_period_end > NOW() AND l.status = 'active') as active_pro_listings,
    (SELECT COUNT(*) FROM business_auto_refresh WHERE is_active = true) as active_auto_refresh_schedules,
    (SELECT COUNT(*) FROM cron.job WHERE jobname = 'auto-refresh-business-listings') as cron_job_exists;

-- 7. What needs to happen?
DO $$
DECLARE
    pro_plan_exists BOOLEAN;
    active_pro_users INTEGER;
    active_listings INTEGER;
    auto_refresh_schedules INTEGER;
    cron_exists BOOLEAN;
BEGIN
    -- Check if Sellar Pro plan exists
    SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE name = 'Sellar Pro') 
    INTO pro_plan_exists;
    
    -- Count active pro users
    SELECT COUNT(*) INTO active_pro_users
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro' 
    AND us.status = 'active' 
    AND us.current_period_end > NOW();
    
    -- Count active listings
    SELECT COUNT(*) INTO active_listings
    FROM listings l
    JOIN user_subscriptions us ON l.user_id = us.user_id
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro' 
    AND us.status = 'active' 
    AND us.current_period_end > NOW() 
    AND l.status = 'active';
    
    -- Count auto-refresh schedules
    SELECT COUNT(*) INTO auto_refresh_schedules
    FROM business_auto_refresh
    WHERE is_active = true;
    
    -- Check cron job
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'auto-refresh-business-listings')
    INTO cron_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║         AUTO-REFRESH SYSTEM - DIAGNOSTIC SUMMARY              ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    IF NOT pro_plan_exists THEN
        RAISE NOTICE '❌ ISSUE: Sellar Pro plan does not exist in subscription_plans';
        RAISE NOTICE '   → Run: insert-sellar-pro-plan.sql';
    ELSE
        RAISE NOTICE '✅ Sellar Pro plan exists';
    END IF;
    
    IF active_pro_users = 0 THEN
        RAISE NOTICE '⚠️  No active Sellar Pro users found';
        RAISE NOTICE '   → Users need to subscribe to Sellar Pro first';
    ELSE
        RAISE NOTICE '✅ Active Sellar Pro users: %', active_pro_users;
    END IF;
    
    IF active_listings = 0 AND active_pro_users > 0 THEN
        RAISE NOTICE '⚠️  Sellar Pro users have no active listings';
        RAISE NOTICE '   → Users need to create listings to use auto-refresh';
    ELSIF active_listings > 0 THEN
        RAISE NOTICE '✅ Active Sellar Pro listings: %', active_listings;
    END IF;
    
    IF auto_refresh_schedules = 0 AND active_listings > 0 THEN
        RAISE NOTICE '⚠️  Auto-refresh schedules missing for active listings';
        RAISE NOTICE '   → The fix script should have created them';
        RAISE NOTICE '   → Check trigger: trigger_auto_enable_sellar_pro_auto_refresh';
    ELSIF auto_refresh_schedules > 0 THEN
        RAISE NOTICE '✅ Active auto-refresh schedules: %', auto_refresh_schedules;
    END IF;
    
    IF NOT cron_exists THEN
        RAISE NOTICE '❌ ISSUE: Cron job not scheduled';
        RAISE NOTICE '   → The fix script should have created it';
    ELSE
        RAISE NOTICE '✅ Cron job is scheduled';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- Final verdict
    IF pro_plan_exists AND cron_exists THEN
        IF active_pro_users = 0 THEN
            RAISE NOTICE '📝 VERDICT: System is ready, waiting for Sellar Pro users';
        ELSIF active_listings = 0 THEN
            RAISE NOTICE '📝 VERDICT: System is ready, waiting for users to create listings';
        ELSIF auto_refresh_schedules = active_listings THEN
            RAISE NOTICE '✅ VERDICT: AUTO-REFRESH SYSTEM IS FULLY OPERATIONAL!';
        ELSE
            RAISE NOTICE '⚠️  VERDICT: Some listings missing auto-refresh setup';
        END IF;
    ELSE
        RAISE NOTICE '❌ VERDICT: System needs configuration';
    END IF;
    
    RAISE NOTICE '';
END $$;

