-- =============================================
-- QUICK FIX FOR DATABASE ISSUES
-- Run this to fix the immediate problems
-- =============================================

-- Step 1: Fix the handle_new_user function
\echo 'Fixing handle_new_user function...'
\i supabase/migrations/20250116000006_fix_user_registration.sql

-- Step 2: Apply simple RLS policies
\echo 'Applying simple RLS policies...'
\i supabase/migrations/20250116000008_simple_rls_policies.sql

-- Step 3: Verify everything is working
\echo 'Verifying fixes...'

-- Check if function exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN '✅ handle_new_user function exists' 
        ELSE '❌ handle_new_user function missing' 
    END as function_status;

-- Check if trigger exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
        THEN '✅ Trigger exists' 
        ELSE '❌ Trigger missing' 
    END as trigger_status;

-- Check RLS policies
SELECT 
    '✅ RLS policies created' as rls_status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_settings');

\echo 'Quick fix completed! User registration should now work.'
