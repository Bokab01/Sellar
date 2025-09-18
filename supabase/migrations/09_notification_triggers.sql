-- =============================================
-- NOTIFICATION TRIGGERS MIGRATION
-- =============================================
-- This migration adds automatic notification creation for common user actions

-- Function to create notification for follow actions
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

-- Function to create notification for like actions
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

-- Function to create notification for comment actions
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

-- Function to create notification for message actions
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

-- Function to create notification for listing actions
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

-- Create triggers
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

CREATE TRIGGER trigger_create_message_notification
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER trigger_create_listing_notification
    AFTER INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION create_listing_notification();

-- Add some sample notifications for testing
DO $$
DECLARE
    test_user_id UUID;
    test_user2_id UUID;
BEGIN
    -- Get first two users for testing
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    SELECT id INTO test_user2_id FROM profiles OFFSET 1 LIMIT 1;
    
    -- Create sample notifications if users exist
    IF test_user_id IS NOT NULL THEN
        -- Welcome notification
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            test_user_id,
            'system',
            'Welcome to Sellar!',
            'Welcome to Sellar! Start by creating your first listing or exploring the community.',
            '{"welcome": true, "action": "get_started"}'::jsonb
        );
        
        -- Feature notification
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            test_user_id,
            'system',
            'New Features Available',
            'Check out our new boost features to make your listings stand out!',
            '{"feature": "boost", "action": "explore_features"}'::jsonb
        );
        
        RAISE NOTICE 'Sample notifications created for user: %', test_user_id;
    END IF;
    
    -- Create interaction notifications if two users exist
    IF test_user_id IS NOT NULL AND test_user2_id IS NOT NULL THEN
        -- Follow notification
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            test_user_id,
            'follow',
            'New Follower',
            'John Doe started following you',
            jsonb_build_object(
                'follower_id', test_user2_id,
                'follower_username', 'johndoe',
                'follower_avatar', null,
                'followed_at', NOW()
            )
        );
        
        -- Like notification
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            test_user_id,
            'like',
            'Post Liked',
            'Jane Smith liked your post',
            jsonb_build_object(
                'liker_id', test_user2_id,
                'liker_username', 'janesmith',
                'liker_avatar', null,
                'post_id', '00000000-0000-0000-0000-000000000001',
                'post_content', 'Check out this amazing item!',
                'liked_at', NOW()
            )
        );
        
        RAISE NOTICE 'Interaction notifications created between users: % and %', test_user_id, test_user2_id;
    END IF;
END $$;

-- Verify notifications were created
SELECT 
    n.id,
    n.type,
    n.title,
    n.body,
    n.is_read,
    n.created_at,
    p.username
FROM notifications n
JOIN profiles p ON n.user_id = p.id
ORDER BY n.created_at DESC
LIMIT 10;

-- Final completion notice
DO $$
BEGIN
    RAISE NOTICE 'Notification triggers and sample data setup completed!';
END $$;
