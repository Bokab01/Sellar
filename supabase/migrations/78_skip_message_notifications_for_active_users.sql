-- Skip creating message notifications in the notifications table
-- Messages should primarily show in the inbox/chat list
-- Only create notification if user hasn't been active recently (push notification scenario)

CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_username TEXT;
    sender_avatar TEXT;
    recipient_id UUID;
    conversation_id UUID;
    message_preview TEXT;
    recipient_last_seen TIMESTAMP WITH TIME ZONE;
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
    
    -- Don't notify if recipient is the same as sender
    IF recipient_id = NEW.sender_id THEN
        RETURN NEW;
    END IF;
    
    -- Check if recipient was recently active (within last 5 minutes)
    SELECT last_seen INTO recipient_last_seen
    FROM profiles
    WHERE id = recipient_id;
    
    -- Only create notification if:
    -- 1. Recipient hasn't been seen recently (likely offline or away from app)
    -- 2. This allows push notifications to work for offline users
    -- 3. But prevents cluttering notification center for active users
    IF recipient_last_seen IS NULL OR 
       recipient_last_seen < NOW() - INTERVAL '5 minutes' THEN
        
        -- Create message preview
        message_preview := LEFT(NEW.content, 50);
        IF LENGTH(NEW.content) > 50 THEN
            message_preview := message_preview || '...';
        END IF;
        
        -- Create notification (for push notification purposes)
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            recipient_id,
            'message',
            COALESCE(sender_username, 'Someone') || ' sent you a message',
            message_preview,
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
        
        RAISE NOTICE 'Created message notification for offline user %', recipient_id;
    ELSE
        RAISE NOTICE 'Skipped message notification for active user % (last seen: %)', recipient_id, recipient_last_seen;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_message_notification IS 'Creates message notifications only for users who are offline/inactive. Active users see messages in inbox only.';

