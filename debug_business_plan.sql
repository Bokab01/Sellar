-- Debug script to check business plan detection
-- Run this in your Supabase SQL editor

-- 1. Check if get_user_entitlements function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_entitlements';

-- 2. Check subscription plans
SELECT id, name, description, price_ghs, billing_cycle, features, is_active
FROM subscription_plans
WHERE name ILIKE '%business%';

-- 3. Check user subscriptions (replace with your user ID)
-- SELECT us.*, sp.name as plan_name, sp.features
-- FROM user_subscriptions us
-- JOIN subscription_plans sp ON us.plan_id = sp.id
-- WHERE us.user_id = 'YOUR_USER_ID_HERE'
-- AND us.status = 'active';

-- 4. Test get_user_entitlements function (replace with your user ID)
-- SELECT get_user_entitlements('YOUR_USER_ID_HERE');

-- 5. Check if user has any active subscriptions
-- SELECT COUNT(*) as active_subscriptions
-- FROM user_subscriptions us
-- JOIN subscription_plans sp ON us.plan_id = sp.id
-- WHERE us.user_id = 'YOUR_USER_ID_HERE'
-- AND us.status = 'active'
-- AND us.current_period_end > NOW()
-- AND sp.name = 'Sellar Business';
