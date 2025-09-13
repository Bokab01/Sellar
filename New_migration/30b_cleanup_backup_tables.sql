-- =============================================
-- SELLAR MOBILE APP - CLEANUP BACKUP TABLES
-- Migration 30b: Remove backup tables to eliminate security risks
-- =============================================

-- This is an alternative to 30_fix_rls_security_issues.sql
-- Instead of enabling RLS on backup tables, we simply remove them
-- Backup tables are usually temporary and not needed in production

-- =============================================
-- 1. DROP BACKUP TABLES
-- =============================================

-- Drop reviews_backup table (created during migration)
DROP TABLE IF EXISTS reviews_backup CASCADE;

-- Drop user_subscriptions_backup table (if exists)
DROP TABLE IF EXISTS user_subscriptions_backup CASCADE;

-- Drop subscription_plans_backup table (if exists) 
DROP TABLE IF EXISTS subscription_plans_backup CASCADE;

-- =============================================
-- 2. HANDLE SUBSCRIPTION_CHANGES TABLE
-- =============================================

-- Check if subscription_changes table exists and enable RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscription_changes') THEN
        -- Enable RLS
        ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
        
        -- Create appropriate policies
        DROP POLICY IF EXISTS "Users can view own subscription changes" ON subscription_changes;
        CREATE POLICY "Users can view own subscription changes" ON subscription_changes
            FOR SELECT USING (auth.uid() = user_id);
            
        DROP POLICY IF EXISTS "Service role can manage subscription changes" ON subscription_changes;
        CREATE POLICY "Service role can manage subscription changes" ON subscription_changes
            FOR ALL USING (auth.role() = 'service_role');
            
        -- Grant permissions
        GRANT SELECT ON subscription_changes TO authenticated;
        GRANT ALL ON subscription_changes TO service_role;
        
        RAISE NOTICE 'RLS enabled on subscription_changes table';
    ELSE
        RAISE NOTICE 'subscription_changes table does not exist';
    END IF;
END $$;

-- =============================================
-- 3. VERIFY CLEANUP
-- =============================================

-- Check which tables still exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN ('reviews_backup', 'user_subscriptions_backup', 'subscription_plans_backup')
    AND table_schema = 'public';
    
    IF table_count = 0 THEN
        RAISE NOTICE 'All backup tables successfully removed';
    ELSE
        RAISE NOTICE 'Warning: % backup tables still exist', table_count;
    END IF;
END $$;

-- =============================================
-- 4. LOG CLEANUP RESULTS
-- =============================================

-- Show remaining tables that might need attention
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'Secure'
        ELSE 'NEEDS RLS'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND (
    tablename LIKE '%backup%' 
    OR tablename = 'subscription_changes'
)
ORDER BY tablename;

-- Success message
SELECT 'Backup tables cleanup completed - security risks eliminated!' as status;
