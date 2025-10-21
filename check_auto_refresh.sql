-- =============================================
-- DIAGNOSTIC: AUTO-REFRESH SYSTEM STATUS
-- =============================================

-- 1. Check cron job
SELECT 
    '=== CRON JOB STATUS ===' as check_section,
    jobname,
    schedule,
    active,
    jobid
FROM cron.job 
WHERE jobname LIKE '%auto-refresh%' OR jobname LIKE '%business%';

-- 2. Check business_auto_refresh table indexes
SELECT 
    '=== INDEXES ON business_auto_refresh ===' as check_section,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'business_auto_refresh';

-- 3. Check active Sellar Pro subscriptions
SELECT 
    '=== ACTIVE SELLAR PRO USERS ===' as check_section,
    COUNT(*) as total_sellar_pro_users
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
AND sp.name = 'Sellar Pro'
AND us.current_period_end > NOW();

-- 4. Check business_auto_refresh entries
SELECT 
    '=== AUTO-REFRESH SCHEDULES ===' as check_section,
    COUNT(*) as total_schedules,
    COUNT(*) FILTER (WHERE is_active = true) as active_schedules,
    COUNT(*) FILTER (WHERE is_active = true AND next_refresh_at <= NOW()) as due_for_refresh
FROM business_auto_refresh;

-- 5. Check detailed status for Sellar Pro users
SELECT 
    '=== SELLAR PRO AUTO-REFRESH DETAILS ===' as check_section,
    bar.id,
    bar.user_id,
    bar.listing_id,
    l.title as listing_title,
    l.status as listing_status,
    bar.is_active,
    bar.last_refresh_at,
    bar.next_refresh_at,
    bar.refresh_interval_hours,
    CASE 
        WHEN bar.next_refresh_at <= NOW() THEN 'DUE NOW'
        ELSE 'Scheduled'
    END as refresh_status,
    us.status as subscription_status,
    us.current_period_end as subscription_expires
FROM business_auto_refresh bar
JOIN listings l ON bar.listing_id = l.id
JOIN user_subscriptions us ON bar.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE sp.name = 'Sellar Pro'
ORDER BY bar.next_refresh_at ASC
LIMIT 20;

-- 6. Check for Sellar Pro users missing auto-refresh
SELECT 
    '=== SELLAR PRO USERS WITHOUT AUTO-REFRESH ===' as check_section,
    l.user_id,
    p.full_name,
    COUNT(l.id) as active_listings_without_auto_refresh
FROM listings l
JOIN profiles p ON l.user_id = p.id
JOIN user_subscriptions us ON l.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE l.status = 'active'
AND us.status = 'active'
AND sp.name = 'Sellar Pro'
AND us.current_period_end > NOW()
AND NOT EXISTS (
    SELECT 1 FROM business_auto_refresh bar
    WHERE bar.user_id = l.user_id
    AND bar.listing_id = l.id
    AND bar.is_active = true
)
GROUP BY l.user_id, p.full_name;

-- 7. Check if process_business_auto_refresh function exists
SELECT 
    '=== FUNCTION EXISTS ===' as check_section,
    EXISTS(
        SELECT 1 FROM pg_proc 
        WHERE proname = 'process_business_auto_refresh'
    ) as function_exists;

-- 8. Test function execution (dry run)
SELECT 
    '=== FUNCTION TEST ===' as check_section,
    * 
FROM process_business_auto_refresh();

