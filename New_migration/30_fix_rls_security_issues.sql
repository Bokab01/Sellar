-- =============================================
-- SELLAR MOBILE APP - FIX RLS SECURITY ISSUES
-- Migration 30: Enable RLS on backup tables and missing tables
-- =============================================

-- The database linter found several tables without RLS enabled
-- This is a security risk as these tables are exposed to PostgREST

-- =============================================
-- 1. ENABLE RLS ON BACKUP TABLES
-- =============================================

-- Enable RLS on reviews_backup table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews_backup') THEN
        ALTER TABLE reviews_backup ENABLE ROW LEVEL SECURITY;
        
        -- Create a restrictive policy for backup table (admin only)
        DROP POLICY IF EXISTS "Admin only access to reviews backup" ON reviews_backup;
        CREATE POLICY "Admin only access to reviews backup" ON reviews_backup
            FOR ALL USING (false); -- No one can access backup tables via API
            
        RAISE NOTICE 'RLS enabled on reviews_backup table';
    END IF;
END $$;

-- Enable RLS on user_subscriptions_backup table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions_backup') THEN
        ALTER TABLE user_subscriptions_backup ENABLE ROW LEVEL SECURITY;
        
        -- Create a restrictive policy for backup table (admin only)
        DROP POLICY IF EXISTS "Admin only access to user subscriptions backup" ON user_subscriptions_backup;
        CREATE POLICY "Admin only access to user subscriptions backup" ON user_subscriptions_backup
            FOR ALL USING (false); -- No one can access backup tables via API
            
        RAISE NOTICE 'RLS enabled on user_subscriptions_backup table';
    END IF;
END $$;

-- Enable RLS on subscription_plans_backup table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_plans_backup') THEN
        ALTER TABLE subscription_plans_backup ENABLE ROW LEVEL SECURITY;
        
        -- Create a restrictive policy for backup table (admin only)
        DROP POLICY IF EXISTS "Admin only access to subscription plans backup" ON subscription_plans_backup;
        CREATE POLICY "Admin only access to subscription plans backup" ON subscription_plans_backup
            FOR ALL USING (false); -- No one can access backup tables via API
            
        RAISE NOTICE 'RLS enabled on subscription_plans_backup table';
    END IF;
END $$;

-- =============================================
-- 2. ENABLE RLS ON SUBSCRIPTION_CHANGES TABLE
-- =============================================

-- Enable RLS on subscription_changes table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_changes') THEN
        ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for subscription_changes
        DROP POLICY IF EXISTS "Users can view own subscription changes" ON subscription_changes;
        CREATE POLICY "Users can view own subscription changes" ON subscription_changes
            FOR SELECT USING (auth.uid() = user_id);
            
        DROP POLICY IF EXISTS "System can insert subscription changes" ON subscription_changes;
        CREATE POLICY "System can insert subscription changes" ON subscription_changes
            FOR INSERT WITH CHECK (true); -- Allow system to create records
            
        DROP POLICY IF EXISTS "System can update subscription changes" ON subscription_changes;
        CREATE POLICY "System can update subscription changes" ON subscription_changes
            FOR UPDATE USING (true); -- Allow system to update records
            
        RAISE NOTICE 'RLS enabled on subscription_changes table with proper policies';
    END IF;
END $$;

-- =============================================
-- 3. ALTERNATIVE: DROP BACKUP TABLES (RECOMMENDED)
-- =============================================

-- Backup tables are usually temporary and should be dropped after migration
-- Uncomment the following section if you want to drop them instead

/*
-- Drop backup tables to eliminate security risk entirely
DROP TABLE IF EXISTS reviews_backup;
DROP TABLE IF EXISTS user_subscriptions_backup;
DROP TABLE IF EXISTS subscription_plans_backup;

-- Log the cleanup
SELECT 'Backup tables dropped for security' as cleanup_status;
*/

-- =============================================
-- 4. VERIFY RLS STATUS
-- =============================================

-- Query to check RLS status on all tables
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE 'RLS Status Check:';
    
    FOR table_record IN 
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('reviews_backup', 'user_subscriptions_backup', 'subscription_plans_backup', 'subscription_changes')
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: %.% - RLS Enabled: %', 
            table_record.schemaname, 
            table_record.tablename, 
            table_record.rowsecurity;
    END LOOP;
END $$;

-- =============================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Ensure authenticated users have necessary permissions
DO $$
BEGIN
    -- Grant permissions on subscription_changes if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_changes') THEN
        GRANT SELECT ON subscription_changes TO authenticated;
        GRANT INSERT ON subscription_changes TO service_role;
        GRANT UPDATE ON subscription_changes TO service_role;
        GRANT DELETE ON subscription_changes TO service_role;
    END IF;
END $$;

-- Success message
SELECT 'RLS security issues fixed successfully!' as status;
