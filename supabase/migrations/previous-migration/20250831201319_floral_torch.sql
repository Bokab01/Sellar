/*
  # Messaging and Offers System

  1. New Tables
    - `conversations` - Chat conversations between users
      - `id` (uuid, primary key)
      - `listing_id` (uuid, optional reference to listing)
      - `participant_1`, `participant_2` (uuid, references profiles)
      - `last_message_at` (timestamptz, for sorting)
      - `created_at` (timestamp)

    - `messages` - Individual chat messages
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `sender_id` (uuid, references profiles)
      - `content` (text, message content)
      - `message_type` (text, enum: text, image, offer, system)
      - `images` (jsonb, array of image URLs)
      - `offer_data` (jsonb, offer details when type is 'offer')
      - `status` (text, enum: sending, sent, delivered, read, failed)
      - `reply_to` (uuid, optional reference to parent message)
      - `created_at`, `updated_at` (timestamps)

    - `offers` - Price offers integrated with messaging
      - `id` (uuid, primary key)
      - `listing_id` (uuid, references listings)
      - `conversation_id` (uuid, references conversations)
      - `message_id` (uuid, references messages)
      - `buyer_id`, `seller_id` (uuid, references profiles)
      - `amount` (numeric, offer price)
      - `currency` (text, default: 'GHS')
      - `message` (text, optional offer message)
      - `status` (text, enum: pending, accepted, rejected, countered, expired)
      - `expires_at` (timestamptz, offer expiration)
      - `parent_offer_id` (uuid, for counter-offers)
      - `created_at`, `updated_at` (timestamps)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own conversations
    - Users can only send messages in their conversations
    - Buyers can create offers, sellers can respond
    - Comprehensive access controls for offer management

  3. Functions & Triggers
    - Auto-update conversation timestamp on new messages
    - Automatic timestamp updates for all tables
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  participant_1 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1, participant_2, listing_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'offer', 'system')),
  images jsonb DEFAULT '[]',
  offer_data jsonb,
  status text DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'GHS',
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '3 days'),
  parent_offer_id uuid REFERENCES offers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can update conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Messages policies
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

CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Offers policies
CREATE POLICY "Users can view offers in their conversations"
  ON offers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create offers"
  ON offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id AND
    auth.uid() != seller_id AND
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = offers.listing_id
      AND listings.status = 'active'
    )
  );

CREATE POLICY "Sellers can update offer status"
  ON offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Create function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE OR REPLACE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();