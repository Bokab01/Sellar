-- Fix Business Plan Entitlements System
-- This script updates the get_user_entitlements function to properly map
-- business plan features from array format to entitlements object format

-- Drop and recreate the get_user_entitlements function with proper feature mapping
DROP FUNCTION IF EXISTS get_user_entitlements(UUID);

CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_subscription RECORD;
    entitlements JSONB;
BEGIN
    -- Get active subscription
    SELECT us.*, sp.features
    INTO user_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    -- If no active subscription, return basic entitlements
    IF user_subscription IS NULL THEN
        entitlements := jsonb_build_object(
            'max_listings', 5,
            'boost_credits', 0,
            'analytics_level', 'none',
            'priority_support', false,
            'business_badge', false,
            'auto_boost', false,
            'business_features', false
        );
    ELSE
        -- Map subscription features to entitlements format
        -- Check if features is an array (new format) or object (legacy format)
        IF jsonb_typeof(user_subscription.features) = 'array' THEN
            -- New array format - map to entitlements object
            entitlements := jsonb_build_object(
                'max_listings', CASE WHEN user_subscription.features ? 'unlimited_listings' THEN 999999 ELSE 5 END,
                'boost_credits', CASE WHEN user_subscription.features ? '120_boost_credits_monthly' THEN 120 ELSE 0 END,
                'analytics_level', CASE 
                    WHEN user_subscription.features ? 'comprehensive_analytics' THEN 'full'
                    WHEN user_subscription.features ? 'basic_analytics' THEN 'basic'
                    ELSE 'none' 
                END,
                'priority_support', user_subscription.features ? 'priority_support',
                'business_badge', true, -- All business plans get business badge
                'auto_boost', user_subscription.features ? 'auto_boost_listings',
                'business_features', true,
                'homepage_placement', user_subscription.features ? 'homepage_placement',
                'premium_branding', user_subscription.features ? 'premium_branding',
                'sponsored_posts', user_subscription.features ? 'sponsored_posts',
                'bulk_operations', user_subscription.features ? 'bulk_operations'
            );
        ELSE
            -- Legacy object format - use as is
            entitlements := user_subscription.features;
        END IF;
    END IF;
    
    RETURN entitlements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the Sellar Business plan exists with correct features
INSERT INTO subscription_plans (id, name, description, price_ghs, billing_cycle, features, is_active) VALUES
('a0000000-0000-4000-8000-000000000001', 'Sellar Business', 'Complete business solution for serious sellers', 400.00, 'monthly', 
'[
  "unlimited_listings",
  "120_boost_credits_monthly",
  "auto_boost_listings",
  "comprehensive_analytics",
  "priority_support",
  "homepage_placement",
  "premium_branding",
  "sponsored_posts",
  "bulk_operations"
]'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active;

-- Test the function with a sample user (replace with actual user ID for testing)
-- SELECT get_user_entitlements('your-user-id-here');

DO $$
BEGIN
    RAISE NOTICE 'Business plan entitlements system updated successfully!';
    RAISE NOTICE 'Users with active Sellar Business subscriptions should now have proper access to business features.';
END $$;
