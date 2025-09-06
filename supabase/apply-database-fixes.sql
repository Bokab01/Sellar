-- =============================================
-- APPLY DATABASE FIXES - COMPLETE MIGRATION
-- This script applies all database fixes in the correct order
-- =============================================

-- Start transaction to ensure all changes are applied atomically
BEGIN;

-- =============================================
-- STEP 1: Apply the core database schema (if not already applied)
-- =============================================
\echo 'Step 1: Applying core database schema...'
\i supabase/migrations/20250115000001_core_database_schema.sql

-- =============================================
-- STEP 2: Apply transaction history system
-- =============================================
\echo 'Step 2: Applying transaction history system...'
\i supabase/migrations/20250115000018_transaction_history_system.sql

-- =============================================
-- STEP 3: Fix user registration function
-- =============================================
\echo 'Step 3: Fixing user registration function...'
\i supabase/migrations/20250116000006_fix_user_registration.sql

-- =============================================
-- STEP 4: Fix RLS policies (using simple version)
-- =============================================
\echo 'Step 4: Fixing RLS policies...'
\i supabase/migrations/20250116000008_simple_rls_policies.sql

-- =============================================
-- STEP 5: Run verification tests
-- =============================================
\echo 'Step 5: Running verification tests...'
\i supabase/test-user-registration.sql

-- =============================================
-- STEP 6: Final verification
-- =============================================
\echo 'Step 6: Final verification...'

-- Check that all critical tables exist
SELECT 
    'Tables Check' as test_type,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'user_settings', 'conversations', 'messages', 'offers', 'posts', 'comments', 'notifications', 'transactions');

-- Check that handle_new_user function exists
SELECT 
    'Function Check' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

-- Check that trigger exists
SELECT 
    'Trigger Check' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as status;

-- Check RLS is enabled on critical tables
SELECT 
    'RLS Check' as test_type,
    COUNT(*) as tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_settings', 'conversations', 'messages')
    AND rowsecurity = true;

-- Check that profiles table has required columns
SELECT 
    'Profiles Schema Check' as test_type,
    COUNT(*) as required_columns
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
    AND column_name IN ('id', 'email', 'phone', 'location', 'is_verified', 'is_business', 'is_active');

-- =============================================
-- COMMIT ALL CHANGES
-- =============================================
COMMIT;

\echo 'Database fixes applied successfully!'
\echo 'User registration should now work properly.'
\echo 'Next steps:'
\echo '1. Test user registration in the app'
\echo '2. Verify profile creation works'
\echo '3. Check that RLS policies are working'
\echo '4. Test chat and messaging functionality'
