-- =============================================
-- REMOVE BOOST CREDITS FROM SELLAR PRO PLAN
-- =============================================

-- Update subscription plan features to replace boost credits with auto-refresh
UPDATE subscription_plans 
SET features = (
  SELECT jsonb_agg(
    CASE 
      WHEN value = '"120_boost_credits_monthly"'::jsonb 
      THEN '"auto_refresh_2h"'::jsonb
      ELSE value 
    END
  )
  FROM jsonb_array_elements(features)
)
WHERE id = 'a0000000-0000-4000-8000-000000000001' 
AND features ? '120_boost_credits_monthly';

-- Verify the subscription plan changes
SELECT 
  id,
  name,
  features
FROM subscription_plans 
WHERE id = 'a0000000-0000-4000-8000-000000000001';

-- Test the get_user_entitlements function for a business user
-- (Replace 'your-user-id-here' with an actual business user ID)
SELECT 
  p.id as user_id,
  p.first_name,
  p.last_name,
  get_user_entitlements(p.id) as entitlements
FROM profiles p
WHERE p.is_business = true
LIMIT 3;
