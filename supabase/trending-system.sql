-- Trending System Database Schema
-- This adds hashtag tracking and trending functionality

-- Create hashtags table to track all hashtags
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT UNIQUE NOT NULL CHECK (char_length(tag) >= 2 AND char_length(tag) <= 50),
    created_at TIMESTAMPTZ DEFAULT now(),
    posts_count INTEGER DEFAULT 0 CHECK (posts_count >= 0),
    total_engagement INTEGER DEFAULT 0 CHECK (total_engagement >= 0),
    last_used_at TIMESTAMPTZ DEFAULT now(),
    category TEXT DEFAULT 'general' CHECK (category IN ('electronics', 'fashion', 'home', 'automotive', 'general', 'food', 'beauty', 'sports', 'education', 'business'))
);

-- Create post_hashtags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS post_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, hashtag_id)
);

-- Create trending_topics table for tracking trending data with time periods
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    posts_count INTEGER DEFAULT 0 CHECK (posts_count >= 0),
    engagement_count INTEGER DEFAULT 0 CHECK (engagement_count >= 0),
    growth_percentage DECIMAL(5,2) DEFAULT 0,
    rank_position INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(hashtag_id, period_start, period_end)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_posts_count ON hashtags(posts_count DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_last_used ON hashtags(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_period ON trending_topics(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_trending_topics_rank ON trending_topics(rank_position ASC);

-- Enable RLS
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public read access for trending data)
DROP POLICY IF EXISTS "Anyone can view hashtags" ON hashtags;
CREATE POLICY "Anyone can view hashtags" ON hashtags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view post hashtags" ON post_hashtags;
CREATE POLICY "Anyone can view post hashtags" ON post_hashtags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view trending topics" ON trending_topics;
CREATE POLICY "Anyone can view trending topics" ON trending_topics FOR SELECT USING (true);

-- Function to extract hashtags from text
CREATE OR REPLACE FUNCTION extract_hashtags(content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    hashtag_pattern TEXT := '#[a-zA-Z0-9_]+';
    hashtags TEXT[];
    hashtag TEXT;
BEGIN
    -- Extract all hashtags using regex
    SELECT array_agg(DISTINCT lower(substring(match FROM 2))) -- Remove # and convert to lowercase
    INTO hashtags
    FROM regexp_split_to_table(content, '\s+') AS match
    WHERE match ~ hashtag_pattern
    AND char_length(substring(match FROM 2)) >= 2
    AND char_length(substring(match FROM 2)) <= 50;
    
    RETURN COALESCE(hashtags, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Function to process hashtags for a post
CREATE OR REPLACE FUNCTION process_post_hashtags(post_id_param UUID, content TEXT)
RETURNS VOID AS $$
DECLARE
    hashtag_text TEXT;
    hashtag_record RECORD;
    extracted_hashtags TEXT[];
BEGIN
    -- Extract hashtags from content
    extracted_hashtags := extract_hashtags(content);
    
    -- Process each hashtag
    FOREACH hashtag_text IN ARRAY extracted_hashtags
    LOOP
        -- Insert or update hashtag
        INSERT INTO hashtags (tag, posts_count, last_used_at)
        VALUES (hashtag_text, 1, now())
        ON CONFLICT (tag) DO UPDATE SET
            posts_count = hashtags.posts_count + 1,
            last_used_at = now();
        
        -- Get hashtag ID
        SELECT id INTO hashtag_record FROM hashtags WHERE tag = hashtag_text;
        
        -- Link post to hashtag
        INSERT INTO post_hashtags (post_id, hashtag_id)
        VALUES (post_id_param, hashtag_record.id)
        ON CONFLICT (post_id, hashtag_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update hashtag engagement
CREATE OR REPLACE FUNCTION update_hashtag_engagement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update engagement count for all hashtags in this post
    UPDATE hashtags 
    SET total_engagement = total_engagement + 1
    WHERE id IN (
        SELECT hashtag_id 
        FROM post_hashtags 
        WHERE post_id = COALESCE(NEW.id, OLD.id)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function wrapper for trigger (triggers can't pass parameters directly)
CREATE OR REPLACE FUNCTION trigger_process_post_hashtags()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM process_post_hashtags(NEW.id, NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically process hashtags
DROP TRIGGER IF EXISTS trigger_process_hashtags ON posts;
CREATE TRIGGER trigger_process_hashtags
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION trigger_process_post_hashtags();

-- Trigger to update engagement when posts get likes/comments
DROP TRIGGER IF EXISTS trigger_update_hashtag_engagement ON posts;
CREATE TRIGGER trigger_update_hashtag_engagement
    AFTER UPDATE OF likes_count, comments_count ON posts
    FOR EACH ROW EXECUTE FUNCTION update_hashtag_engagement();

-- Function to get trending hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(
    time_period INTERVAL DEFAULT '7 days',
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    tag TEXT,
    posts_count INTEGER,
    engagement_count INTEGER,
    growth_percentage DECIMAL,
    category TEXT,
    sample_posts TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.tag,
        h.posts_count,
        h.total_engagement as engagement_count,
        CASE 
            WHEN h.posts_count > 0 THEN 
                ROUND(((h.total_engagement::DECIMAL / h.posts_count) * 100), 2)
            ELSE 0
        END as growth_percentage,
        h.category,
        ARRAY(
            SELECT p.content
            FROM posts p
            JOIN post_hashtags ph ON p.id = ph.post_id
            WHERE ph.hashtag_id = h.id
            AND p.created_at >= (now() - time_period)
            ORDER BY p.likes_count DESC, p.created_at DESC
            LIMIT 3
        ) as sample_posts
    FROM hashtags h
    WHERE h.last_used_at >= (now() - time_period)
    AND h.posts_count > 0
    ORDER BY h.posts_count DESC, h.total_engagement DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending posts
CREATE OR REPLACE FUNCTION get_trending_posts(
    time_period INTERVAL DEFAULT '7 days',
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    author_name TEXT,
    author_avatar TEXT,
    likes_count INTEGER,
    comments_count INTEGER,
    views_count INTEGER,
    created_at TIMESTAMPTZ,
    hashtags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.content,
        CONCAT(pr.first_name, ' ', pr.last_name) as author_name,
        pr.avatar_url as author_avatar,
        p.likes_count,
        p.comments_count,
        COALESCE(p.views_count, 0) as views_count,
        p.created_at,
        ARRAY(
            SELECT h.tag
            FROM hashtags h
            JOIN post_hashtags ph ON h.id = ph.hashtag_id
            WHERE ph.post_id = p.id
        ) as hashtags
    FROM posts p
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.created_at >= (now() - time_period)
    ORDER BY 
        (p.likes_count + p.comments_count + COALESCE(p.views_count, 0)) DESC,
        p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get posts by hashtag
CREATE OR REPLACE FUNCTION get_posts_by_hashtag(
    hashtag_param TEXT,
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
    created_at TIMESTAMPTZ,
    images JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.content,
        CONCAT(pr.first_name, ' ', pr.last_name) as author_name,
        pr.avatar_url as author_avatar,
        p.likes_count,
        p.comments_count,
        p.created_at,
        p.images
    FROM posts p
    JOIN profiles pr ON p.user_id = pr.id
    JOIN post_hashtags ph ON p.id = ph.post_id
    JOIN hashtags h ON ph.hashtag_id = h.id
    WHERE h.tag = lower(hashtag_param)
    ORDER BY p.created_at DESC
    LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add views_count column to posts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0 CHECK (views_count >= 0);
        CREATE INDEX IF NOT EXISTS idx_posts_views_count ON posts(views_count DESC);
    END IF;
END $$;

-- Initialize trending data for existing posts
DO $$
DECLARE
    post_record RECORD;
BEGIN
    -- Process hashtags for existing posts
    FOR post_record IN SELECT id, content FROM posts WHERE content IS NOT NULL
    LOOP
        PERFORM process_post_hashtags(post_record.id, post_record.content);
    END LOOP;
    
    RAISE NOTICE 'Processed hashtags for existing posts';
END $$;

SELECT '✅ Trending system setup completed!' as status;
