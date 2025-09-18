-- Fix the create_message_notification function to handle null usernames
-- This prevents the "null value in column body violates not-null constraint" error

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
    -- Handle null username by providing a fallback
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
