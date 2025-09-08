-- =============================================
-- FIX POSTS TABLE RLS POLICIES (SIMPLE VERSION)
-- Add missing RLS policies for posts table without relying on status column
-- =============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view published posts" ON posts;
DROP POLICY IF EXISTS "Anyone can view active posts" ON posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;
DROP POLICY IF EXISTS "Users can manage their own posts" ON posts;

-- Create RLS policies for posts table
-- Allow users to view their own posts (regardless of status)
CREATE POLICY "Users can view their own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to manage their own posts (insert, update, delete)
CREATE POLICY "Users can manage their own posts" ON posts
    FOR ALL USING (auth.uid() = user_id);

-- Allow anyone to view posts (simplified - no status filtering)
CREATE POLICY "Anyone can view posts" ON posts
    FOR SELECT USING (true);

-- Also add policies for post_likes table
DROP POLICY IF EXISTS "Users can manage their own post likes" ON post_likes;

CREATE POLICY "Users can manage their own post likes" ON post_likes
    FOR ALL USING (auth.uid() = user_id);

-- Add policies for comments table (if it exists)
DROP POLICY IF EXISTS "Anyone can view active comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Users can view their own comments" ON comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON comments;

CREATE POLICY "Users can view their own comments" ON comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comments" ON comments
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view comments" ON comments
    FOR SELECT USING (true);

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
