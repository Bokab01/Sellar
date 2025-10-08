-- =============================================
-- INSERT SELLAR PRO PLAN (Simple Version)
-- =============================================
-- Run this if you get 0 plans but migrations are already applied

-- Insert or update the Sellar Pro plan
INSERT INTO subscription_plans (
    id, 
    name, 
    description, 
    price_ghs, 
    billing_cycle, 
    features, 
    is_active
) VALUES (
    'a0000000-0000-4000-8000-000000000001'::uuid,
    'Sellar Pro',
    'Complete business solution for serious sellers with advanced features',
    400.00,
    'monthly',
    '[
      "unlimited_listings",
      "auto_refresh_2h",
      "auto_boost_listings",
      "comprehensive_analytics",
      "priority_support",
      "homepage_placement",
      "premium_branding",
      "sponsored_posts",
      "bulk_operations",
      "video_uploads",
      "business_badge"
    ]'::jsonb,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_ghs = EXCLUDED.price_ghs,
    billing_cycle = EXCLUDED.billing_cycle,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Verify it was inserted
SELECT 
    id,
    name,
    price_ghs,
    billing_cycle,
    is_active,
    jsonb_array_length(features) as feature_count
FROM subscription_plans
WHERE name = 'Sellar Pro';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '✅ Sellar Pro plan inserted/updated successfully!';
END $$;

