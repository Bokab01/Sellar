-- =============================================
-- FIX CANCELLED SUBSCRIPTIONS WITH TIME REMAINING
-- =============================================
-- Users who cancel but have time remaining should still show as 'active'
-- This will prevent auto-refresh from being deactivated

-- STEP 1: Check current subscription statuses
SELECT 
    '=== SUBSCRIPTIONS THAT NEED FIXING ===' as section,
    us.id as subscription_id,
    us.user_id,
    p.full_name,
    p.email,
    sp.name as plan_name,
    us.status as current_status,
    us.auto_renew,
    us.current_period_end,
    us.current_period_end > NOW() as still_has_time,
    EXTRACT(DAY FROM (us.current_period_end - NOW())) as days_remaining,
    CASE 
        WHEN us.status = 'cancelled' AND us.current_period_end > NOW() THEN '❌ NEEDS FIX'
        WHEN us.status = 'active' AND us.current_period_end > NOW() THEN '✅ OK'
        ELSE '⚠️  CHECK'
    END as fix_status
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN profiles p ON us.user_id = p.id
WHERE sp.name = 'Sellar Pro';

-- STEP 2: Fix subscriptions that are 'cancelled' but still have time
-- These should be 'active' with auto_renew = false
UPDATE user_subscriptions
SET 
    status = 'active',
    auto_renew = false,
    updated_at = NOW()
WHERE id IN (
    SELECT us.id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'cancelled'
    AND us.current_period_end > NOW()
);

-- STEP 3: Re-enable auto-refresh for these users
WITH fixed_users AS (
    SELECT DISTINCT us.user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW()
)
UPDATE business_auto_refresh
SET 
    is_active = true,
    next_refresh_at = NOW() + INTERVAL '2 hours',
    updated_at = NOW()
FROM fixed_users fu, listings l
WHERE business_auto_refresh.user_id = fu.user_id
AND business_auto_refresh.listing_id = l.id
AND l.status = 'active';

-- STEP 4: Verify the fix
SELECT 
    '=== VERIFICATION ===' as section,
    us.id as subscription_id,
    us.user_id,
    p.full_name,
    sp.name as plan_name,
    us.status,
    us.auto_renew,
    us.current_period_end,
    (SELECT COUNT(*) 
     FROM business_auto_refresh bar 
     WHERE bar.user_id = us.user_id 
     AND bar.is_active = true) as active_auto_refresh_count
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
LEFT JOIN profiles p ON us.user_id = p.id
WHERE sp.name = 'Sellar Pro'
AND us.current_period_end > NOW();

-- STEP 5: Show summary
DO $$
DECLARE
    active_pro_users INTEGER;
    active_auto_refreshes INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_pro_users
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW();
    
    SELECT COUNT(*) INTO active_auto_refreshes
    FROM business_auto_refresh
    WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          FIX COMPLETE                                     ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Active Sellar Pro users: %', active_pro_users;
    RAISE NOTICE '✅ Active auto-refresh schedules: %', active_auto_refreshes;
    RAISE NOTICE '';
    
    IF active_pro_users > 0 AND active_auto_refreshes > 0 THEN
        RAISE NOTICE '🎉 AUTO-REFRESH SHOULD NOW WORK!';
        RAISE NOTICE '';
        RAISE NOTICE 'What changed:';
        RAISE NOTICE '  • Cancelled subscriptions with time remaining → status = "active"';
        RAISE NOTICE '  • auto_renew = false (so they won''t renew)';
        RAISE NOTICE '  • Auto-refresh re-enabled for all active listings';
        RAISE NOTICE '  • Cron job will now keep listings refreshed';
    END IF;
    
    RAISE NOTICE '';
END $$;

