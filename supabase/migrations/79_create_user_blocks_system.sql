-- User Blocks System
-- Efficient, optimized blocking with privacy and security

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason VARCHAR(50), -- 'spam', 'harassment', 'inappropriate', 'other'
    notes TEXT, -- Optional user notes
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate blocks
    UNIQUE(blocker_id, blocked_id),
    
    -- Prevent self-blocking
    CHECK (blocker_id != blocked_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_both ON blocked_users(blocker_id, blocked_id);

-- Enable Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own blocks
CREATE POLICY "Users can view their own blocks"
    ON blocked_users FOR SELECT
    USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
    ON blocked_users FOR INSERT
    WITH CHECK (auth.uid() = blocker_id AND blocker_id != blocked_id);

-- Users can unblock others
CREATE POLICY "Users can unblock others"
    ON blocked_users FOR DELETE
    USING (auth.uid() = blocker_id);

-- Helper function to check if user A has blocked user B
CREATE OR REPLACE FUNCTION is_user_blocked(blocker_id UUID, blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users
        WHERE blocked_users.blocker_id = is_user_blocked.blocker_id
        AND blocked_users.blocked_id = is_user_blocked.blocked_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if there's mutual blocking
CREATE OR REPLACE FUNCTION is_mutually_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get list of blocked user IDs for efficient filtering
CREATE OR REPLACE FUNCTION get_blocked_user_ids(for_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT blocked_id 
        FROM blocked_users 
        WHERE blocker_id = for_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get list of users who blocked this user (for privacy)
CREATE OR REPLACE FUNCTION get_blocking_user_ids(for_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT blocker_id 
        FROM blocked_users 
        WHERE blocked_id = for_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to clean up related data when user is blocked
CREATE OR REPLACE FUNCTION handle_user_block()
RETURNS TRIGGER AS $$
BEGIN
    -- When user A blocks user B:
    -- 1. Mark their conversation as archived/deleted for blocker
    UPDATE conversations
    SET 
        deleted_for_participant_1 = CASE WHEN participant_1 = NEW.blocker_id THEN TRUE ELSE deleted_for_participant_1 END,
        deleted_for_participant_2 = CASE WHEN participant_2 = NEW.blocker_id THEN TRUE ELSE deleted_for_participant_2 END
    WHERE (participant_1 = NEW.blocker_id AND participant_2 = NEW.blocked_id)
       OR (participant_1 = NEW.blocked_id AND participant_2 = NEW.blocker_id);
    
    -- 2. Remove any pending notifications from blocked user
    DELETE FROM notifications
    WHERE user_id = NEW.blocker_id
    AND (data->>'sender_id')::UUID = NEW.blocked_id;
    
    -- 3. Log the block for analytics (optional)
    RAISE NOTICE 'User % blocked user %', NEW.blocker_id, NEW.blocked_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_handle_user_block ON blocked_users;
CREATE TRIGGER trigger_handle_user_block
    AFTER INSERT ON blocked_users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_block();

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_mutually_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocked_user_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_blocking_user_ids(UUID) TO authenticated;

COMMENT ON TABLE blocked_users IS 'Stores user blocking relationships with privacy and security';
COMMENT ON FUNCTION is_user_blocked IS 'Efficiently checks if user A has blocked user B';
COMMENT ON FUNCTION is_mutually_blocked IS 'Checks if either user has blocked the other';
COMMENT ON FUNCTION get_blocked_user_ids IS 'Returns array of blocked user IDs for efficient filtering';
COMMENT ON FUNCTION get_blocking_user_ids IS 'Returns array of users who blocked this user';

