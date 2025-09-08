-- =============================================
-- FIX POSTS TABLE RLS POLICIES
-- Add missing RLS policies for posts table to allow users to create posts
-- =============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view published posts" ON posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;
DROP POLICY IF EXISTS "Users can manage their own posts" ON posts;

-- Create RLS policies for posts table
-- First check if status column exists and what values it has

-- Allow users to view their own posts (regardless of status)
CREATE POLICY "Users can view their own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to manage their own posts (insert, update, delete)
CREATE POLICY "Users can manage their own posts" ON posts
    FOR ALL USING (auth.uid() = user_id);

-- Check if status column exists and create appropriate policy
DO $$
BEGIN
    -- Check if status column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        -- Status column exists, create policy based on status values
        -- Check what status values are allowed
        IF EXISTS (
            SELECT 1 
            FROM information_schema.check_constraints 
            WHERE constraint_name LIKE '%posts_status%' 
            AND check_clause LIKE '%published%'
        ) THEN
            -- Schema uses 'published' status
            EXECUTE 'CREATE POLICY "Anyone can view published posts" ON posts FOR SELECT USING (status = ''published'')';
        ELSIF EXISTS (
            SELECT 1 
            FROM information_schema.check_constraints 
            WHERE constraint_name LIKE '%posts_status%' 
            AND check_clause LIKE '%active%'
        ) THEN
            -- Schema uses 'active' status
            EXECUTE 'CREATE POLICY "Anyone can view active posts" ON posts FOR SELECT USING (status = ''active'')';
        ELSE
            -- Default to allowing all posts if status values are unclear
            EXECUTE 'CREATE POLICY "Anyone can view all posts" ON posts FOR SELECT USING (true)';
        END IF;
    ELSE
        -- No status column, allow viewing all posts
        EXECUTE 'CREATE POLICY "Anyone can view all posts" ON posts FOR SELECT USING (true)';
    END IF;
END $$;

-- Also add policies for post_likes table
DROP POLICY IF EXISTS "Users can manage their own post likes" ON post_likes;

CREATE POLICY "Users can manage their own post likes" ON post_likes
    FOR ALL USING (auth.uid() = user_id);

-- Add policies for comments table
DROP POLICY IF EXISTS "Anyone can view published comments" ON comments;
DROP POLICY IF EXISTS "Users can view their own comments" ON comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON comments;

CREATE POLICY "Anyone can view active comments" ON comments
    FOR SELECT USING (status = 'active');

CREATE POLICY "Users can view their own comments" ON comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comments" ON comments
    FOR ALL USING (auth.uid() = user_id);

-- Add policies for shares table (if it exists)
DROP POLICY IF EXISTS "Users can manage their own shares" ON shares;

CREATE POLICY "Users can manage their own shares" ON shares
    FOR ALL USING (auth.uid() = user_id);

-- Add policies for post_bookmarks table (if it exists)
DROP POLICY IF EXISTS "Users can manage their own post bookmarks" ON post_bookmarks;

CREATE POLICY "Users can manage their own post bookmarks" ON post_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('posts', 'post_likes', 'comments', 'shares', 'post_bookmarks')
ORDER BY tablename, policyname;
