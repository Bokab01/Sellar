-- =============================================
-- Listing Deletion Notification System
-- =============================================
-- This migration adds a trigger to automatically notify users
-- in chat when a listing is deleted or permanently removed
-- =============================================

-- Function to insert system message when listing is deleted
CREATE OR REPLACE FUNCTION notify_listing_deletion()
RETURNS TRIGGER AS $$
DECLARE
  conversation_record RECORD;
  listing_title TEXT;
BEGIN
  -- Only proceed if listing is being permanently removed (not just status change)
  -- We trigger on actual deletion or when status changes to 'suspended'
  IF (TG_OP = 'DELETE') OR (NEW.status IN ('suspended')) THEN
    
    -- Store listing title before it's gone
    IF TG_OP = 'DELETE' THEN
      listing_title := OLD.title;
    ELSE
      listing_title := NEW.title;
    END IF;
    
    -- Find all conversations related to this listing
    FOR conversation_record IN 
      SELECT id, participant_1, participant_2
      FROM conversations
      WHERE listing_id = COALESCE(NEW.id, OLD.id)
      AND archived = false
    LOOP
      -- Insert a system message to notify both users
      INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        created_at
      ) VALUES (
        conversation_record.id,
        conversation_record.participant_1, -- Use one of the participants as sender for consistency
        CASE 
          WHEN TG_OP = 'DELETE' THEN 
            '⚠️ The listing "' || listing_title || '" has been removed by the seller.'
          ELSE 
            '⚠️ The listing "' || listing_title || '" is no longer available.'
        END,
        'system',
        NOW()
      );
      
      -- Log the notification
      RAISE NOTICE 'Listing deletion notification sent for conversation: % (listing: %)', 
        conversation_record.id, listing_title;
    END LOOP;
  END IF;
  
  -- Return the appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires when listing is deleted or suspended
DROP TRIGGER IF EXISTS trigger_notify_listing_deletion ON listings;

CREATE TRIGGER trigger_notify_listing_deletion
  BEFORE DELETE OR UPDATE OF status
  ON listings
  FOR EACH ROW
  WHEN (
    -- Only trigger on deletion or when status changes to suspended
    (TG_OP = 'DELETE') OR 
    (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'suspended')
  )
  EXECUTE FUNCTION notify_listing_deletion();

-- =============================================
-- Comments
-- =============================================
COMMENT ON FUNCTION notify_listing_deletion() IS 
  'Automatically inserts a system message in all related conversations when a listing is deleted or suspended';

COMMENT ON TRIGGER trigger_notify_listing_deletion ON listings IS
  'Notifies users in chat when a listing they are discussing is deleted or removed';

