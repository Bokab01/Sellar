-- =============================================
-- FIX POSTS-LISTINGS RELATIONSHIP
-- Add missing listing_id column to posts table
-- =============================================

-- Check if posts table exists and add missing columns
DO $$
BEGIN
    -- Add listing_id column if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        
        -- Check current posts table structure
        RAISE NOTICE 'Posts table exists, checking columns...';
        
        -- The existing posts table already has listing_id and location from the original migration
        -- Just verify they exist and add if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'listing_id') THEN
            ALTER TABLE posts ADD COLUMN listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added listing_id column to posts table';
        ELSE
            RAISE NOTICE 'listing_id column already exists in posts table';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'location') THEN
            ALTER TABLE posts ADD COLUMN location TEXT;
            RAISE NOTICE 'Added location column to posts table';
        ELSE
            RAISE NOTICE 'location column already exists in posts table';
        END IF;
        
    ELSE
        RAISE NOTICE 'Posts table does not exist - this should not happen in your current setup';
    END IF;
END $$;

-- Create indexes for posts if they don't exist (only for existing columns)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_listing_id ON posts(listing_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);

-- Enable RLS on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for posts (updated for existing schema)
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
CREATE POLICY "Users can view all posts" ON posts
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create own posts" ON posts;
CREATE POLICY "Users can create own posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts" ON posts
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts" ON posts
FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- COMMENTS TABLE (if missing)
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments' AND table_schema = 'public') THEN
        CREATE TABLE comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
            
            -- Comment Content
            content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
            
            -- Engagement
            likes_count INTEGER DEFAULT 0,
            
            -- Status
            status TEXT DEFAULT 'published' CHECK (status IN ('published', 'edited', 'deleted', 'reported', 'removed')),
            
            -- Moderation
            is_moderated BOOLEAN DEFAULT FALSE,
            moderated_by UUID REFERENCES profiles(id),
            moderated_at TIMESTAMPTZ,
            
            -- Timestamps
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Add indexes for comments
        CREATE INDEX idx_comments_post_id ON comments(post_id);
        CREATE INDEX idx_comments_user_id ON comments(user_id);
        CREATE INDEX idx_comments_parent_id ON comments(parent_id);
        CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
        
        -- Enable RLS
        ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies for comments
        CREATE POLICY "Users can view all comments" ON comments
        FOR SELECT USING (true);
        
        CREATE POLICY "Users can create own comments" ON comments
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update own comments" ON comments
        FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete own comments" ON comments
        FOR DELETE USING (auth.uid() = user_id);
        
        RAISE NOTICE 'Created comments table with RLS policies';
    END IF;
END $$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify the fix
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'listing_id'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✅ Posts table now has listing_id column - relationship fixed!';
    ELSE
        RAISE NOTICE '❌ Posts table still missing listing_id column';
    END IF;
END $$;

SELECT 'Posts-Listings relationship fix completed!' as status;
