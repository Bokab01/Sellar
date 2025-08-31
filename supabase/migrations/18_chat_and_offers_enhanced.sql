/*
  # Enhanced Chat and Offers System

  1. New Functions
    - `update_conversation_last_message()` - Updates conversation timestamp on new messages
    - `increment_listing_views()` - Safely increments listing view counts
    - `update_offer_counts()` - Updates offer-related counters

  2. Enhanced Tables
    - Add missing indexes for performance
    - Add proper constraints for data integrity
    - Add triggers for automatic updates

  3. Security
    - Enhanced RLS policies for offers
    - Proper message access controls
    - Conversation participant validation
*/

-- Function to update conversation last message timestamp
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to safely increment listing views
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE listings 
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS offers_listing_id_status_idx ON offers(listing_id, status);
CREATE INDEX IF NOT EXISTS offers_buyer_id_status_idx ON offers(buyer_id, status);
CREATE INDEX IF NOT EXISTS offers_seller_id_status_idx ON offers(seller_id, status);
CREATE INDEX IF NOT EXISTS conversations_participants_idx ON conversations(participant_1, participant_2);

-- Add message type validation if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'messages_message_type_check'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'offer', 'system'));
  END IF;
END $$;

-- Add offer status validation if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'offers_status_check'
  ) THEN
    ALTER TABLE offers ADD CONSTRAINT offers_status_check 
    CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired'));
  END IF;
END $$;

-- Enhanced RLS policies for offers
DROP POLICY IF EXISTS "Users can view offers in their conversations" ON offers;
CREATE POLICY "Users can view offers in their conversations"
  ON offers
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = buyer_id) OR 
    (auth.uid() = seller_id) OR
    (EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = offers.conversation_id 
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    ))
  );

-- Enhanced message policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

-- Add trigger for conversation updates if not exists
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();