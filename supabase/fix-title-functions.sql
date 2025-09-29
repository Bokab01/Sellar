-- Fix the specific functions that are referencing posts.title column
-- These functions are causing the "title" column error

-- Fix create_comment_notification function
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    commenter_username TEXT;
    commenter_avatar TEXT;
    post_author_id UUID;
    post_content TEXT;
BEGIN
    -- Get commenter details
    SELECT username, avatar_url INTO commenter_username, commenter_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details (using content instead of title)
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
        'New Comment! 💬',
        COALESCE(commenter_username, 'Someone') || ' commented on your post',
        jsonb_build_object(
            'commenter_id', NEW.user_id,
            'commenter_username', COALESCE(commenter_username, 'Unknown User'),
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

-- Fix create_like_notification function
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    liker_username TEXT;
    liker_avatar TEXT;
    post_author_id UUID;
    post_content TEXT;
BEGIN
    -- Get liker details
    SELECT username, avatar_url INTO liker_username, liker_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details (using content instead of title)
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
        'Post Liked! ❤️',
        COALESCE(liker_username, 'Someone') || ' liked your post',
        jsonb_build_object(
            'liker_id', NEW.user_id,
            'liker_username', COALESCE(liker_username, 'Unknown User'),
            'liker_avatar', liker_avatar,
            'post_id', NEW.post_id,
            'post_content', LEFT(post_content, 100),
            'liked_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ FIXED: create_comment_notification and create_like_notification functions';
    RAISE NOTICE '🔧 Changed posts.title references to posts.content';
    RAISE NOTICE '📝 Comments should now work without "title" column errors';
    RAISE NOTICE '🎯 All notification functions now use correct column references';
END $$;
