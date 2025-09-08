-- =============================================
-- FIX: Complete messaging system RLS policies
-- =============================================

-- Ensure conversations table exists with correct structure
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Conversation Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    
    -- Last Message Info
    last_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique conversation per listing between two users
    UNIQUE(participant_1, participant_2, listing_id)
);

-- Ensure messages table exists with correct structure
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message Content
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'offer', 'system', 'location', 'counter_offer')),
    
    -- Media and Attachments
    images JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    
    -- Message Status
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    
    -- Read Status
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Reply Information
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Offer Information (for offer messages)
    offer_data JSONB,
    
    -- Location Information (for location messages)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location_name TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- RLS Policies for conversations table
CREATE POLICY "Users can view conversations they participate in" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

CREATE POLICY "Users can update conversations they participate in" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );

-- RLS Policies for messages table
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can create messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = messages.conversation_id 
            AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
        )
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);

-- Success message
SELECT 'Messaging system RLS policies fixed successfully!' as status;
