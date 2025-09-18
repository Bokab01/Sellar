-- =============================================
-- TRENDING SYSTEM DIAGNOSTIC SCRIPT
-- =============================================
-- Run this to check the current state of your trending system

-- =============================================
-- CHECK 1: Tables Exist
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '🔍 CHECKING TABLES...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hashtags') THEN
        RAISE NOTICE '✅ hashtags table exists';
    ELSE
        RAISE NOTICE '❌ hashtags table MISSING - Run the trending system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_hashtags') THEN
        RAISE NOTICE '✅ post_hashtags table exists';
    ELSE
        RAISE NOTICE '❌ post_hashtags table MISSING - Run the trending system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trending_topics') THEN
        RAISE NOTICE '✅ trending_topics table exists';
    ELSE
        RAISE NOTICE '❌ trending_topics table MISSING - Run the trending system migration!';
    END IF;
END $$;

-- =============================================
-- CHECK 2: Functions Exist
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING FUNCTIONS...';
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_trending_hashtags') THEN
        RAISE NOTICE '✅ get_trending_hashtags function exists';
    ELSE
        RAISE NOTICE '❌ get_trending_hashtags function MISSING - Run the trending system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_trending_posts') THEN
        RAISE NOTICE '✅ get_trending_posts function exists';
    ELSE
        RAISE NOTICE '❌ get_trending_posts function MISSING - Run the trending system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_post_hashtags') THEN
        RAISE NOTICE '✅ process_post_hashtags function exists';
    ELSE
        RAISE NOTICE '❌ process_post_hashtags function MISSING - Run the trending system migration!';
    END IF;
END $$;

-- =============================================
-- CHECK 3: Sample Data
-- =============================================
DO $$
DECLARE
    hashtag_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING SAMPLE DATA...';
    
    SELECT COUNT(*) INTO hashtag_count FROM hashtags;
    
    IF hashtag_count > 0 THEN
        RAISE NOTICE '✅ Sample hashtags found: % hashtags', hashtag_count;
    ELSE
        RAISE NOTICE '❌ No sample hashtags found - Run the trending system migration!';
    END IF;
END $$;

-- =============================================
-- CHECK 4: Real Posts with Hashtags
-- =============================================
DO $$
DECLARE
    posts_with_hashtags INTEGER;
    total_posts INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING REAL DATA...';
    
    -- Count posts with hashtags
    SELECT COUNT(DISTINCT p.id) INTO posts_with_hashtags
    FROM posts p
    WHERE p.content ~ '#[a-zA-Z0-9_]+';
    
    -- Count total posts
    SELECT COUNT(*) INTO total_posts FROM posts;
    
    RAISE NOTICE '📊 Total posts: %', total_posts;
    RAISE NOTICE '📊 Posts with hashtags: %', posts_with_hashtags;
    
    IF posts_with_hashtags > 0 THEN
        RAISE NOTICE '✅ Found posts with hashtags!';
    ELSE
        RAISE NOTICE '⚠️ No posts with hashtags found - Create posts with #hashtags to see trending data';
    END IF;
END $$;

-- =============================================
-- CHECK 5: Test Functions
-- =============================================
DO $$
DECLARE
    trending_hashtags_count INTEGER;
    trending_posts_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 TESTING FUNCTIONS...';
    
    -- Test get_trending_hashtags
    BEGIN
        SELECT COUNT(*) INTO trending_hashtags_count FROM get_trending_hashtags('7 days', 10);
        RAISE NOTICE '✅ get_trending_hashtags works: % results', trending_hashtags_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ get_trending_hashtags failed: %', SQLERRM;
    END;
    
    -- Test get_trending_posts
    BEGIN
        SELECT COUNT(*) INTO trending_posts_count FROM get_trending_posts('7 days', 10);
        RAISE NOTICE '✅ get_trending_posts works: % results', trending_posts_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ get_trending_posts failed: %', SQLERRM;
    END;
END $$;

-- =============================================
-- CHECK 6: Show Current Trending Data
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CURRENT TRENDING DATA...';
END $$;

-- Show current hashtags
SELECT 
    'Current Hashtags:' as data_type,
    tag,
    posts_count,
    total_engagement,
    category
FROM hashtags 
ORDER BY total_engagement DESC, posts_count DESC 
LIMIT 5;

-- Show posts with hashtags
SELECT 
    'Posts with Hashtags:' as data_type,
    LEFT(content, 50) as content_preview,
    likes_count,
    comments_count,
    created_at
FROM posts 
WHERE content ~ '#[a-zA-Z0-9_]+'
ORDER BY created_at DESC 
LIMIT 3;

-- =============================================
-- RECOMMENDATIONS
-- =============================================
DO $$
DECLARE
    hashtag_count INTEGER;
    posts_with_hashtags INTEGER;
    function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RECOMMENDATIONS:';
    
    -- Check if functions exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_trending_hashtags'
    ) INTO function_exists;
    
    -- Check hashtag count
    SELECT COUNT(*) INTO hashtag_count FROM hashtags;
    
    -- Check posts with hashtags
    SELECT COUNT(DISTINCT p.id) INTO posts_with_hashtags
    FROM posts p
    WHERE p.content ~ '#[a-zA-Z0-9_]+';
    
    IF NOT function_exists THEN
        RAISE NOTICE '1. ❌ Run the trending system migration first!';
        RAISE NOTICE '   Copy supabase/migrations/07_trending_system.sql and run it';
    ELSIF hashtag_count = 0 THEN
        RAISE NOTICE '1. ❌ No sample data found - Run the migration again';
    ELSIF posts_with_hashtags = 0 THEN
        RAISE NOTICE '1. ✅ System is set up correctly';
        RAISE NOTICE '2. 📝 Create posts with hashtags like: "Check out this #electronics deal! #GhanaDeals"';
        RAISE NOTICE '3. 👍 Like and comment on posts to boost engagement';
        RAISE NOTICE '4. 🔄 Refresh the trending screen to see hashtags appear';
    ELSE
        RAISE NOTICE '1. ✅ System is working correctly!';
        RAISE NOTICE '2. 📱 Check your app - trending data should be visible';
        RAISE NOTICE '3. 🔄 If still showing dummy data, try refreshing the app';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your trending system status:';
    RAISE NOTICE '   Functions exist: %', function_exists;
    RAISE NOTICE '   Sample hashtags: %', hashtag_count;
    RAISE NOTICE '   Posts with hashtags: %', posts_with_hashtags;
END $$;
