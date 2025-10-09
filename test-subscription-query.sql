-- Test query to check if subscription data is accessible from listings

-- Check if there are any Sellar Pro subscriptions
SELECT 
  us.id,
  us.user_id,
  us.status,
  us.current_period_end,
  sp.name as plan_name,
  p.full_name as user_name
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN profiles p ON us.user_id = p.id
WHERE sp.name = 'Sellar Pro'
AND us.status IN ('active', 'trialing', 'cancelled')
AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
LIMIT 10;

-- Check listings from Sellar Pro users
SELECT 
  l.id as listing_id,
  l.title,
  l.user_id,
  l.status as listing_status,
  us.status as subscription_status,
  sp.name as plan_name,
  us.current_period_end
FROM listings l
LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE l.status IN ('active', 'reserved')
AND sp.name = 'Sellar Pro'
LIMIT 5;

