-- =============================================
-- DIAGNOSE WHY 10 LISTINGS WON'T TOGGLE ON
-- =============================================

-- Get the user ID
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    LIMIT 1;
    
    RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- 1. Check ALL user listings and their auto-refresh status
SELECT 
    '=== ALL USER LISTINGS ===' as section,
    l.id as listing_id,
    l.title,
    l.status as listing_status,
    l.created_at,
    l.updated_at,
    bar.id as auto_refresh_id,
    bar.is_active as auto_refresh_enabled,
    bar.next_refresh_at,
    CASE 
        WHEN bar.id IS NULL THEN '❌ No auto-refresh record'
        WHEN bar.is_active = true THEN '✅ Enabled'
        WHEN bar.is_active = false THEN '⚠️  Disabled'
        ELSE '❓ Unknown'
    END as status
FROM listings l
LEFT JOIN business_auto_refresh bar ON l.id = bar.listing_id AND bar.user_id = l.user_id
WHERE l.user_id IN (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW()
)
AND l.status = 'active'
ORDER BY l.created_at DESC;

-- 2. Count the statuses
SELECT 
    '=== SUMMARY ===' as section,
    COUNT(*) as total_active_listings,
    COUNT(*) FILTER (WHERE bar.id IS NOT NULL AND bar.is_active = true) as auto_refresh_on,
    COUNT(*) FILTER (WHERE bar.id IS NOT NULL AND bar.is_active = false) as auto_refresh_off,
    COUNT(*) FILTER (WHERE bar.id IS NULL) as no_auto_refresh_record
FROM listings l
LEFT JOIN business_auto_refresh bar ON l.id = bar.listing_id AND bar.user_id = l.user_id
WHERE l.user_id IN (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW()
)
AND l.status = 'active';

-- 3. Try to enable auto-refresh for ALL listings
WITH sellar_pro_user AS (
    SELECT us.user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    LIMIT 1
)
INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at, refresh_interval_hours)
SELECT 
    l.user_id,
    l.id,
    true,
    NOW() + INTERVAL '2 hours',
    2
FROM listings l
JOIN sellar_pro_user spu ON l.user_id = spu.user_id
WHERE l.status = 'active'
ON CONFLICT (user_id, listing_id)
DO UPDATE SET
    is_active = true,
    next_refresh_at = NOW() + INTERVAL '2 hours',
    updated_at = NOW();

-- 4. Verify after fix
SELECT 
    '=== AFTER FIX ===' as section,
    COUNT(*) as total_listings,
    COUNT(*) FILTER (WHERE bar.is_active = true) as enabled,
    COUNT(*) FILTER (WHERE bar.is_active = false) as disabled,
    CASE 
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE bar.is_active = true) THEN '✅ ALL ENABLED'
        ELSE '⚠️  SOME STILL DISABLED'
    END as status
FROM listings l
JOIN business_auto_refresh bar ON l.id = bar.listing_id AND bar.user_id = l.user_id
WHERE l.user_id IN (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    AND us.current_period_end > NOW()
)
AND l.status = 'active';

-- 5. Final summary
DO $$
DECLARE
    total_listings INTEGER;
    enabled_count INTEGER;
    disabled_count INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE bar.is_active = true),
        COUNT(*) FILTER (WHERE bar.is_active = false)
    INTO total_listings, enabled_count, disabled_count
    FROM listings l
    JOIN business_auto_refresh bar ON l.id = bar.listing_id AND bar.user_id = l.user_id
    WHERE l.user_id IN (
        SELECT us.user_id 
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE sp.name = 'Sellar Pro'
        AND us.status = 'active'
        AND us.current_period_end > NOW()
    )
    AND l.status = 'active';
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          AUTO-REFRESH STATUS                              ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Total active listings: %', total_listings;
    RAISE NOTICE '✅ Auto-refresh enabled: %', enabled_count;
    RAISE NOTICE '❌ Auto-refresh disabled: %', disabled_count;
    RAISE NOTICE '';
    
    IF enabled_count = total_listings THEN
        RAISE NOTICE '🎉 SUCCESS! All listings have auto-refresh enabled!';
    ELSE
        RAISE NOTICE '⚠️  % listings still need manual toggle in the app', disabled_count;
    END IF;
    
    RAISE NOTICE '';
END $$;

