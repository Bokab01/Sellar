-- =============================================
-- TRENDING SYSTEM TEST SCRIPT
-- =============================================
-- Run this after applying the trending system migration
-- to verify everything is working correctly

-- =============================================
-- TEST 1: Check if tables exist
-- =============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtags') THEN
        RAISE NOTICE '✅ hashtags table exists';
    ELSE
        RAISE NOTICE '❌ hashtags table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_hashtags') THEN
        RAISE NOTICE '✅ post_hashtags table exists';
    ELSE
        RAISE NOTICE '❌ post_hashtags table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trending_topics') THEN
        RAISE NOTICE '✅ trending_topics table exists';
    ELSE
        RAISE NOTICE '❌ trending_topics table missing';
    END IF;
END $$;

-- =============================================
-- TEST 2: Check if functions exist
-- =============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'extract_hashtags') THEN
        RAISE NOTICE '✅ extract_hashtags function exists';
    ELSE
        RAISE NOTICE '❌ extract_hashtags function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_post_hashtags') THEN
        RAISE NOTICE '✅ process_post_hashtags function exists';
    ELSE
        RAISE NOTICE '❌ process_post_hashtags function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_trending_hashtags') THEN
        RAISE NOTICE '✅ get_trending_hashtags function exists';
    ELSE
        RAISE NOTICE '❌ get_trending_hashtags function missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_trending_posts') THEN
        RAISE NOTICE '✅ get_trending_posts function exists';
    ELSE
        RAISE NOTICE '❌ get_trending_posts function missing';
    END IF;
END $$;

-- =============================================
-- TEST 3: Test hashtag extraction
-- =============================================
DO $$
DECLARE
    test_hashtags TEXT[];
BEGIN
    test_hashtags := extract_hashtags('Check out this amazing #electronics deal! #GhanaDeals #TechTuesday');
    
    IF array_length(test_hashtags, 1) = 3 THEN
        RAISE NOTICE '✅ Hashtag extraction works: %', test_hashtags;
    ELSE
        RAISE NOTICE '❌ Hashtag extraction failed: %', test_hashtags;
    END IF;
END $$;

-- =============================================
-- TEST 4: Test hashtag categorization
-- =============================================
DO $$
DECLARE
    category_result VARCHAR(50);
BEGIN
    category_result := categorize_hashtag('iphone');
    IF category_result = 'electronics' THEN
        RAISE NOTICE '✅ Hashtag categorization works: iphone -> %', category_result;
    ELSE
        RAISE NOTICE '❌ Hashtag categorization failed: iphone -> %', category_result;
    END IF;
    
    category_result := categorize_hashtag('fashion');
    IF category_result = 'fashion' THEN
        RAISE NOTICE '✅ Hashtag categorization works: fashion -> %', category_result;
    ELSE
        RAISE NOTICE '❌ Hashtag categorization failed: fashion -> %', category_result;
    END IF;
END $$;

-- =============================================
-- TEST 5: Test trending hashtags function
-- =============================================
DO $$
DECLARE
    result_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO result_count FROM get_trending_hashtags('7 days', 10);
    
    IF result_count > 0 THEN
        RAISE NOTICE '✅ get_trending_hashtags function works: % results', result_count;
    ELSE
        RAISE NOTICE '⚠️ get_trending_hashtags function works but no data yet';
    END IF;
END $$;

-- =============================================
-- TEST 6: Test trending posts function
-- =============================================
DO $$
DECLARE
    result_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO result_count FROM get_trending_posts('7 days', 10);
    
    IF result_count > 0 THEN
        RAISE NOTICE '✅ get_trending_posts function works: % results', result_count;
    ELSE
        RAISE NOTICE '⚠️ get_trending_posts function works but no data yet';
    END IF;
END $$;

-- =============================================
-- TEST 7: Check sample data
-- =============================================
DO $$
DECLARE
    hashtag_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO hashtag_count FROM hashtags;
    
    IF hashtag_count > 0 THEN
        RAISE NOTICE '✅ Sample hashtags loaded: % hashtags', hashtag_count;
    ELSE
        RAISE NOTICE '❌ No sample hashtags found';
    END IF;
END $$;

-- =============================================
-- TEST 8: Display current trending hashtags
-- =============================================
SELECT 
    'Current Trending Hashtags:' as test_result,
    tag,
    posts_count,
    total_engagement,
    category
FROM hashtags 
ORDER BY total_engagement DESC, posts_count DESC 
LIMIT 5;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Trending system test completed!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Create posts with hashtags like #GhanaDeals #TechTuesday';
    RAISE NOTICE '   2. Like and comment on posts to boost engagement';
    RAISE NOTICE '   3. Check the trending screen in your app';
    RAISE NOTICE '   4. Watch hashtags appear and rankings update!';
    RAISE NOTICE '';
    RAISE NOTICE '🔥 Your trending system is ready to go!';
END $$;
