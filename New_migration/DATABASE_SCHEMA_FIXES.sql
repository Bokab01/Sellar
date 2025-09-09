-- =============================================
-- DATABASE SCHEMA FIXES
-- Fix missing columns and tables for community features
-- =============================================

-- 1. Add missing 'type' column to posts table
-- Check if column exists first to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE posts ADD COLUMN type TEXT DEFAULT 'general';
        
        -- Add constraint for valid post types
        ALTER TABLE posts ADD CONSTRAINT posts_type_check 
        CHECK (type IN (
            'general', 'showcase', 'question', 'announcement', 
            'tips', 'review', 'event', 'collaboration',
            'listing', 'promotion', 'community'
        ));
        
        RAISE NOTICE 'Added type column to posts table';
    ELSE
        RAISE NOTICE 'Type column already exists in posts table';
    END IF;
END $$;

-- 2. Create hashtags table for trending functionality
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag TEXT NOT NULL UNIQUE,
    posts_count INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS post_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, hashtag_id)
);

-- 4. Create trending_topics table for time-based trending data
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    posts_count INTEGER DEFAULT 0,
    engagement_score DECIMAL DEFAULT 0,
    rank_position INTEGER,
    growth_rate DECIMAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hashtag_id, period_start, period_end)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_posts_count ON hashtags(posts_count DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_last_used ON hashtags(last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

CREATE INDEX IF NOT EXISTS idx_trending_topics_period ON trending_topics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_trending_topics_rank ON trending_topics(rank_position);
CREATE INDEX IF NOT EXISTS idx_trending_topics_engagement ON trending_topics(engagement_score DESC);

-- 6. Enable RLS on new tables
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for hashtags (public read, authenticated write)
CREATE POLICY "Anyone can view hashtags" ON hashtags
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert hashtags" ON hashtags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update hashtags" ON hashtags
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 8. Create RLS policies for post_hashtags
CREATE POLICY "Anyone can view post hashtags" ON post_hashtags
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their post hashtags" ON post_hashtags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = post_hashtags.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- 9. Create RLS policies for trending_topics (read-only for users)
CREATE POLICY "Anyone can view trending topics" ON trending_topics
    FOR SELECT USING (true);

-- 10. Create function to extract hashtags from text
CREATE OR REPLACE FUNCTION extract_hashtags(content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    hashtag_matches TEXT[];
    cleaned_hashtags TEXT[] := '{}';
    hashtag TEXT;
BEGIN
    -- Extract hashtags using regex (case insensitive)
    SELECT array_agg(DISTINCT lower(substring(match FROM 2)))
    INTO hashtag_matches
    FROM regexp_split_to_table(content, '\s+') AS match
    WHERE match ~ '^#[a-zA-Z0-9_]+$';
    
    -- Clean and validate hashtags
    IF hashtag_matches IS NOT NULL THEN
        FOREACH hashtag IN ARRAY hashtag_matches
        LOOP
            -- Only include hashtags that are 2-50 characters long
            IF length(hashtag) >= 2 AND length(hashtag) <= 50 THEN
                cleaned_hashtags := array_append(cleaned_hashtags, hashtag);
            END IF;
        END LOOP;
    END IF;
    
    RETURN cleaned_hashtags;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to process post hashtags
CREATE OR REPLACE FUNCTION process_post_hashtags(p_post_id UUID, p_content TEXT)
RETURNS VOID AS $$
DECLARE
    hashtag_list TEXT[];
    hashtag_text TEXT;
    hashtag_record RECORD;
BEGIN
    -- Extract hashtags from content
    hashtag_list := extract_hashtags(p_content);
    
    -- Remove existing hashtags for this post
    DELETE FROM post_hashtags WHERE post_id = p_post_id;
    
    -- Process each hashtag
    FOREACH hashtag_text IN ARRAY hashtag_list
    LOOP
        -- Insert or update hashtag
        INSERT INTO hashtags (tag, posts_count, last_used_at)
        VALUES (hashtag_text, 1, NOW())
        ON CONFLICT (tag) DO UPDATE SET
            posts_count = hashtags.posts_count + 1,
            last_used_at = NOW(),
            updated_at = NOW();
        
        -- Get hashtag ID
        SELECT id INTO hashtag_record FROM hashtags WHERE tag = hashtag_text;
        
        -- Link post to hashtag
        INSERT INTO post_hashtags (post_id, hashtag_id)
        VALUES (p_post_id, hashtag_record.id)
        ON CONFLICT (post_id, hashtag_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to get trending hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(
    time_period TEXT DEFAULT '7 days',
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    tag TEXT,
    posts_count INTEGER,
    total_likes INTEGER,
    total_comments INTEGER,
    total_shares INTEGER,
    engagement_score DECIMAL,
    growth_rate DECIMAL,
    sample_posts JSON
) AS $$
DECLARE
    period_interval INTERVAL;
BEGIN
    -- Convert time period to interval
    period_interval := time_period::INTERVAL;
    
    RETURN QUERY
    WITH hashtag_stats AS (
        SELECT 
            h.id,
            h.tag,
            h.posts_count,
            h.total_likes,
            h.total_comments,
            h.total_shares,
            -- Calculate engagement score
            (h.total_likes * 1.0 + h.total_comments * 2.0 + h.total_shares * 3.0) as engagement_score,
            -- Calculate growth rate (simplified)
            CASE 
                WHEN h.posts_count > 0 THEN 
                    (COUNT(ph.id) FILTER (WHERE p.created_at >= NOW() - period_interval)::DECIMAL / h.posts_count) * 100
                ELSE 0 
            END as growth_rate
        FROM hashtags h
        LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
        LEFT JOIN posts p ON ph.post_id = p.id
        WHERE h.last_used_at >= NOW() - period_interval
        GROUP BY h.id, h.tag, h.posts_count, h.total_likes, h.total_comments, h.total_shares
    ),
    sample_posts_data AS (
        SELECT 
            h.id as hashtag_id,
            json_agg(
                json_build_object(
                    'id', p.id,
                    'content', LEFT(p.content, 100),
                    'likes_count', p.likes_count,
                    'created_at', p.created_at
                ) ORDER BY p.likes_count DESC
            ) FILTER (WHERE p.id IS NOT NULL) as sample_posts
        FROM hashtags h
        LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
        LEFT JOIN posts p ON ph.post_id = p.id
        WHERE h.last_used_at >= NOW() - period_interval
        GROUP BY h.id
    )
    SELECT 
        hs.id,
        hs.tag,
        hs.posts_count,
        hs.total_likes,
        hs.total_comments,
        hs.total_shares,
        hs.engagement_score,
        hs.growth_rate,
        COALESCE(spd.sample_posts, '[]'::json) as sample_posts
    FROM hashtag_stats hs
    LEFT JOIN sample_posts_data spd ON hs.id = spd.hashtag_id
    ORDER BY hs.engagement_score DESC, hs.posts_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger to automatically process hashtags when posts are created/updated
CREATE OR REPLACE FUNCTION trigger_process_post_hashtags()
RETURNS TRIGGER AS $$
BEGIN
    -- Process hashtags for new or updated posts
    PERFORM process_post_hashtags(NEW.id, NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS posts_hashtags_trigger ON posts;
CREATE TRIGGER posts_hashtags_trigger
    AFTER INSERT OR UPDATE OF content ON posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_process_post_hashtags();

-- 14. Create function to update hashtag engagement stats
CREATE OR REPLACE FUNCTION update_hashtag_engagement()
RETURNS VOID AS $$
BEGIN
    UPDATE hashtags SET
        total_likes = COALESCE((
            SELECT SUM(p.likes_count)
            FROM post_hashtags ph
            JOIN posts p ON ph.post_id = p.id
            WHERE ph.hashtag_id = hashtags.id
        ), 0),
        total_comments = COALESCE((
            SELECT SUM(p.comments_count)
            FROM post_hashtags ph
            JOIN posts p ON ph.post_id = p.id
            WHERE ph.hashtag_id = hashtags.id
        ), 0),
        total_shares = COALESCE((
            SELECT SUM(p.shares_count)
            FROM post_hashtags ph
            JOIN posts p ON ph.post_id = p.id
            WHERE ph.hashtag_id = hashtags.id
        ), 0),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Add some sample hashtags for testing (optional)
INSERT INTO hashtags (tag, posts_count, total_likes, total_comments, total_shares) VALUES
    ('electronics', 5, 25, 10, 3),
    ('deals', 8, 40, 15, 8),
    ('fashion', 3, 15, 8, 2),
    ('food', 6, 30, 20, 5),
    ('tech', 10, 50, 25, 12),
    ('business', 4, 20, 12, 4)
ON CONFLICT (tag) DO NOTHING;

-- 16. Update existing posts to have default type if null
UPDATE posts SET type = 'general' WHERE type IS NULL;

-- 17. Final completion notice
DO $$ 
BEGIN
    RAISE NOTICE 'Database schema fixes completed successfully!';
    RAISE NOTICE 'Added: type column to posts, hashtags system, trending functionality';
    RAISE NOTICE 'You can now use the trending features and post types will work correctly.';
END $$;
