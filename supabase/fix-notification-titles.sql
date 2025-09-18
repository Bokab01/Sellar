-- =============================================
-- FIX NOTIFICATION TITLES
-- =============================================
-- This script updates the notification trigger functions to use user-friendly titles

-- Update the listing notification function
CREATE OR REPLACE FUNCTION create_listing_notification()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    listing_title TEXT;
BEGIN
    -- Get seller details
    SELECT username, avatar_url INTO seller_username, seller_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get listing title
    listing_title := NEW.title;
    
    -- Create notification for the seller (listing created/updated)
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.user_id,
        'listing',
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Listing Created Successfully! 🎉'
            WHEN TG_OP = 'UPDATE' THEN 'Listing Updated ✏️'
            ELSE 'Listing ' || TG_OP
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Your listing "' || listing_title || '" has been created and is now live!'
            WHEN TG_OP = 'UPDATE' THEN 'Your listing "' || listing_title || '" has been updated successfully.'
            ELSE 'Your listing "' || listing_title || '" was ' || TG_OP
        END,
        jsonb_build_object(
            'listing_id', NEW.id,
            'listing_title', listing_title,
            'action', TG_OP,
            'created_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the follow notification function
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
    
    -- Create notification for the user being followed
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.following_id,
        'follow',
        'New Follower! 👥',
        follower_username || ' started following you',
        jsonb_build_object(
            'follower_id', NEW.follower_id,
            'follower_username', follower_username,
            'follower_avatar', follower_avatar,
            'followed_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the like notification function
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    liker_username TEXT;
    liker_avatar TEXT;
    post_owner_id UUID;
    post_content TEXT;
BEGIN
    -- Get liker details
    SELECT username, avatar_url INTO liker_username, liker_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, content INTO post_owner_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if user likes their own post
    IF NEW.user_id = post_owner_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the post owner
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_owner_id,
        'like',
        'Post Liked! ❤️',
        liker_username || ' liked your post',
        jsonb_build_object(
            'liker_id', NEW.user_id,
            'liker_username', liker_username,
            'liker_avatar', liker_avatar,
            'post_id', NEW.post_id,
            'post_content', LEFT(post_content, 100),
            'liked_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the comment notification function
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    commenter_username TEXT;
    commenter_avatar TEXT;
    post_owner_id UUID;
    post_content TEXT;
BEGIN
    -- Get commenter details
    SELECT username, avatar_url INTO commenter_username, commenter_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, content INTO post_owner_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if user comments on their own post
    IF NEW.user_id = post_owner_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the post owner
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_owner_id,
        'comment',
        'New Comment! 💬',
        commenter_username || ' commented on your post',
        jsonb_build_object(
            'commenter_id', NEW.user_id,
            'commenter_username', commenter_username,
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

-- Update the message notification function
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
        sender_username || ' sent you a message',
        jsonb_build_object(
            'sender_id', NEW.sender_id,
            'sender_username', sender_username,
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

-- Update existing notifications with better titles (optional - for existing data)
UPDATE notifications 
SET title = CASE 
    WHEN title = 'Listing INSERT' THEN 'Listing Created Successfully! 🎉'
    WHEN title = 'Listing UPDATE' THEN 'Listing Updated ✏️'
    WHEN title = 'New Follower' THEN 'New Follower! 👥'
    WHEN title = 'Post Liked' THEN 'Post Liked! ❤️'
    WHEN title = 'New Comment' THEN 'New Comment! 💬'
    WHEN title = 'New Message' THEN 'New Message! 💬'
    ELSE title
END
WHERE title IN ('Listing INSERT', 'Listing UPDATE', 'New Follower', 'Post Liked', 'New Comment', 'New Message');

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Notification titles updated successfully!';
END $$;
