-- =============================================
-- SIMPLE CHAT-BASED CALLBACK SYSTEM
-- Adds callback_request message type to existing chat system
-- Much simpler than the complex callback_requests table approach
-- =============================================

-- 1. Update message_type CHECK constraint to include 'callback_request'
-- First, let's check the current constraint and update it
DO $$
BEGIN
    -- Drop the existing check constraint on message_type
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
    
    -- Add the updated check constraint that includes 'callback_request'
    ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'file', 'offer', 'system', 'location', 'callback_request'));
END $$;

-- 2. Create index for callback request messages (for analytics if needed)
CREATE INDEX IF NOT EXISTS idx_messages_callback_requests 
ON messages(sender_id, message_type, created_at) 
WHERE message_type = 'callback_request';

-- 3. Create a simple function to get callback request stats (optional)
CREATE OR REPLACE FUNCTION get_callback_message_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'total_callback_requests_sent', (
            SELECT COUNT(*) 
            FROM messages 
            WHERE sender_id = p_user_id 
            AND message_type = 'callback_request'
        ),
        'total_callback_requests_received', (
            SELECT COUNT(*) 
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.message_type = 'callback_request'
            AND m.sender_id != p_user_id
            AND (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
        ),
        'recent_callback_requests', (
            SELECT COUNT(*) 
            FROM messages 
            WHERE sender_id = p_user_id 
            AND message_type = 'callback_request'
            AND created_at >= NOW() - INTERVAL '7 days'
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update conversation preview trigger to handle callback messages
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations SET
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        last_message_preview = CASE 
            WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
            WHEN NEW.message_type = 'image' THEN '📷 Image'
            WHEN NEW.message_type = 'file' THEN '📎 File'
            WHEN NEW.message_type = 'offer' THEN '💰 Offer'
            WHEN NEW.message_type = 'location' THEN '📍 Location'
            WHEN NEW.message_type = 'callback_request' THEN '📞 Callback Request'
            ELSE 'Message'
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_callback_message_stats TO authenticated;

-- Success message
SELECT 'Simple chat-based callback system created successfully!' as status;
