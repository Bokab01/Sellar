-- =============================================
-- CLEAN TEST DATA - Registration Issue Fix
-- =============================================
-- This script helps clean up test data that might be causing
-- "email already exists" errors during development

-- WARNING: Only run this on development/test databases!
-- DO NOT run on production data!

-- Step 1: Check what data exists
SELECT 'Current profiles count:' as info, COUNT(*) as count FROM profiles;
SELECT 'Profiles with emails:' as info, COUNT(*) as count FROM profiles WHERE email IS NOT NULL;

-- Step 2: Show existing email addresses (for review)
SELECT 
    email,
    first_name,
    last_name,
    created_at,
    'profiles' as source
FROM profiles 
WHERE email IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Clean up specific test email (REPLACE WITH YOUR EMAIL)
-- Uncomment and modify the email below:

-- DELETE FROM profiles WHERE email = 'your-test-email@example.com';

-- Step 4: Clean up all test data (DANGEROUS - only for fresh development)
-- Uncomment ONLY if you want to reset everything:

-- DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%example%';

-- Step 5: Clean up orphaned profiles (profiles without auth users)
-- This is safer as it only removes incomplete registrations

-- First, let's see what we have:
SELECT 
    p.id,
    p.email,
    p.created_at,
    CASE 
        WHEN p.id IN (
            SELECT id FROM auth.users 
        ) THEN 'Has auth user'
        ELSE 'Orphaned profile'
    END as status
FROM profiles p
WHERE p.email IS NOT NULL
ORDER BY p.created_at DESC;

-- Uncomment to clean up orphaned profiles:
-- DELETE FROM profiles 
-- WHERE id NOT IN (
--     SELECT id FROM auth.users
-- );

-- Step 6: Verify cleanup
SELECT 'Profiles after cleanup:' as info, COUNT(*) as count FROM profiles;

-- Step 7: Reset sequences (if needed)
-- This ensures new profiles get proper IDs
-- SELECT setval('profiles_id_seq', COALESCE(MAX(id), 1)) FROM profiles;

-- =============================================
-- USAGE INSTRUCTIONS:
-- =============================================
-- 1. Connect to your Supabase database
-- 2. Review the SELECT queries first to see what data exists
-- 3. Uncomment and modify the DELETE statements as needed
-- 4. Run the cleanup queries
-- 5. Test registration again
--
-- SAFETY TIPS:
-- - Always backup your data first
-- - Test on a copy of your database
-- - Only clean up data you're sure about
-- - Never run this on production without careful review
-- =============================================
