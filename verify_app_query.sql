-- =============================================
-- VERIFY WHAT THE APP SHOULD SEE
-- =============================================
-- This simulates the EXACT queries the app makes

-- Get the Sellar Pro user ID
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT us.user_id INTO v_user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    LIMIT 1;
    
    RAISE NOTICE 'Sellar Pro User ID: %', v_user_id;
    RAISE NOTICE 'Use this ID in the queries below';
    RAISE NOTICE '';
END $$;

-- Query 1: Listings query (what the app fetches)
SELECT 
    '=== LISTINGS QUERY (App Query #1) ===' as section,
    id,
    title,
    status,
    boost_until,
    updated_at
FROM listings
WHERE user_id = (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    LIMIT 1
)
AND status = 'active'
ORDER BY updated_at DESC;

-- Query 2: Auto-refresh query (what the app fetches)
SELECT 
    '=== AUTO-REFRESH QUERY (App Query #2) ===' as section,
    listing_id,
    is_active,
    last_refresh_at,
    next_refresh_at,
    created_at
FROM business_auto_refresh
WHERE user_id = (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    LIMIT 1
);

-- Query 3: Joined view (what the app constructs in memory)
SELECT 
    '=== COMBINED VIEW (What App Should Display) ===' as section,
    l.id as listing_id,
    l.title as listing_title,
    l.status,
    bar.is_active as auto_refresh_enabled,
    bar.last_refresh_at,
    bar.next_refresh_at,
    CASE 
        WHEN bar.is_active = true THEN '✅ ON'
        WHEN bar.is_active = false THEN '❌ OFF'
        WHEN bar.id IS NULL THEN '⚠️  NO RECORD'
        ELSE '❓ UNKNOWN'
    END as display_status
FROM listings l
LEFT JOIN business_auto_refresh bar ON l.id = bar.listing_id AND l.user_id = bar.user_id
WHERE l.user_id = (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    LIMIT 1
)
AND l.status = 'active'
ORDER BY l.updated_at DESC;

-- Query 4: Count summary
SELECT 
    '=== SUMMARY ===' as section,
    COUNT(*) as total_listings,
    COUNT(*) FILTER (WHERE bar.is_active = true) as should_show_on,
    COUNT(*) FILTER (WHERE bar.is_active = false OR bar.id IS NULL) as should_show_off
FROM listings l
LEFT JOIN business_auto_refresh bar ON l.id = bar.listing_id AND l.user_id = bar.user_id
WHERE l.user_id = (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    LIMIT 1
)
AND l.status = 'active';

