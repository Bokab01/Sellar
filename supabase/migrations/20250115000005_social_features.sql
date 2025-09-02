-- Social Features Migration: Followers, Following, and Community Stats
-- This migration adds social functionality to the Sellar app

-- Create follows table for follower/following relationships
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent self-following and duplicate follows
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- Add social stats columns to profiles table
DO $$
BEGIN
    -- Add followers count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'followers_count') THEN
        ALTER TABLE profiles ADD COLUMN followers_count INTEGER DEFAULT 0 CHECK (followers_count >= 0);
    END IF;
    
    -- Add following count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
        ALTER TABLE profiles ADD COLUMN following_count INTEGER DEFAULT 0 CHECK (following_count >= 0);
    END IF;
    
    -- Add posts count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'posts_count') THEN
        ALTER TABLE profiles ADD COLUMN posts_count INTEGER DEFAULT 0 CHECK (posts_count >= 0);
    END IF;
    
    -- Add listings count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'listings_count') THEN
        ALTER TABLE profiles ADD COLUMN listings_count INTEGER DEFAULT 0 CHECK (listings_count >= 0);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

-- Enable RLS on follows table
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follows table
-- Users can view all follow relationships (public social graph)
DROP POLICY IF EXISTS "Users can view all follows" ON follows;
CREATE POLICY "Users can view all follows" ON follows
FOR SELECT USING (true);

-- Users can only create follows where they are the follower
DROP POLICY IF EXISTS "Users can create own follows" ON follows;
CREATE POLICY "Users can create own follows" ON follows
FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can only delete follows where they are the follower
DROP POLICY IF EXISTS "Users can delete own follows" ON follows;
CREATE POLICY "Users can delete own follows" ON follows
FOR DELETE USING (auth.uid() = follower_id);

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count for the person being followed
        UPDATE profiles 
        SET followers_count = followers_count + 1 
        WHERE id = NEW.following_id;
        
        -- Increment following count for the person doing the following
        UPDATE profiles 
        SET following_count = following_count + 1 
        WHERE id = NEW.follower_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count for the person being unfollowed
        UPDATE profiles 
        SET followers_count = GREATEST(0, followers_count - 1) 
        WHERE id = OLD.following_id;
        
        -- Decrement following count for the person doing the unfollowing
        UPDATE profiles 
        SET following_count = GREATEST(0, following_count - 1) 
        WHERE id = OLD.follower_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update follow counts
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
CREATE TRIGGER trigger_update_follow_counts
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles 
        SET posts_count = posts_count + 1 
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles 
        SET posts_count = GREATEST(0, posts_count - 1) 
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update post counts
DROP TRIGGER IF EXISTS trigger_update_post_counts ON posts;
CREATE TRIGGER trigger_update_post_counts
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_post_counts();

-- Function to update listing counts
CREATE OR REPLACE FUNCTION update_listing_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles 
        SET listings_count = listings_count + 1 
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles 
        SET listings_count = GREATEST(0, listings_count - 1) 
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update listing counts
DROP TRIGGER IF EXISTS trigger_update_listing_counts ON listings;
CREATE TRIGGER trigger_update_listing_counts
    AFTER INSERT OR DELETE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_listing_counts();

-- RPC Functions for social features

-- Follow a user
CREATE OR REPLACE FUNCTION follow_user(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    result JSON;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    IF current_user_id = target_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot follow yourself');
    END IF;
    
    -- Insert follow relationship (will fail if already exists due to unique constraint)
    BEGIN
        INSERT INTO follows (follower_id, following_id) 
        VALUES (current_user_id, target_user_id);
        
        RETURN json_build_object('success', true, 'message', 'Successfully followed user');
    EXCEPTION WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Already following this user');
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unfollow a user
CREATE OR REPLACE FUNCTION unfollow_user(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    deleted_count INTEGER;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Delete follow relationship
    DELETE FROM follows 
    WHERE follower_id = current_user_id AND following_id = target_user_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RETURN json_build_object('success', true, 'message', 'Successfully unfollowed user');
    ELSE
        RETURN json_build_object('success', false, 'error', 'Not following this user');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is following a specific user
CREATE OR REPLACE FUNCTION is_following(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = current_user_id AND following_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's followers
CREATE OR REPLACE FUNCTION get_user_followers(target_user_id UUID, page_limit INTEGER DEFAULT 20, page_offset INTEGER DEFAULT 0)
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
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.avatar_url,
        p.is_verified,
        p.followers_count,
        p.following_count,
        f.created_at as followed_at,
        CASE 
            WHEN current_user_id IS NOT NULL THEN
                EXISTS(SELECT 1 FROM follows WHERE follower_id = current_user_id AND following_id = p.id)
            ELSE false
        END as is_following_back
    FROM follows f
    JOIN profiles p ON f.follower_id = p.id
    WHERE f.following_id = target_user_id
    ORDER BY f.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's following
CREATE OR REPLACE FUNCTION get_user_following(target_user_id UUID, page_limit INTEGER DEFAULT 20, page_offset INTEGER DEFAULT 0)
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
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.avatar_url,
        p.is_verified,
        p.followers_count,
        p.following_count,
        f.created_at as followed_at,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = p.id AND following_id = target_user_id) as is_mutual
    FROM follows f
    JOIN profiles p ON f.following_id = p.id
    WHERE f.follower_id = target_user_id
    ORDER BY f.created_at DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize counts for existing users (run once)
DO $$
BEGIN
    -- Update followers count
    UPDATE profiles SET followers_count = (
        SELECT COUNT(*) FROM follows WHERE following_id = profiles.id
    );
    
    -- Update following count
    UPDATE profiles SET following_count = (
        SELECT COUNT(*) FROM follows WHERE follower_id = profiles.id
    );
    
    -- Update posts count
    UPDATE profiles SET posts_count = (
        SELECT COUNT(*) FROM posts WHERE user_id = profiles.id
    );
    
    -- Update listings count
    UPDATE profiles SET listings_count = (
        SELECT COUNT(*) FROM listings WHERE user_id = profiles.id
    );
END $$;

SELECT 'Social features migration completed successfully!' as status;
