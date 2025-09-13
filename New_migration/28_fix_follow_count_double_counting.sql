-- =============================================
-- SELLAR MOBILE APP - FIX FOLLOW COUNT DOUBLE COUNTING
-- Migration 28: Fix double counting issue in follow counts
-- =============================================

-- The issue: Both RPC functions and triggers are updating follow counts,
-- causing double counting (showing 2 when user follows 1 person)

-- Solution: Remove manual count updates from RPC functions and let 
-- the trigger handle all count updates automatically

-- =============================================
-- FIXED RPC FUNCTION: Follow User (No Manual Count Updates)
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
    
    -- Insert follow relationship (trigger will handle count updates automatically)
    INSERT INTO follows (follower_id, following_id)
    VALUES (current_user_id, target_user_id);
    
    -- No manual count updates - let the trigger handle it!
    
    RETURN QUERY SELECT true, 'Successfully followed user'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIXED RPC FUNCTION: Unfollow User (No Manual Count Updates)
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
    
    -- Delete follow relationship (trigger will handle count updates automatically)
    DELETE FROM follows 
    WHERE follower_id = current_user_id 
    AND following_id = target_user_id;
    
    -- No manual count updates - let the trigger handle it!
    
    RETURN QUERY SELECT true, 'Successfully unfollowed user'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RECALCULATE CORRECT FOLLOW COUNTS
-- =============================================

-- Fix any existing incorrect counts by recalculating from actual data
UPDATE profiles 
SET 
    following_count = (
        SELECT COUNT(*) 
        FROM follows 
        WHERE follower_id = profiles.id
    ),
    followers_count = (
        SELECT COUNT(*) 
        FROM follows 
        WHERE following_id = profiles.id
    )
WHERE id IN (
    -- Only update profiles that have follow relationships
    SELECT DISTINCT follower_id FROM follows
    UNION
    SELECT DISTINCT following_id FROM follows
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION follow_user TO authenticated;
GRANT EXECUTE ON FUNCTION unfollow_user TO authenticated;

-- Success message
SELECT 'Follow count double counting issue fixed!' as status;
