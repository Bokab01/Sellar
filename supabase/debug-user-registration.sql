-- =============================================
-- DEBUG USER REGISTRATION ISSUES
-- This script helps diagnose what's wrong with user registration
-- =============================================

-- Check 1: Does the handle_new_user function exist?
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
        THEN '✅ handle_new_user function exists' 
        ELSE '❌ handle_new_user function missing' 
    END as function_status;

-- Check 2: Does the trigger exist?
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
        THEN '✅ Trigger exists' 
        ELSE '❌ Trigger missing' 
    END as trigger_status;

-- Check 3: What columns exist in the profiles table?
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check 4: What columns exist in the user_settings table?
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check 5: Are there any existing profiles?
SELECT COUNT(*) as existing_profiles_count FROM profiles;

-- Check 6: Are there any existing user_settings?
SELECT COUNT(*) as existing_user_settings_count FROM user_settings;

-- Check 7: What RLS policies exist on profiles?
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'profiles'
ORDER BY policyname;

-- Check 8: What RLS policies exist on user_settings?
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'user_settings'
ORDER BY policyname;

-- Check 9: Is RLS enabled on critical tables?
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_settings')
ORDER BY tablename;

-- Check 10: Test the function manually (this will show any syntax errors)
SELECT 'Testing function syntax...' as test_status;

-- If the function exists, show its definition
SELECT 
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user' 
    AND routine_schema = 'public';
