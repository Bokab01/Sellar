-- =============================================
-- FIX: Conversations table RLS policies
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

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Success message
SELECT 'Conversations table RLS policies fixed successfully!' as status;
