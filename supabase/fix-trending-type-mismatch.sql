-- =============================================
-- FIX TRENDING SYSTEM TYPE MISMATCH
-- =============================================
-- Run this script to fix the type mismatch error in trending functions

-- Fix get_trending_hashtags function
CREATE OR REPLACE FUNCTION get_trending_hashtags(
    time_period TEXT DEFAULT '7 days',
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    tag VARCHAR(100),
    posts_count INTEGER,
    total_engagement INTEGER,
    growth_percentage DECIMAL(5,2),
    category VARCHAR(50),
    sample_posts TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.tag,
        h.posts_count,
        h.total_engagement,
        CASE 
            WHEN h.posts_count > 0 THEN 
                ROUND((h.total_engagement::DECIMAL / h.posts_count) * 100, 2)
            ELSE 0 
        END as growth_percentage,
        h.category,
        ARRAY(
            SELECT p.content::TEXT 
            FROM posts p
            JOIN post_hashtags ph ON p.id = ph.post_id
            WHERE ph.hashtag_id = h.id
            ORDER BY p.likes_count + p.comments_count + p.shares_count DESC
            LIMIT 3
        )::TEXT[] as sample_posts
    FROM hashtags h
    WHERE h.posts_count > 0
    ORDER BY h.total_engagement DESC, h.posts_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_trending_posts function
CREATE OR REPLACE FUNCTION get_trending_posts(
    time_period TEXT DEFAULT '7 days',
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    author_name TEXT,
    author_avatar TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    shares_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    hashtags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.content,
        COALESCE(pr.first_name || ' ' || pr.last_name, 'User') as author_name,
        pr.avatar_url as author_avatar,
        p.likes_count,
        p.comments_count,
        p.shares_count,
        p.created_at,
        ARRAY(
            SELECT h.tag::TEXT
            FROM hashtags h
            JOIN post_hashtags ph ON h.id = ph.hashtag_id
            WHERE ph.post_id = p.id
        )::TEXT[] as hashtags
    FROM posts p
    LEFT JOIN profiles pr ON p.user_id = pr.id
    WHERE p.created_at >= NOW() - time_period::INTERVAL
    ORDER BY (p.likes_count + p.comments_count + p.shares_count) DESC, p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions
DO $$
BEGIN
    RAISE NOTICE '✅ Type mismatch fix applied successfully!';
    RAISE NOTICE '🔧 Updated get_trending_hashtags function';
    RAISE NOTICE '🔧 Updated get_trending_posts function';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Testing functions...';
END $$;

-- Test get_trending_hashtags
SELECT 'Testing get_trending_hashtags...' as test_status;
SELECT COUNT(*) as hashtag_count FROM get_trending_hashtags('7 days', 10);

-- Test get_trending_posts  
SELECT 'Testing get_trending_posts...' as test_status;
SELECT COUNT(*) as post_count FROM get_trending_posts('7 days', 10);

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Type mismatch fix completed!';
    RAISE NOTICE '📱 Your trending screen should now work without errors';
END $$;
