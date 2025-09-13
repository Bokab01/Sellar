-- =============================================
-- SELLAR MOBILE APP - SOCIAL FEATURES RPC FUNCTIONS
-- Migration 27: Add missing RPC functions for followers/following functionality
-- =============================================

-- Ensure follows table exists
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't follow themselves
    CHECK (follower_id != following_id),
    
    UNIQUE(follower_id, following_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);

-- =============================================
-- RPC FUNCTION: Get User Followers
-- =============================================

CREATE OR REPLACE FUNCTION get_user_followers(
    target_user_id UUID,
    page_limit INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN,
    followers_count INTEGER,
    following_count INTEGER,
    followed_at TIMESTAMPTZ,
    is_following_back BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.avatar_url,
        COALESCE(p.is_verified, false) as is_verified,
        COALESCE(p.followers_count, 0) as followers_count,
        COALESCE(p.following_count, 0) as following_count,
        f.created_at as followed_at,
        -- Check if the target user is following this follower back
        EXISTS(
            SELECT 1 FROM follows f2 
            WHERE f2.follower_id = target_user_id 
            AND f2.following_id = p.id
        ) as is_following_back
    FROM follows f
    JOIN profiles p ON f.follower_id = p.id
    WHERE f.following_id = target_user_id
    ORDER BY f.created_at DESC
    LIMIT page_limit
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC FUNCTION: Get User Following
-- =============================================

CREATE OR REPLACE FUNCTION get_user_following(
    target_user_id UUID,
    page_limit INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN,
    followers_count INTEGER,
    following_count INTEGER,
    followed_at TIMESTAMPTZ,
    is_mutual BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.avatar_url,
        COALESCE(p.is_verified, false) as is_verified,
        COALESCE(p.followers_count, 0) as followers_count,
        COALESCE(p.following_count, 0) as following_count,
        f.created_at as followed_at,
        -- Check if this is a mutual follow (they follow back)
        EXISTS(
            SELECT 1 FROM follows f2 
            WHERE f2.follower_id = p.id 
            AND f2.following_id = target_user_id
        ) as is_mutual
    FROM follows f
    JOIN profiles p ON f.following_id = p.id
    WHERE f.follower_id = target_user_id
    ORDER BY f.created_at DESC
    LIMIT page_limit
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC FUNCTION: Follow User
-- =============================================

CREATE OR REPLACE FUNCTION follow_user(target_user_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is trying to follow themselves
    IF current_user_id = target_user_id THEN
        RETURN QUERY SELECT false, 'Cannot follow yourself'::TEXT;
        RETURN;
    END IF;
    
    -- Check if already following
    IF EXISTS(
        SELECT 1 FROM follows 
        WHERE follower_id = current_user_id 
        AND following_id = target_user_id
    ) THEN
        RETURN QUERY SELECT false, 'Already following this user'::TEXT;
        RETURN;
    END IF;
    
    -- Insert follow relationship
    INSERT INTO follows (follower_id, following_id)
    VALUES (current_user_id, target_user_id);
    
    -- Update follower counts
    UPDATE profiles 
    SET following_count = COALESCE(following_count, 0) + 1
    WHERE id = current_user_id;
    
    UPDATE profiles 
    SET followers_count = COALESCE(followers_count, 0) + 1
    WHERE id = target_user_id;
    
    RETURN QUERY SELECT true, 'Successfully followed user'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC FUNCTION: Unfollow User
-- =============================================

CREATE OR REPLACE FUNCTION unfollow_user(target_user_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
    current_user_id UUID;
    follow_exists BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if follow relationship exists
    SELECT EXISTS(
        SELECT 1 FROM follows 
        WHERE follower_id = current_user_id 
        AND following_id = target_user_id
    ) INTO follow_exists;
    
    IF NOT follow_exists THEN
        RETURN QUERY SELECT false, 'Not following this user'::TEXT;
        RETURN;
    END IF;
    
    -- Delete follow relationship
    DELETE FROM follows 
    WHERE follower_id = current_user_id 
    AND following_id = target_user_id;
    
    -- Update follower counts
    UPDATE profiles 
    SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
    WHERE id = current_user_id;
    
    UPDATE profiles 
    SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
    WHERE id = target_user_id;
    
    RETURN QUERY SELECT true, 'Successfully unfollowed user'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC FUNCTION: Check Follow Status
-- =============================================

CREATE OR REPLACE FUNCTION check_follow_status(target_user_id UUID)
RETURNS TABLE (
    is_following BOOLEAN,
    is_followed_by BOOLEAN,
    is_mutual BOOLEAN
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        EXISTS(
            SELECT 1 FROM follows 
            WHERE follower_id = current_user_id 
            AND following_id = target_user_id
        ) as is_following,
        EXISTS(
            SELECT 1 FROM follows 
            WHERE follower_id = target_user_id 
            AND following_id = current_user_id
        ) as is_followed_by,
        EXISTS(
            SELECT 1 FROM follows f1
            WHERE f1.follower_id = current_user_id 
            AND f1.following_id = target_user_id
            AND EXISTS(
                SELECT 1 FROM follows f2
                WHERE f2.follower_id = target_user_id 
                AND f2.following_id = current_user_id
            )
        ) as is_mutual;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS FOR MAINTAINING FOLLOW COUNTS
-- =============================================

-- Function to update follow counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment counts
        UPDATE profiles 
        SET following_count = COALESCE(following_count, 0) + 1
        WHERE id = NEW.follower_id;
        
        UPDATE profiles 
        SET followers_count = COALESCE(followers_count, 0) + 1
        WHERE id = NEW.following_id;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement counts
        UPDATE profiles 
        SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0)
        WHERE id = OLD.follower_id;
        
        UPDATE profiles 
        SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0)
        WHERE id = OLD.following_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follow counts (drop existing first)
DROP TRIGGER IF EXISTS update_follow_counts_trigger ON follows;
CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_counts();

-- =============================================
-- RLS POLICIES FOR FOLLOWS TABLE
-- =============================================

-- Enable RLS on follows table
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Users can view all follow relationships
CREATE POLICY "Anyone can view follows" ON follows
    FOR SELECT USING (true);

-- Users can create follows for themselves
CREATE POLICY "Users can follow others" ON follows
    FOR INSERT WITH CHECK (follower_id = auth.uid());

-- Users can delete their own follows
CREATE POLICY "Users can unfollow others" ON follows
    FOR DELETE USING (follower_id = auth.uid());

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION get_user_followers TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_following TO authenticated;
GRANT EXECUTE ON FUNCTION follow_user TO authenticated;
GRANT EXECUTE ON FUNCTION unfollow_user TO authenticated;
GRANT EXECUTE ON FUNCTION check_follow_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_follow_counts TO authenticated;

-- Success message
SELECT 'Social features RPC functions created successfully!' as status;
