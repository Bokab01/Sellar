-- =============================================
-- RE-ENABLE AUTO-REFRESH FOR EXISTING SELLAR PRO USERS
-- =============================================
-- Run this script ONCE after deploying the updated schema
-- to re-enable auto-refresh for existing Sellar Pro users

-- 1. Re-enable disabled auto-refresh entries
WITH sellar_pro_users AS (
    SELECT DISTINCT us.user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status = 'active'
    AND sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW()
)
UPDATE business_auto_refresh
SET 
    is_active = true,
    next_refresh_at = NOW() + INTERVAL '2 hours',
    updated_at = NOW()
FROM sellar_pro_users spu, listings l
WHERE business_auto_refresh.user_id = spu.user_id
AND business_auto_refresh.listing_id = l.id
AND l.status = 'active'
AND business_auto_refresh.is_active = false;

-- 2. Create missing auto-refresh entries
INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at)
SELECT DISTINCT 
    l.user_id,
    l.id as listing_id,
    true as is_active,
    NOW() + INTERVAL '2 hours' as next_refresh_at
FROM listings l
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
)
ON CONFLICT (user_id, listing_id) 
DO UPDATE SET 
    is_active = true,
    next_refresh_at = NOW() + INTERVAL '2 hours',
    updated_at = NOW();

-- 3. Verify results
SELECT 
    '✅ Re-Enable Complete' as status,
    COUNT(DISTINCT l.user_id) as total_sellar_pro_users,
    COUNT(DISTINCT l.id) as total_active_listings,
    COUNT(DISTINCT bar.id) as listings_with_auto_refresh,
    COUNT(DISTINCT bar.id) FILTER (WHERE bar.is_active = true) as active_auto_refreshes
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN listings l ON us.user_id = l.user_id
LEFT JOIN business_auto_refresh bar ON l.id = bar.listing_id
WHERE us.status = 'active'
AND sp.name = 'Sellar Pro'
AND us.current_period_end > NOW()
AND l.status = 'active';

