-- Migration 43: Create view for listings with Sellar Pro status
-- This optimizes performance by pre-joining subscription data

-- =============================================
-- 1. CREATE VIEW FOR LISTINGS WITH PRO STATUS
-- =============================================

-- Drop the view if it already exists
DROP VIEW IF EXISTS listings_with_pro_status CASCADE;

-- Create the optimized view
CREATE VIEW listings_with_pro_status AS
SELECT 
  l.*,
  -- Pre-compute Sellar Pro status
  CASE 
    WHEN us.id IS NOT NULL 
      AND us.status IN ('active', 'trialing', 'cancelled')
      AND sp.name = 'Sellar Pro'
      AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
    THEN TRUE
    ELSE FALSE
  END as is_sellar_pro,
  -- Include subscription details for additional context if needed
  us.status as subscription_status,
  us.current_period_end as subscription_end,
  sp.name as subscription_plan_name
FROM listings l
LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id;

-- Add comment to document the view
COMMENT ON VIEW listings_with_pro_status IS 'View that includes pre-computed Sellar Pro status for performance optimization. Used by mobile app to show PRO badges without additional queries.';

-- =============================================
-- 2. ADD RLS POLICIES FOR THE VIEW
-- =============================================

-- Grant select permission to authenticated users
GRANT SELECT ON listings_with_pro_status TO authenticated;
GRANT SELECT ON listings_with_pro_status TO anon;

-- =============================================
-- 3. CREATE INDEX FOR PERFORMANCE
-- =============================================

-- Index on user_subscriptions for faster joins
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status_plan 
ON user_subscriptions(user_id, status, plan_id)
WHERE status IN ('active', 'trialing', 'cancelled');

-- =============================================
-- 4. VERIFICATION QUERY
-- =============================================

-- Check that the view works correctly
DO $$
DECLARE
  total_listings INTEGER;
  pro_listings INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_listings FROM listings_with_pro_status WHERE status = 'active';
  SELECT COUNT(*) INTO pro_listings FROM listings_with_pro_status WHERE status = 'active' AND is_sellar_pro = true;
  
  RAISE NOTICE '✅ View created successfully';
  RAISE NOTICE '📊 Total active listings: %', total_listings;
  RAISE NOTICE '⭐ Sellar Pro listings: %', pro_listings;
END $$;

