-- =============================================
-- REFRESH listings_with_pro_status VIEW
-- =============================================
-- Recreate the view to include new columns: previous_price, price_changed_at

-- Drop the existing view
DROP VIEW IF EXISTS listings_with_pro_status CASCADE;

-- Recreate the view with all current columns
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
COMMENT ON VIEW listings_with_pro_status IS 'Optimized view that pre-computes Sellar Pro status for listings. Includes all listing columns including previous_price and price_changed_at for price drop display.';

-- Grant permissions
GRANT SELECT ON listings_with_pro_status TO authenticated;
GRANT SELECT ON listings_with_pro_status TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ listings_with_pro_status view refreshed! Now includes previous_price and price_changed_at columns.';
END $$;

