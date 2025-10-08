-- =============================================
-- ENSURE SELLAR PRO PLAN EXISTS & FIX RLS
-- =============================================
-- This migration ensures the Sellar Pro plan exists for trials
-- and sets up proper RLS policies so authenticated users can read plans

-- =============================================
-- 1. ENSURE THE PLAN EXISTS
-- =============================================

-- Check if the plan exists
DO $$
DECLARE
    plan_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM subscription_plans WHERE name = 'Sellar Pro'
    ) INTO plan_exists;
    
    -- If plan doesn't exist, create it
    IF NOT plan_exists THEN
        INSERT INTO subscription_plans (id, name, description, price_ghs, billing_cycle, features, is_active)
        VALUES (
            'a0000000-0000-4000-8000-000000000001',
            'Sellar Pro',
            'Complete business solution for serious sellers with advanced features',
            400.00,
            'monthly',
            '[
              "unlimited_listings",
              "auto_refresh_2h",
              "advanced_analytics",
              "priority_support",
              "video_uploads",
              "business_badge",
              "bulk_operations",
              "custom_branding"
            ]'::jsonb,
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price_ghs = EXCLUDED.price_ghs,
            features = EXCLUDED.features,
            is_active = EXCLUDED.is_active;
        
        RAISE NOTICE 'Created Sellar Pro plan';
    ELSE
        RAISE NOTICE 'Sellar Pro plan already exists';
    END IF;
END $$;

-- Verify the plan
SELECT id, name, price_ghs, billing_cycle, is_active 
FROM subscription_plans 
WHERE name = 'Sellar Pro';

-- =============================================
-- 2. FIX RLS POLICIES
-- =============================================
-- Allow authenticated users to read subscription plans

-- Enable RLS on subscription_plans (if not already enabled)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can view subscription plans" ON subscription_plans;

-- Create policy to allow authenticated users to read all subscription plans
CREATE POLICY "Authenticated users can view subscription plans"
    ON subscription_plans
    FOR SELECT
    TO authenticated
    USING (true);

-- =============================================
-- 3. VERIFY SETUP
-- =============================================

-- Show the plan exists
SELECT 
    '✅ Sellar Pro Plan' as status,
    id, 
    name, 
    price_ghs, 
    is_active 
FROM subscription_plans 
WHERE name = 'Sellar Pro';

-- Show RLS policies
SELECT 
    '✅ RLS Policies' as status,
    policyname,
    roles::text,
    cmd
FROM pg_policies
WHERE tablename = 'subscription_plans';
