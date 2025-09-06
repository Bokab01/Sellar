-- =============================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- Comprehensive Row Level Security policies
-- =============================================

-- First, ensure all required columns exist in profiles table
DO $$
BEGIN
    -- Add profile_visibility column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_visibility') THEN
        ALTER TABLE profiles ADD COLUMN profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private'));
    END IF;
    
    -- Add show_phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_phone') THEN
        ALTER TABLE profiles ADD COLUMN show_phone BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add show_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_email') THEN
        ALTER TABLE profiles ADD COLUMN show_email BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add show_location column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_location') THEN
        ALTER TABLE profiles ADD COLUMN show_location BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles based on visibility" ON profiles;

-- Enable RLS on profiles table (should already be enabled, but ensure it)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES RLS POLICIES
-- =============================================

-- Policy 1: Users can view profiles based on visibility settings
CREATE POLICY "Users can view profiles based on visibility" ON profiles
    FOR SELECT USING (
        -- Public profiles are viewable by everyone
        profile_visibility = 'public' OR
        -- Users can always view their own profile
        auth.uid() = id OR
        -- Friends can view friend profiles (when friends system is implemented)
        (profile_visibility = 'friends' AND auth.uid() = id) OR
        -- Private profiles only visible to owner
        (profile_visibility = 'private' AND auth.uid() = id)
    );

-- Policy 2: Users can insert their own profile (for handle_new_user function)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy 4: Users can delete their own profile (if needed)
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE USING (auth.uid() = id);

-- =============================================
-- USER_SETTINGS RLS POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;

-- Policy 1: Users can view their own settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- CONVERSATIONS RLS POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;

-- Policy 1: Users can view conversations they're part of
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Policy 2: Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Policy 3: Users can update conversations they're part of
CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- =============================================
-- MESSAGES RLS POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;

-- Policy 1: Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

-- Policy 2: Users can send messages in conversations they're part of
CREATE POLICY "Users can send messages in own conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    );

-- Policy 3: Users can update their own messages
CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- =============================================
-- OFFERS RLS POLICIES
-- =============================================

-- Policy 1: Users can view offers related to their listings or their own offers
CREATE POLICY "Users can view related offers" ON offers
    FOR SELECT USING (
        auth.uid() = buyer_id OR 
        auth.uid() = seller_id OR
        EXISTS (
            SELECT 1 FROM listings 
            WHERE listings.id = offers.listing_id 
            AND listings.user_id = auth.uid()
        )
    );

-- Policy 2: Users can create offers for listings
CREATE POLICY "Users can create offers" ON offers
    FOR INSERT WITH CHECK (
        auth.uid() = buyer_id AND
        EXISTS (
            SELECT 1 FROM listings 
            WHERE listings.id = offers.listing_id 
            AND listings.user_id != auth.uid()
        )
    );

-- Policy 3: Users can update offers they're part of
CREATE POLICY "Users can update related offers" ON offers
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- =============================================
-- POSTS RLS POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;

-- Policy 1: Published posts are viewable by everyone
CREATE POLICY "Published posts are viewable by everyone" ON posts
    FOR SELECT USING (status = 'published');

-- Policy 2: Users can view their own posts regardless of status
CREATE POLICY "Users can view own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 3: Users can create posts
CREATE POLICY "Users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own posts
CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- COMMENTS RLS POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Comments on published posts are viewable" ON comments;

-- Policy 1: Comments on published posts are viewable
CREATE POLICY "Comments on published posts are viewable" ON comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = comments.post_id 
            AND posts.status = 'published'
        )
    );

-- Policy 2: Users can view their own comments
CREATE POLICY "Users can view own comments" ON comments
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 3: Users can create comments on published posts
CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM posts 
            WHERE posts.id = comments.post_id 
            AND posts.status = 'published'
        )
    );

-- Policy 4: Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- NOTIFICATIONS RLS POLICIES
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

-- Policy 1: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: System can create notifications for users
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- This allows the system to create notifications

-- Policy 3: Users can update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify all policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_settings', 'conversations', 'messages', 'offers', 'posts', 'comments', 'notifications')
ORDER BY tablename, policyname;

-- Test that RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_settings', 'conversations', 'messages', 'offers', 'posts', 'comments', 'notifications')
ORDER BY tablename;

SELECT 'RLS policies updated successfully' as status;
