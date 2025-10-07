-- Migration: Update conversation timestamp on new messages
-- This ensures conversations bubble to the top when new messages arrive
-- and helps with unread message detection

-- Function to update conversation's last_message_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the conversation's last_message_at timestamp
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when a new message is inserted
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Comment
COMMENT ON FUNCTION update_conversation_timestamp() IS 'Updates the conversation last_message_at timestamp when a new message is inserted';
COMMENT ON TRIGGER trigger_update_conversation_timestamp ON messages IS 'Keeps conversation timestamps in sync with new messages for proper sorting and unread detection';
