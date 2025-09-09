-- =============================================
-- SELLAR MOBILE APP - UNIFIED BUSINESS PLAN MIGRATION
-- Migration: Consolidate multiple business plans into single unified plan
-- =============================================

-- =============================================
-- BACKUP EXISTING DATA
-- =============================================

-- Create backup table for existing subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions_backup AS 
SELECT * FROM user_subscriptions WHERE status = 'active';

-- Create backup table for existing plans
CREATE TABLE IF NOT EXISTS subscription_plans_backup AS 
SELECT * FROM subscription_plans;

-- =============================================
-- REMOVE OLD BUSINESS PLANS
-- =============================================

-- Deactivate old business plans (don't delete to preserve data integrity)
UPDATE subscription_plans 
SET is_active = false 
WHERE name IN ('Starter Business', 'Pro Business', 'Premium Business');

-- =============================================
-- CREATE UNIFIED BUSINESS PLAN
-- =============================================

-- Insert the new unified business plan
-- First check if plan already exists, if not insert it
DO $$
BEGIN
    -- Check if the plan already exists
    IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Sellar Business') THEN
        INSERT INTO subscription_plans (
            name, 
            description, 
            price, 
            currency, 
            billing_cycle, 
            features
        ) VALUES (
            'Sellar Business',
            'Complete business solution for serious sellers',
            400.00,
            'GHS',
            'monthly',
            '{"highlights": ["120 boost credits monthly", "Unlimited listings", "Auto-boost your listings", "Comprehensive analytics dashboard", "Priority support", "Homepage placement", "Premium branding", "Sponsored posts", "Bulk operations"], "credits": 120, "listings_limit": null, "analytics": true, "auto_boost": true, "priority_support": true, "homepage_placement": true, "premium_branding": true, "sponsored_posts": true}'::jsonb
        );
        RAISE NOTICE 'Created new unified business plan: Sellar Business';
    ELSE
        -- Update existing plan
        UPDATE subscription_plans 
        SET 
            description = 'Complete business solution for serious sellers',
            price = 400.00,
            currency = 'GHS',
            billing_cycle = 'monthly',
            features = '{"highlights": ["120 boost credits monthly", "Unlimited listings", "Auto-boost your listings", "Comprehensive analytics dashboard", "Priority support", "Homepage placement", "Premium branding", "Sponsored posts", "Bulk operations"], "credits": 120, "listings_limit": null, "analytics": true, "auto_boost": true, "priority_support": true, "homepage_placement": true, "premium_branding": true, "sponsored_posts": true}'::jsonb,
            updated_at = NOW()
        WHERE name = 'Sellar Business';
        RAISE NOTICE 'Updated existing unified business plan: Sellar Business';
    END IF;
END $$;

-- =============================================
-- MIGRATE EXISTING SUBSCRIPTIONS
-- =============================================

-- Get the new unified plan ID
DO $$
DECLARE
    unified_plan_id UUID;
    subscription_record RECORD;
BEGIN
    -- Get the unified plan ID
    SELECT id INTO unified_plan_id 
    FROM subscription_plans 
    WHERE name = 'Sellar Business' 
    LIMIT 1;

    -- Migrate all active business subscriptions to the unified plan
    FOR subscription_record IN 
        SELECT us.*, sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active' 
        AND sp.name IN ('Starter Business', 'Pro Business', 'Premium Business')
    LOOP
        -- Update subscription to use unified plan
        UPDATE user_subscriptions 
        SET 
            plan_id = unified_plan_id,
            updated_at = NOW()
        WHERE id = subscription_record.id;

        -- Log the migration
        INSERT INTO subscription_changes (
            user_id,
            old_plan_id,
            new_plan_id,
            change_type,
            reason,
            created_at
        ) VALUES (
            subscription_record.user_id,
            subscription_record.plan_id,
            unified_plan_id,
            'migration',
            'Migrated to unified business plan from ' || subscription_record.plan_name,
            NOW()
        ) ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Migration completed. All business subscriptions migrated to unified plan.';
END $$;

-- =============================================
-- UPDATE USER CREDITS FOR UNIFIED PLAN
-- =============================================

-- Update credit balances for migrated users to match new plan allocation
DO $$
DECLARE
    user_record RECORD;
    unified_plan_id UUID;
BEGIN
    -- Get the unified plan ID
    SELECT id INTO unified_plan_id 
    FROM subscription_plans 
    WHERE name = 'Sellar Business' 
    LIMIT 1;

    -- Update credits for all users on the unified plan
    FOR user_record IN 
        SELECT DISTINCT us.user_id
        FROM user_subscriptions us
        WHERE us.plan_id = unified_plan_id 
        AND us.status = 'active'
    LOOP
        -- Ensure user has at least 120 credits (unified plan allocation)
        -- Note: Adjust table name based on your actual credits table
        INSERT INTO user_credits (user_id, balance, updated_at)
        VALUES (user_record.user_id, 120, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            balance = GREATEST(user_credits.balance, 120),
            updated_at = NOW();
    END LOOP;

    RAISE NOTICE 'Credit balances updated for unified plan users.';
END $$;

-- =============================================
-- CREATE SUBSCRIPTION CHANGES LOG TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    old_plan_id UUID REFERENCES subscription_plans(id),
    new_plan_id UUID REFERENCES subscription_plans(id),
    change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'migration', 'cancellation')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- UPDATE ENTITLEMENTS FUNCTION
-- =============================================

-- Drop existing function if it exists (to handle return type changes)
DROP FUNCTION IF EXISTS get_user_business_entitlements(UUID);

-- Create function to get user entitlements for unified plan
CREATE FUNCTION get_user_business_entitlements(user_id_param UUID)
RETURNS TABLE (
    is_business_user BOOLEAN,
    max_listings INTEGER,
    monthly_credits INTEGER,
    has_analytics BOOLEAN,
    has_auto_boost BOOLEAN,
    has_priority_support BOOLEAN,
    has_homepage_placement BOOLEAN,
    has_premium_branding BOOLEAN,
    has_sponsored_posts BOOLEAN,
    has_bulk_operations BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as is_business_user,
        CASE 
            WHEN us.status = 'active' THEN NULL::INTEGER -- unlimited
            ELSE 5 -- free users get 5 listings
        END as max_listings,
        CASE 
            WHEN us.status = 'active' THEN 120 
            ELSE 0 
        END as monthly_credits,
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as has_analytics,
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as has_auto_boost,
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as has_priority_support,
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as has_homepage_placement,
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as has_premium_branding,
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as has_sponsored_posts,
        CASE 
            WHEN us.status = 'active' THEN true 
            ELSE false 
        END as has_bulk_operations
    FROM profiles p
    LEFT JOIN user_subscriptions us ON p.id = us.user_id AND us.status = 'active'
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE p.id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant permissions for the new function
GRANT EXECUTE ON FUNCTION get_user_business_entitlements(UUID) TO authenticated;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify the migration
DO $$
DECLARE
    active_subscriptions INTEGER;
    unified_plan_count INTEGER;
    migrated_users INTEGER;
BEGIN
    -- Count active subscriptions
    SELECT COUNT(*) INTO active_subscriptions
    FROM user_subscriptions 
    WHERE status = 'active';

    -- Count unified plan subscriptions
    SELECT COUNT(*) INTO unified_plan_count
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status = 'active' AND sp.name = 'Sellar Business';

    -- Count migrated users
    SELECT COUNT(DISTINCT user_id) INTO migrated_users
    FROM subscription_changes 
    WHERE change_type = 'migration';

    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '- Active subscriptions: %', active_subscriptions;
    RAISE NOTICE '- Unified plan subscriptions: %', unified_plan_count;
    RAISE NOTICE '- Migrated users: %', migrated_users;
END $$;

-- =============================================
-- CLEANUP (Optional - Run after verification)
-- =============================================

-- Uncomment these lines after verifying the migration is successful:

-- -- Remove old inactive plans (after confirming migration success)
-- -- DELETE FROM subscription_plans 
-- -- WHERE name IN ('Starter Business', 'Pro Business', 'Premium Business') 
-- -- AND is_active = false;

-- -- Drop backup tables (after confirming migration success)
-- -- DROP TABLE IF EXISTS user_subscriptions_backup;
-- -- DROP TABLE IF EXISTS subscription_plans_backup;

-- =============================================
-- ROLLBACK PROCEDURE (Emergency Use Only)
-- =============================================

/*
-- EMERGENCY ROLLBACK PROCEDURE
-- Only use if migration fails and needs to be reversed

-- 1. Restore old plans
UPDATE subscription_plans 
SET is_active = true 
WHERE name IN ('Starter Business', 'Pro Business', 'Premium Business');

-- 2. Restore old subscriptions from backup
INSERT INTO user_subscriptions 
SELECT * FROM user_subscriptions_backup
ON CONFLICT (id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    updated_at = NOW();

-- 3. Deactivate unified plan
UPDATE subscription_plans 
SET is_active = false 
WHERE name = 'Sellar Business';

-- 4. Clean up migration records
DELETE FROM subscription_changes WHERE change_type = 'migration';
*/

COMMIT;
