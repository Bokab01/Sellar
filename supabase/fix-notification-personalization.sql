-- =============================================
-- FIX NOTIFICATION PERSONALIZATION
-- =============================================
-- This script adds missing notification trigger functions to make notifications
-- show specific user names instead of generic "Someone" messages

-- Function to create notification for new messages
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_username TEXT;
    sender_avatar TEXT;
    recipient_id UUID;
    conversation_id UUID;
BEGIN
    -- Get sender details
    SELECT username, avatar_url INTO sender_username, sender_avatar
    FROM profiles 
    WHERE id = NEW.sender_id;
    
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
    
    -- Create notification for the recipient
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        recipient_id,
        'message',
        'New Message! 💬',
        COALESCE(sender_username, 'Someone') || ' sent you a message',
        jsonb_build_object(
            'sender_id', NEW.sender_id,
            'sender_username', COALESCE(sender_username, 'Unknown User'),
            'sender_avatar', sender_avatar,
            'conversation_id', conversation_id,
            'message_id', NEW.id,
            'message_content', LEFT(NEW.content, 100),
            'sent_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for new follows
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_username TEXT;
    follower_avatar TEXT;
BEGIN
    -- Get follower details
    SELECT username, avatar_url INTO follower_username, follower_avatar
    FROM profiles 
    WHERE id = NEW.follower_id;
    
    -- Don't notify if following yourself (shouldn't happen)
    IF NEW.follower_id = NEW.following_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the person being followed
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.following_id,
        'follow',
        'New Follower! 👥',
        COALESCE(follower_username, 'Someone') || ' started following you',
        jsonb_build_object(
            'follower_id', NEW.follower_id,
            'follower_username', COALESCE(follower_username, 'Unknown User'),
            'follower_avatar', follower_avatar,
            'followed_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for post likes
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    liker_username TEXT;
    liker_avatar TEXT;
    post_author_id UUID;
    post_title TEXT;
BEGIN
    -- Get liker details
    SELECT username, avatar_url INTO liker_username, liker_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, title INTO post_author_id, post_title
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
        'Post Liked! ❤️',
        COALESCE(liker_username, 'Someone') || ' liked your post "' || COALESCE(post_title, 'Untitled') || '"',
        jsonb_build_object(
            'liker_id', NEW.user_id,
            'liker_username', COALESCE(liker_username, 'Unknown User'),
            'liker_avatar', liker_avatar,
            'post_id', NEW.post_id,
            'post_title', post_title,
            'liked_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for new comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    commenter_username TEXT;
    commenter_avatar TEXT;
    post_author_id UUID;
    post_title TEXT;
BEGIN
    -- Get commenter details
    SELECT username, avatar_url INTO commenter_username, commenter_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, title INTO post_author_id, post_title
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
        'New Comment! 💬',
        COALESCE(commenter_username, 'Someone') || ' commented on your post "' || COALESCE(post_title, 'Untitled') || '"',
        jsonb_build_object(
            'commenter_id', NEW.user_id,
            'commenter_username', COALESCE(commenter_username, 'Unknown User'),
            'commenter_avatar', commenter_avatar,
            'post_id', NEW.post_id,
            'post_title', post_title,
            'comment_id', NEW.id,
            'comment_content', LEFT(NEW.content, 100),
            'commented_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;
DROP TRIGGER IF EXISTS trigger_create_follow_notification ON follows;
DROP TRIGGER IF EXISTS trigger_create_like_notification ON likes;
DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments;
DROP TRIGGER IF EXISTS trigger_create_listing_notification ON listings;

-- Create triggers for all notification types
CREATE TRIGGER trigger_create_message_notification
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER trigger_create_follow_notification
    AFTER INSERT ON follows
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_notification();

CREATE TRIGGER trigger_create_like_notification
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION create_like_notification();

CREATE TRIGGER trigger_create_comment_notification
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

CREATE TRIGGER trigger_create_listing_notification
    AFTER INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION create_listing_notification();

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION create_message_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION create_follow_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION create_like_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION create_comment_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION create_listing_notification() TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Notification personalization functions created successfully!';
    RAISE NOTICE '📱 Notifications will now show specific user names instead of generic messages';
    RAISE NOTICE '🔔 Triggers created for: messages, follows, likes, comments, listings';
END $$;
