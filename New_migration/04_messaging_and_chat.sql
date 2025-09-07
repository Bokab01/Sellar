-- =============================================
-- SELLAR MOBILE APP - MESSAGING AND CHAT
-- Migration 04: Messaging and chat system
-- =============================================

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Participants (EXACT APP MATCH - note the field names!)
    participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Related Listing (if conversation started from a listing)
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    
    -- Conversation Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'deleted')),
    
    -- Last Message Info (EXACT APP MATCH)
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_id UUID,
    last_message_preview TEXT,
    
    -- Participant Status
    participant_1_archived BOOLEAN DEFAULT false,
    participant_2_archived BOOLEAN DEFAULT false,
    participant_1_deleted BOOLEAN DEFAULT false,
    participant_2_deleted BOOLEAN DEFAULT false,
    participant_1_blocked BOOLEAN DEFAULT false,
    participant_2_blocked BOOLEAN DEFAULT false,
    
    -- Unread Counts
    participant_1_unread_count INTEGER DEFAULT 0,
    participant_2_unread_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure participants are different
    CHECK (participant_1 != participant_2),
    
    -- Unique conversation between two users
    UNIQUE(participant_1, participant_2, listing_id)
);

-- =============================================
-- MESSAGES TABLE
-- =============================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message Content
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'offer', 'system', 'location')),
    
    -- Media and Attachments (EXACT APP MATCH)
    images JSONB DEFAULT '[]', -- App expects this field name
    attachments JSONB DEFAULT '[]',
    
    -- Message Status
    status message_status DEFAULT 'sent',
    
    -- Read Status
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Reply Information (EXACT APP MATCH)
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL, -- App expects this field name
    
    -- Offer Information (for offer messages) (EXACT APP MATCH)
    offer_data JSONB, -- App expects this field name
    
    -- Location Information (for location messages)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location_name TEXT,
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    flagged_at TIMESTAMPTZ,
    flagged_by UUID REFERENCES profiles(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MESSAGE REACTIONS TABLE
-- =============================================

CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Reaction
    reaction TEXT NOT NULL CHECK (reaction IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

-- =============================================
-- CHAT OFFERS TABLE
-- =============================================

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Offer Details (EXACT APP MATCH)
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Amount
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn', 'countered')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Counter Offer
    parent_offer_id UUID REFERENCES offers(id),
    
    -- Response
    response_message TEXT,
    responded_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BLOCKED USERS TABLE
-- =============================================

CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Block Details
    reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't block themselves
    CHECK (blocker_id != blocked_id),
    
    UNIQUE(blocker_id, blocked_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Conversations indexes
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- Composite index for user conversations
CREATE INDEX idx_conversations_user_active ON conversations(participant_1_id, status, last_message_at DESC)
WHERE participant_1_deleted = false;
CREATE INDEX idx_conversations_user_active_2 ON conversations(participant_2_id, status, last_message_at DESC)
WHERE participant_2_deleted = false;

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_message_type ON messages(message_type);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);

-- Composite index for conversation messages
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Message reactions indexes
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);

-- Chat offers indexes
CREATE INDEX idx_chat_offers_conversation_id ON chat_offers(conversation_id);
CREATE INDEX idx_chat_offers_listing_id ON chat_offers(listing_id);
CREATE INDEX idx_chat_offers_offered_by ON chat_offers(offered_by);
CREATE INDEX idx_chat_offers_offered_to ON chat_offers(offered_to);
CREATE INDEX idx_chat_offers_status ON chat_offers(status);
CREATE INDEX idx_chat_offers_expires_at ON chat_offers(expires_at);

-- Blocked users indexes
CREATE INDEX idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on conversations
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on messages
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on chat_offers
CREATE TRIGGER update_chat_offers_updated_at
    BEFORE UPDATE ON chat_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR MESSAGING
-- =============================================

-- Function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the conversation with the new message info
    UPDATE conversations 
    SET 
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        last_message_preview = CASE 
            WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
            WHEN NEW.message_type = 'image' THEN '📷 Image'
            WHEN NEW.message_type = 'file' THEN '📎 File'
            WHEN NEW.message_type = 'offer' THEN '💰 Offer'
            WHEN NEW.message_type = 'location' THEN '📍 Location'
            ELSE 'Message'
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation last message
CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function to update unread counts
CREATE OR REPLACE FUNCTION update_unread_counts()
RETURNS TRIGGER AS $$
DECLARE
    conv_record RECORD;
BEGIN
    -- Get conversation details
    SELECT * INTO conv_record FROM conversations WHERE id = NEW.conversation_id;
    
    -- Increment unread count for the recipient
    IF NEW.sender_id = conv_record.participant_1_id THEN
        UPDATE conversations 
        SET participant_2_unread_count = participant_2_unread_count + 1
        WHERE id = NEW.conversation_id;
    ELSE
        UPDATE conversations 
        SET participant_1_unread_count = participant_1_unread_count + 1
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update unread counts
CREATE TRIGGER update_unread_counts_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_unread_counts();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conv_id UUID, user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Mark all unread messages in the conversation as read
    UPDATE messages 
    SET 
        read_at = NOW(),
        status = 'read'
    WHERE 
        conversation_id = conv_id 
        AND sender_id != user_id 
        AND read_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Reset unread count for the user
    UPDATE conversations 
    SET 
        participant_1_unread_count = CASE WHEN participant_1_id = user_id THEN 0 ELSE participant_1_unread_count END,
        participant_2_unread_count = CASE WHEN participant_2_id = user_id THEN 0 ELSE participant_2_unread_count END
    WHERE id = conv_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    user1_id UUID, 
    user2_id UUID, 
    listing_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
    ordered_user1_id UUID;
    ordered_user2_id UUID;
BEGIN
    -- Ensure consistent ordering of participants
    IF user1_id < user2_id THEN
        ordered_user1_id := user1_id;
        ordered_user2_id := user2_id;
    ELSE
        ordered_user1_id := user2_id;
        ordered_user2_id := user1_id;
    END IF;
    
    -- Try to find existing conversation
    SELECT id INTO conv_id 
    FROM conversations 
    WHERE 
        participant_1_id = ordered_user1_id 
        AND participant_2_id = ordered_user2_id
        AND (listing_id IS NULL OR conversations.listing_id = listing_id);
    
    -- If not found, create new conversation
    IF conv_id IS NULL THEN
        INSERT INTO conversations (participant_1_id, participant_2_id, listing_id)
        VALUES (ordered_user1_id, ordered_user2_id, listing_id)
        RETURNING id INTO conv_id;
    END IF;
    
    RETURN conv_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Messaging and chat tables created successfully!' as status;
