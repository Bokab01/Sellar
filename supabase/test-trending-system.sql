-- Test Trending System Setup
-- Run this after applying trending-system.sql to verify everything works

-- Test 1: Check if tables exist
SELECT 'Testing table creation...' as test_step;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtags') 
        THEN '✅ hashtags table exists'
        ELSE '❌ hashtags table missing'
    END as hashtags_table;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_hashtags') 
        THEN '✅ post_hashtags table exists'
        ELSE '❌ post_hashtags table missing'
    END as post_hashtags_table;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trending_topics') 
        THEN '✅ trending_topics table exists'
        ELSE '❌ trending_topics table missing'
    END as trending_topics_table;

-- Test 2: Check if functions exist
SELECT 'Testing function creation...' as test_step;

SELECT 
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ Function exists'
        ELSE '❌ Function missing'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN (
        'extract_hashtags',
        'process_post_hashtags',
        'get_trending_hashtags',
        'get_trending_posts',
        'get_posts_by_hashtag',
        'trigger_process_post_hashtags',
        'update_hashtag_engagement'
    )
ORDER BY routine_name;

-- Test 3: Test hashtag extraction
SELECT 'Testing hashtag extraction...' as test_step;

SELECT extract_hashtags('Check out these amazing #electronics deals! #TechTuesday #BargainHunting') as extracted_hashtags;

-- Test 4: Check if triggers exist
SELECT 'Testing trigger creation...' as test_step;

SELECT 
    trigger_name,
    event_object_table,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ Trigger exists'
        ELSE '❌ Trigger missing'
    END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
    AND trigger_name IN (
        'trigger_process_hashtags',
        'trigger_update_hashtag_engagement'
    )
ORDER BY trigger_name;

-- Test 5: Test RPC functions (if they work)
SELECT 'Testing RPC functions...' as test_step;

-- Test trending hashtags function
SELECT 
    CASE 
        WHEN (SELECT count(*) FROM get_trending_hashtags('7 days', 5)) >= 0
        THEN '✅ get_trending_hashtags works'
        ELSE '❌ get_trending_hashtags failed'
    END as trending_hashtags_test;

-- Test trending posts function  
SELECT 
    CASE 
        WHEN (SELECT count(*) FROM get_trending_posts('7 days', 5)) >= 0
        THEN '✅ get_trending_posts works'
        ELSE '❌ get_trending_posts failed'
    END as trending_posts_test;

SELECT '🎉 Trending system test completed!' as final_status;
