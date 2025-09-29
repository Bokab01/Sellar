-- =============================================
-- TRENDING SYSTEM MIGRATION
-- =============================================
-- This migration creates the complete trending hashtags system
-- Run this in your Supabase SQL Editor to enable trending functionality

-- =============================================
-- TABLES
-- =============================================

-- Hashtags table to store all hashtags with engagement metrics
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag VARCHAR(100) UNIQUE NOT NULL,
    posts_count INTEGER DEFAULT 0,
    total_engagement INTEGER DEFAULT 0,
    category VARCHAR(50) DEFAULT 'general',
    first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post-hashtags relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS post_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, hashtag_id)
);

-- Trending topics table for time-based trending data
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    time_period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
    rank_position INTEGER NOT NULL,
    posts_count INTEGER DEFAULT 0,
    engagement_count INTEGER DEFAULT 0,
    growth_percentage DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hashtag_id, time_period, calculated_at)
);

-- =============================================
-- INDEXES
-- =============================================

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_posts_count ON hashtags(posts_count DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_engagement ON hashtags(total_engagement DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_category ON hashtags(category);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

CREATE INDEX IF NOT EXISTS idx_trending_topics_period ON trending_topics(time_period);
CREATE INDEX IF NOT EXISTS idx_trending_topics_rank ON trending_topics(rank_position);
CREATE INDEX IF NOT EXISTS idx_trending_topics_calculated ON trending_topics(calculated_at DESC);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to extract hashtags from text content
CREATE OR REPLACE FUNCTION extract_hashtags(content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    hashtags TEXT[];
BEGIN
    -- Extract hashtags using regex (words starting with #)
    SELECT array_agg(DISTINCT lower(substring(match[1] from 2))) 
    INTO hashtags
    FROM regexp_matches(content, '#([a-zA-Z0-9_]+)', 'g') AS match;
    
    RETURN COALESCE(hashtags, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to categorize hashtags
CREATE OR REPLACE FUNCTION categorize_hashtag(tag TEXT)
RETURNS VARCHAR(50) AS $$
BEGIN
    -- Electronics and tech
    IF tag ~* '(phone|iphone|android|laptop|computer|gaming|tech|electronics|gadget|smartphone|tablet|pc|mac|windows)' THEN
        RETURN 'electronics';
    END IF;
    
    -- Fashion and beauty
    IF tag ~* '(fashion|clothes|dress|shoes|bag|beauty|makeup|style|outfit|jewelry|watch|perfume)' THEN
        RETURN 'fashion';
    END IF;
    
    -- Home and furniture
    IF tag ~* '(home|house|furniture|decor|kitchen|bedroom|living|garden|interior|appliance)' THEN
        RETURN 'home';
    END IF;
    
    -- Automotive
    IF tag ~* '(car|vehicle|auto|motor|bike|truck|suv|honda|toyota|bmw|mercedes|ford)' THEN
        RETURN 'automotive';
    END IF;
    
    -- Food and dining
    IF tag ~* '(food|restaurant|cooking|recipe|meal|dining|chef|kitchen|delivery|takeout)' THEN
        RETURN 'food';
    END IF;
    
    -- Sports and fitness
    IF tag ~* '(sports|fitness|gym|football|soccer|basketball|running|workout|exercise|training)' THEN
        RETURN 'sports';
    END IF;
    
    -- Education
    IF tag ~* '(education|school|university|course|learning|study|book|student|teacher|academic)' THEN
        RETURN 'education';
    END IF;
    
    -- Business
    IF tag ~* '(business|work|job|career|office|meeting|professional|company|startup|entrepreneur)' THEN
        RETURN 'business';
    END IF;
    
    -- Default to general
    RETURN 'general';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to process hashtags for a post
CREATE OR REPLACE FUNCTION process_post_hashtags(p_post_id UUID, p_content TEXT)
RETURNS VOID AS $$
DECLARE
    extracted_hashtags TEXT[];
    hashtag_text TEXT;
    current_hashtag_id UUID; -- Renamed to avoid ambiguity
    hashtag_category VARCHAR(50);
BEGIN
    -- Extract hashtags from content
    extracted_hashtags := extract_hashtags(p_content);
    
    -- Process each hashtag
    FOREACH hashtag_text IN ARRAY extracted_hashtags
    LOOP
        -- Get or create hashtag
        INSERT INTO hashtags (tag, category, first_used_at, last_used_at)
        VALUES (hashtag_text, categorize_hashtag(hashtag_text), NOW(), NOW())
        ON CONFLICT (tag) 
        DO UPDATE SET 
            posts_count = hashtags.posts_count + 1,
            last_used_at = NOW(),
            updated_at = NOW();
        
        -- Get hashtag ID (using renamed variable)
        SELECT h.id INTO current_hashtag_id FROM hashtags h WHERE h.tag = hashtag_text;
        
        -- Link hashtag to post
        INSERT INTO post_hashtags (post_id, hashtag_id)
        VALUES (p_post_id, current_hashtag_id)
        ON CONFLICT (post_id, hashtag_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update hashtag engagement counts
CREATE OR REPLACE FUNCTION update_hashtag_engagement()
RETURNS TRIGGER AS $$
DECLARE
    post_hashtag_ids UUID[];
    current_hashtag_id UUID; -- Renamed to avoid ambiguity
BEGIN
    -- Get all hashtags for the affected post
    SELECT array_agg(ph.hashtag_id) INTO post_hashtag_ids
    FROM post_hashtags ph
    WHERE ph.post_id = COALESCE(NEW.post_id, OLD.post_id);
    
    -- Update engagement for each hashtag
    IF post_hashtag_ids IS NOT NULL THEN
        FOREACH current_hashtag_id IN ARRAY post_hashtag_ids
        LOOP
            -- Recalculate total engagement for this hashtag
            UPDATE hashtags 
            SET total_engagement = (
                SELECT COALESCE(SUM(p.likes_count + p.comments_count + p.shares_count), 0)
                FROM posts p
                JOIN post_hashtags ph ON p.id = ph.post_id
                WHERE ph.hashtag_id = current_hashtag_id
            ),
            updated_at = NOW()
            WHERE id = current_hashtag_id;
        END LOOP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending hashtags
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

-- Function to get trending posts
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

-- Function to get posts by hashtag
CREATE OR REPLACE FUNCTION get_posts_by_hashtag(
    hashtag_name TEXT,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    author_name TEXT,
    author_avatar TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    shares_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
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
        p.created_at
    FROM posts p
    JOIN post_hashtags ph ON p.id = ph.post_id
    JOIN hashtags h ON ph.hashtag_id = h.id
    LEFT JOIN profiles pr ON p.user_id = pr.id
    WHERE h.tag = hashtag_name
    ORDER BY p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to process hashtags when a post is created
CREATE OR REPLACE FUNCTION trigger_process_post_hashtags()
RETURNS TRIGGER AS $$
BEGIN
    -- Process hashtags for new posts
    IF TG_OP = 'INSERT' THEN
        PERFORM process_post_hashtags(NEW.id, NEW.content);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for post hashtag processing
DROP TRIGGER IF EXISTS trigger_process_post_hashtags ON posts;
CREATE TRIGGER trigger_process_post_hashtags
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_process_post_hashtags();

-- Create triggers for engagement updates
DROP TRIGGER IF EXISTS trigger_update_hashtag_engagement_likes ON likes;
CREATE TRIGGER trigger_update_hashtag_engagement_likes
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_hashtag_engagement();

DROP TRIGGER IF EXISTS trigger_update_hashtag_engagement_comments ON comments;
CREATE TRIGGER trigger_update_hashtag_engagement_comments
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_hashtag_engagement();

DROP TRIGGER IF EXISTS trigger_update_hashtag_engagement_shares ON shares;
CREATE TRIGGER trigger_update_hashtag_engagement_shares
    AFTER INSERT OR DELETE ON shares
    FOR EACH ROW
    EXECUTE FUNCTION update_hashtag_engagement();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- Hashtags: Read-only for all authenticated users
CREATE POLICY "Hashtags are viewable by all users" ON hashtags
    FOR SELECT USING (true);

-- Post-hashtags: Read-only for all authenticated users
CREATE POLICY "Post-hashtags are viewable by all users" ON post_hashtags
    FOR SELECT USING (true);

-- Trending topics: Read-only for all authenticated users
CREATE POLICY "Trending topics are viewable by all users" ON trending_topics
    FOR SELECT USING (true);

-- =============================================
-- SAMPLE DATA REMOVED
-- =============================================

-- Sample data has been removed to show only real user-generated content
-- The trending system will now display authentic trending topics from actual posts

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Trending system setup completed successfully!';
    RAISE NOTICE '📊 Tables created: hashtags, post_hashtags, trending_topics';
    RAISE NOTICE '⚙️ Functions created: extract_hashtags, process_post_hashtags, get_trending_hashtags, get_trending_posts';
    RAISE NOTICE '🔄 Triggers created: Automatic hashtag processing and engagement updates';
    RAISE NOTICE '🔒 RLS policies enabled for secure access';
    RAISE NOTICE '🎯 Sample data removed - showing only real user content';
    RAISE NOTICE '🔧 Fixed: Ambiguous hashtag_id references resolved';
    RAISE NOTICE '🔧 Fixed: Type mismatches resolved for proper data flow';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your trending system is now ready!';
    RAISE NOTICE '   - Create posts with hashtags to see them trend';
    RAISE NOTICE '   - Like and comment on posts to boost engagement';
    RAISE NOTICE '   - Check the trending screen to see real trending topics';
    RAISE NOTICE '   - No more dummy data - only authentic content!';
END $$;
