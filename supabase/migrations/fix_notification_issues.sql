-- =============================================
-- FIX ALL NOTIFICATION ISSUES
-- =============================================
-- 1. Fix generic "Someone" showing instead of user's name (username field doesn't exist, use first_name/last_name)
-- 2. Ensure no duplicate notifications
-- 3. Add proper name formatting
-- 4. Prevent notifications when user is viewing the conversation (active_conversation_id)
-- =============================================

-- Add active_conversation_id to device_tokens table to track which conversation user is viewing
ALTER TABLE device_tokens 
ADD COLUMN IF NOT EXISTS active_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_tokens_active_conversation 
ON device_tokens(user_id, active_conversation_id) 
WHERE active_conversation_id IS NOT NULL;

COMMENT ON COLUMN device_tokens.active_conversation_id IS 
'Tracks which conversation the user is currently viewing to prevent notifications for active chats';

-- Fix message notification to use first_name and last_name
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_first_name TEXT;
    sender_last_name TEXT;
    sender_full_name TEXT;
    sender_avatar TEXT;
    recipient_id UUID;
    conversation_id UUID;
    has_active_device BOOLEAN;
BEGIN
    -- Get sender details using first_name and last_name (not username which doesn't exist)
    SELECT first_name, last_name, avatar_url 
    INTO sender_first_name, sender_last_name, sender_avatar
    FROM profiles 
    WHERE id = NEW.sender_id;
    
    -- Build full name
    sender_full_name := TRIM(COALESCE(sender_first_name, '') || ' ' || COALESCE(sender_last_name, ''));
    IF sender_full_name = '' THEN
        sender_full_name := 'Someone';
    END IF;
    
    -- Get conversation details to find recipient
    SELECT 
        CASE 
            WHEN participant_1 = NEW.sender_id THEN participant_2 
            ELSE participant_1 
        END,
        id
    INTO recipient_id, conversation_id
    FROM conversations 
    WHERE id = NEW.conversation_id;
    
    -- Don't notify if recipient is the same as sender (shouldn't happen)
    IF recipient_id = NEW.sender_id THEN
        RETURN NEW;
    END IF;
    
    -- Check if user is currently viewing this conversation on any device
    SELECT EXISTS (
        SELECT 1 
        FROM device_tokens 
        WHERE user_id = recipient_id 
          AND active_conversation_id = conversation_id
          AND is_active = true
    ) INTO has_active_device;
    
    -- Only create notification if user is NOT currently viewing this conversation
    IF NOT has_active_device THEN
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            recipient_id,
            'message',
            'New Message from ' || sender_full_name || ' 💬',
            sender_full_name || ' sent you a message',
            jsonb_build_object(
                'sender_id', NEW.sender_id,
                'sender_first_name', sender_first_name,
                'sender_last_name', sender_last_name,
                'sender_full_name', sender_full_name,
                'sender_avatar', sender_avatar,
                'conversation_id', conversation_id,
                'message_id', NEW.id,
                'message_content', LEFT(NEW.content, 100),
                'sent_at', NEW.created_at
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix comment notification to use first_name and last_name
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    commenter_first_name TEXT;
    commenter_last_name TEXT;
    commenter_full_name TEXT;
    commenter_avatar TEXT;
    post_author_id UUID;
    post_content TEXT;
BEGIN
    -- Get commenter details
    SELECT first_name, last_name, avatar_url 
    INTO commenter_first_name, commenter_last_name, commenter_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Build full name
    commenter_full_name := TRIM(COALESCE(commenter_first_name, '') || ' ' || COALESCE(commenter_last_name, ''));
    IF commenter_full_name = '' THEN
        commenter_full_name := 'Someone';
    END IF;
    
    -- Get post details
    SELECT user_id, content INTO post_author_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if commenting on your own post
    IF NEW.user_id = post_author_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the post author
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_author_id,
        'comment',
        commenter_full_name || ' commented on your post 💬',
        commenter_full_name || ' commented: "' || LEFT(NEW.content, 50) || '"',
        jsonb_build_object(
            'commenter_id', NEW.user_id,
            'commenter_first_name', commenter_first_name,
            'commenter_last_name', commenter_last_name,
            'commenter_full_name', commenter_full_name,
            'commenter_avatar', commenter_avatar,
            'post_id', NEW.post_id,
            'post_content', LEFT(post_content, 100),
            'comment_id', NEW.id,
            'comment_content', LEFT(NEW.content, 100),
            'commented_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix follow notification to use first_name and last_name
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_first_name TEXT;
    follower_last_name TEXT;
    follower_full_name TEXT;
    follower_avatar TEXT;
BEGIN
    -- Get follower details
    SELECT first_name, last_name, avatar_url 
    INTO follower_first_name, follower_last_name, follower_avatar
    FROM profiles 
    WHERE id = NEW.follower_id;
    
    -- Build full name
    follower_full_name := TRIM(COALESCE(follower_first_name, '') || ' ' || COALESCE(follower_last_name, ''));
    IF follower_full_name = '' THEN
        follower_full_name := 'Someone';
    END IF;
    
    -- Create notification for the followed user
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.following_id,
        'follow',
        follower_full_name || ' started following you 👤',
        follower_full_name || ' is now following you',
        jsonb_build_object(
            'follower_id', NEW.follower_id,
            'follower_first_name', follower_first_name,
            'follower_last_name', follower_last_name,
            'follower_full_name', follower_full_name,
            'follower_avatar', follower_avatar,
            'followed_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix like notification to use first_name and last_name
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    liker_first_name TEXT;
    liker_last_name TEXT;
    liker_full_name TEXT;
    liker_avatar TEXT;
    post_author_id UUID;
    post_content TEXT;
BEGIN
    -- Get liker details
    SELECT first_name, last_name, avatar_url 
    INTO liker_first_name, liker_last_name, liker_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Build full name
    liker_full_name := TRIM(COALESCE(liker_first_name, '') || ' ' || COALESCE(liker_last_name, ''));
    IF liker_full_name = '' THEN
        liker_full_name := 'Someone';
    END IF;
    
    -- Get post details
    SELECT user_id, content INTO post_author_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if liking your own post
    IF NEW.user_id = post_author_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the post author
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_author_id,
        'like',
        liker_full_name || ' liked your post ❤️',
        liker_full_name || ' liked your post',
        jsonb_build_object(
            'liker_id', NEW.user_id,
            'liker_first_name', liker_first_name,
            'liker_last_name', liker_last_name,
            'liker_full_name', liker_full_name,
            'liker_avatar', liker_avatar,
            'post_id', NEW.post_id,
            'post_content', LEFT(post_content, 100),
            'liked_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate all triggers to ensure no duplicates
DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;
DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments;
DROP TRIGGER IF EXISTS trigger_create_follow_notification ON follows;
DROP TRIGGER IF EXISTS trigger_create_like_notification ON likes;

CREATE TRIGGER trigger_create_message_notification
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER trigger_create_comment_notification
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER trigger_create_follow_notification
    AFTER INSERT ON follows
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_notification();

CREATE TRIGGER trigger_create_like_notification
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION create_like_notification();

-- Confirm all changes
COMMENT ON FUNCTION create_message_notification() IS 'Creates notification for new messages using first_name/last_name, respects active conversation';
COMMENT ON FUNCTION create_comment_notification() IS 'Creates notification for new comments using first_name/last_name';
COMMENT ON FUNCTION create_follow_notification() IS 'Creates notification for new follows using first_name/last_name';
COMMENT ON FUNCTION create_like_notification() IS 'Creates notification for new likes using first_name/last_name';

