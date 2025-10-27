-- Add soft delete columns to conversations table
-- Allows each user to delete conversations from their view without affecting the other party

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS deleted_for_participant_1 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_for_participant_2 BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at_participant_1 TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at_participant_2 TIMESTAMP WITH TIME ZONE;

-- Create index for efficient filtering of non-deleted conversations
CREATE INDEX IF NOT EXISTS idx_conversations_not_deleted_p1 
ON conversations(participant_1) 
WHERE deleted_for_participant_1 = FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_not_deleted_p2 
ON conversations(participant_2) 
WHERE deleted_for_participant_2 = FALSE;

-- Function to soft delete conversation for a user
CREATE OR REPLACE FUNCTION soft_delete_conversation(
  conversation_id UUID,
  user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_record RECORD;
  is_participant_1 BOOLEAN;
  result JSONB;
BEGIN
  -- Get conversation and verify user is a participant
  SELECT * INTO conv_record
  FROM conversations
  WHERE id = conversation_id
  AND (participant_1 = user_id OR participant_2 = user_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Conversation not found or user is not a participant'
    );
  END IF;
  
  -- Determine which participant the user is
  is_participant_1 := (conv_record.participant_1 = user_id);
  
  -- Mark as deleted for this user
  IF is_participant_1 THEN
    UPDATE conversations
    SET 
      deleted_for_participant_1 = TRUE,
      deleted_at_participant_1 = NOW()
    WHERE id = conversation_id;
  ELSE
    UPDATE conversations
    SET 
      deleted_for_participant_2 = TRUE,
      deleted_at_participant_2 = NOW()
    WHERE id = conversation_id;
  END IF;
  
  -- Check if both users have deleted - if so, permanently delete
  SELECT 
    deleted_for_participant_1,
    deleted_for_participant_2
  INTO conv_record
  FROM conversations
  WHERE id = conversation_id;
  
  IF conv_record.deleted_for_participant_1 AND conv_record.deleted_for_participant_2 THEN
    -- Both users deleted - permanently remove
    DELETE FROM conversations WHERE id = conversation_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'permanently_deleted', true,
      'message', 'Conversation permanently deleted (both users deleted)'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'permanently_deleted', false,
      'message', 'Conversation hidden from your inbox'
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION soft_delete_conversation(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION soft_delete_conversation IS 'Soft deletes a conversation for a user. Only permanently deletes when both users have deleted.';

-- Trigger to restore conversation when a new message is sent
-- This ensures that if User A deleted the conversation, but User B sends a new message,
-- User A will see the conversation again (standard messaging app behavior)
CREATE OR REPLACE FUNCTION restore_conversation_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_record RECORD;
  sender_is_participant_1 BOOLEAN;
  other_participant_deleted BOOLEAN;
BEGIN
  -- Get conversation details
  SELECT * INTO conv_record
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Determine which participant is the sender
  sender_is_participant_1 := (conv_record.participant_1 = NEW.sender_id);
  
  -- Check if the OTHER participant (not the sender) has deleted the conversation
  IF sender_is_participant_1 THEN
    -- Sender is participant 1, check if participant 2 deleted
    other_participant_deleted := conv_record.deleted_for_participant_2;
    
    IF other_participant_deleted THEN
      -- Restore conversation for participant 2
      UPDATE conversations
      SET 
        deleted_for_participant_2 = FALSE,
        deleted_at_participant_2 = NULL
      WHERE id = NEW.conversation_id;
      
      -- Log for debugging
      RAISE NOTICE 'Restored conversation % for participant 2 due to new message', NEW.conversation_id;
    END IF;
  ELSE
    -- Sender is participant 2, check if participant 1 deleted
    other_participant_deleted := conv_record.deleted_for_participant_1;
    
    IF other_participant_deleted THEN
      -- Restore conversation for participant 1
      UPDATE conversations
      SET 
        deleted_for_participant_1 = FALSE,
        deleted_at_participant_1 = NULL
      WHERE id = NEW.conversation_id;
      
      -- Log for debugging
      RAISE NOTICE 'Restored conversation % for participant 1 due to new message', NEW.conversation_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS restore_conversation_on_message ON messages;
CREATE TRIGGER restore_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION restore_conversation_on_new_message();

COMMENT ON FUNCTION restore_conversation_on_new_message IS 'Automatically restores a soft-deleted conversation when a new message is sent by the other party. Ensures users see new messages even if they previously deleted the conversation.';

