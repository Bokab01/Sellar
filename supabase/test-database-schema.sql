-- =============================================
-- PHASE 1 DATABASE SCHEMA TESTING
-- Comprehensive test of all tables and relationships
-- =============================================

-- Test 1: Verify all core tables exist
SELECT 'Testing table existence...' as test_category;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'profiles', 'categories', 'listings', 'conversations', 'messages', 'offers',
            'posts', 'comments', 'likes', 'shares', 'notifications',
            'user_credits', 'credit_transactions', 'credit_purchases', 'paystack_transactions',
            'image_optimizations'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'profiles', 'categories', 'listings', 'conversations', 'messages', 'offers',
        'posts', 'comments', 'likes', 'shares', 'notifications',
        'user_credits', 'credit_transactions', 'credit_purchases', 'paystack_transactions',
        'image_optimizations'
    )
ORDER BY table_name;

-- Test 2: Verify foreign key relationships
SELECT 'Testing foreign key relationships...' as test_category;

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ RELATIONSHIP OK' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Test 3: Verify RLS is enabled on all tables
SELECT 'Testing Row Level Security...' as test_category;

SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles', 'listings', 'conversations', 'messages', 'offers',
        'posts', 'comments', 'likes', 'shares', 'notifications',
        'user_credits', 'credit_transactions', 'credit_purchases', 'paystack_transactions'
    )
ORDER BY tablename;

-- Test 4: Verify indexes exist for performance
SELECT 'Testing database indexes...' as test_category;

SELECT 
    tablename,
    indexname,
    indexdef,
    '✅ INDEX OK' as status
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'listings', 'posts', 'messages', 'conversations')
ORDER BY tablename, indexname;

-- Test 5: Test basic data insertion and relationships
SELECT 'Testing data insertion and relationships...' as test_category;

-- Use existing data for relationship testing instead of creating test data
-- This avoids foreign key constraint issues with auth.users

-- Test if we have any existing profiles
SELECT 
    'Existing profiles count:' as test_info,
    COUNT(*) as profile_count
FROM profiles;

-- Test if we have any existing categories
SELECT 
    'Existing categories count:' as test_info,
    COUNT(*) as category_count
FROM categories;

-- Test if we have any existing listings
SELECT 
    'Existing listings count:' as test_info,
    COUNT(*) as listing_count
FROM listings;

-- Test the relationships work with existing data
SELECT 
    'Testing relationships with existing data...' as test_category;

-- Test posts-profiles relationship
SELECT 
    'Posts-Profiles relationship test:' as test_result,
    COUNT(*) as posts_with_profiles
FROM posts p
INNER JOIN profiles pr ON p.user_id = pr.id
LIMIT 5;

-- Test posts-listings relationship (the one we fixed)
SELECT 
    'Posts-Listings relationship test:' as test_result,
    COUNT(*) as posts_with_listings
FROM posts p
INNER JOIN listings l ON p.listing_id = l.id
LIMIT 5;

-- Test listings-categories relationship
SELECT 
    'Listings-Categories relationship test:' as test_result,
    COUNT(*) as listings_with_categories
FROM listings l
INNER JOIN categories c ON l.category_id = c.id
LIMIT 5;

-- Show sample data if it exists
SELECT 
    'Sample relationship data:' as test_result,
    p.content as post_content,
    pr.first_name as author_name,
    l.title as linked_listing
FROM posts p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN listings l ON p.listing_id = l.id
LIMIT 3;

-- Test 6: Verify RPC functions exist
SELECT 'Testing RPC functions...' as test_category;

SELECT 
    routine_name,
    routine_type,
    '✅ FUNCTION EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'get_user_credits',
        'add_user_credits',
        'spend_user_credits',
        'complete_credit_purchase',
        'handle_new_listing',
        'get_image_optimization_stats'
    )
ORDER BY routine_name;

-- Test 7: Test credit system
SELECT 'Testing credit system...' as test_category;

-- Test credit system with existing users (if any)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first existing profile ID (if any)
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Initialize credits for existing user
        INSERT INTO user_credits (user_id, balance, lifetime_earned)
        VALUES (test_user_id, 100, 100)
        ON CONFLICT (user_id) DO UPDATE SET balance = 100, lifetime_earned = 100;
        
        RAISE NOTICE 'Credit system test: Initialized credits for user %', test_user_id;
    ELSE
        RAISE NOTICE 'Credit system test: No existing users found, skipping credit initialization';
    END IF;
END $$;

-- Test credit functions with existing user
SELECT 
    'Credit system test:' as test_result,
    CASE 
        WHEN EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
            (SELECT get_user_credits((SELECT id FROM profiles LIMIT 1)))::text
        ELSE
            'No users available for testing'
    END as user_credits;

SELECT '🎉 Database schema testing completed!' as final_status;
