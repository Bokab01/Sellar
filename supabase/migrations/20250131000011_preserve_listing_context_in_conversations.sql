-- =====================================================
-- PRESERVE LISTING CONTEXT IN CONVERSATIONS
-- =====================================================
-- 
-- When a listing is deleted, preserve context so users can:
-- 1. See blurred listing banner with "Deleted" indicator
-- 2. See automatic system message in chat
-- 3. Continue viewing conversation history
-- =====================================================

-- =====================================================
-- PART 1: Add Listing Snapshot to Conversations
-- =====================================================

-- Add snapshot columns to preserve listing context
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS listing_title TEXT,
ADD COLUMN IF NOT EXISTS listing_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS listing_images JSONB,
ADD COLUMN IF NOT EXISTS listing_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS listing_snapshot_at TIMESTAMP;

-- =====================================================
-- PART 2: Create Trigger to Capture Listing Snapshot
-- =====================================================

-- Trigger function to capture listing data when conversation is created
CREATE OR REPLACE FUNCTION capture_listing_snapshot_on_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_listing RECORD;
BEGIN
  -- Only capture if listing_id is provided
  IF NEW.listing_id IS NOT NULL THEN
    SELECT title, price, images, status
    INTO v_listing
    FROM listings
    WHERE id = NEW.listing_id;
    
    IF FOUND THEN
      NEW.listing_title := v_listing.title;
      NEW.listing_price := v_listing.price;
      NEW.listing_images := v_listing.images;
      NEW.listing_status := v_listing.status;
      NEW.listing_snapshot_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_capture_listing_snapshot_conversation ON conversations;
CREATE TRIGGER trigger_capture_listing_snapshot_conversation
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION capture_listing_snapshot_on_conversation();

-- =====================================================
-- PART 3: Notify on Listing Status Changes
-- =====================================================

-- Trigger function to send system message when listing is deleted or sold
CREATE OR REPLACE FUNCTION notify_conversation_on_listing_change()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
  v_system_message TEXT;
BEGIN
  -- Handle DELETE (listing deleted)
  IF TG_OP = 'DELETE' THEN
    -- Find all conversations about this listing
    FOR v_conversation_id IN 
      SELECT id FROM conversations WHERE listing_id = OLD.id
    LOOP
      -- Insert system message
      INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        created_at
      ) VALUES (
        v_conversation_id,
        OLD.seller_id, -- Message from seller
        '🗑️ This listing has been deleted by the seller.',
        'system',
        NOW()
      );
      
      -- Update conversation's listing_id to NULL
      UPDATE conversations
      SET 
        listing_id = NULL,
        last_message_at = NOW()
      WHERE id = v_conversation_id;
    END LOOP;
    
    RETURN OLD;
  END IF;

  -- Handle UPDATE (status change to sold)
  IF TG_OP = 'UPDATE' AND OLD.status != 'sold' AND NEW.status = 'sold' THEN
    -- Find all conversations about this listing
    FOR v_conversation_id IN 
      SELECT id FROM conversations WHERE listing_id = NEW.id
    LOOP
      -- Insert system message
      INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        created_at
      ) VALUES (
        v_conversation_id,
        NEW.seller_id,
        '✅ This item has been sold.',
        'system',
        NOW()
      );
      
      -- Update conversation's last_message_at
      UPDATE conversations
      SET last_message_at = NOW()
      WHERE id = v_conversation_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_conversation_on_listing_delete ON listings;
CREATE TRIGGER trigger_notify_conversation_on_listing_delete
  BEFORE DELETE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION notify_conversation_on_listing_change();

DROP TRIGGER IF EXISTS trigger_notify_conversation_on_listing_sold ON listings;
CREATE TRIGGER trigger_notify_conversation_on_listing_sold
  AFTER UPDATE ON listings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'sold')
  EXECUTE FUNCTION notify_conversation_on_listing_change();

-- =====================================================
-- PART 4: Backfill Existing Conversations
-- =====================================================

-- Backfill listing snapshot for existing conversations
UPDATE conversations c
SET 
  listing_title = l.title,
  listing_price = l.price,
  listing_images = l.images,
  listing_status = l.status,
  listing_snapshot_at = NOW()
FROM listings l
WHERE c.listing_id = l.id
  AND c.listing_title IS NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION capture_listing_snapshot_on_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION notify_conversation_on_listing_change TO authenticated;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Listing context preservation enabled for conversations!';
  RAISE NOTICE '';
  RAISE NOTICE '📸 Snapshot Capture:';
  RAISE NOTICE '  - Listing title, price, images, status captured on conversation creation';
  RAISE NOTICE '  - Snapshot preserved even after listing deleted';
  RAISE NOTICE '';
  RAISE NOTICE '💬 System Messages:';
  RAISE NOTICE '  - Auto-insert "Listing deleted" message when seller deletes listing';
  RAISE NOTICE '  - Auto-insert "Item sold" message when listing marked as sold';
  RAISE NOTICE '';
  RAISE NOTICE '🎨 UI Implementation Needed:';
  RAISE NOTICE '  1. Show blurred listing banner when listing_id is NULL';
  RAISE NOTICE '  2. Display "Deleted" or "Sold" badge on banner';
  RAISE NOTICE '  3. Use snapshot data (listing_title, listing_price, listing_images)';
  RAISE NOTICE '  4. System messages automatically appear in chat';
END $$;

