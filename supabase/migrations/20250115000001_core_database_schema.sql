-- =============================================
-- CORE DATABASE SCHEMA MIGRATION
-- Phase 1: Core Backend Infrastructure
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- PROFILES TABLE (User Management)
-- =============================================

-- Create profiles table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to profiles table
DO $$
BEGIN
    -- Basic profile fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE profiles ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE profiles ADD COLUMN location TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE profiles ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
    END IF;
    
    -- Business Profile Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_business') THEN
        ALTER TABLE profiles ADD COLUMN is_business BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_name') THEN
        ALTER TABLE profiles ADD COLUMN business_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_type') THEN
        ALTER TABLE profiles ADD COLUMN business_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_registration_number') THEN
        ALTER TABLE profiles ADD COLUMN business_registration_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_address') THEN
        ALTER TABLE profiles ADD COLUMN business_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_phone') THEN
        ALTER TABLE profiles ADD COLUMN business_phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_email') THEN
        ALTER TABLE profiles ADD COLUMN business_email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_website') THEN
        ALTER TABLE profiles ADD COLUMN business_website TEXT;
    END IF;
    
    -- Verification Status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
        ALTER TABLE profiles ADD COLUMN verification_level TEXT DEFAULT 'none' CHECK (verification_level IN ('none', 'phone', 'email', 'identity', 'business'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_documents') THEN
        ALTER TABLE profiles ADD COLUMN verification_documents JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Account Status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
        ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspension_reason') THEN
        ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
    END IF;
    
    -- Privacy Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_visibility') THEN
        ALTER TABLE profiles ADD COLUMN profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_phone') THEN
        ALTER TABLE profiles ADD COLUMN show_phone BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_email') THEN
        ALTER TABLE profiles ADD COLUMN show_email BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_location') THEN
        ALTER TABLE profiles ADD COLUMN show_location BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Statistics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_listings') THEN
        ALTER TABLE profiles ADD COLUMN total_listings INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_sales') THEN
        ALTER TABLE profiles ADD COLUMN total_sales INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_purchases') THEN
        ALTER TABLE profiles ADD COLUMN total_purchases INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating_average') THEN
        ALTER TABLE profiles ADD COLUMN rating_average DECIMAL(3,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating_count') THEN
        ALTER TABLE profiles ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;
    
    -- Timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_seen_at') THEN
        ALTER TABLE profiles ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Add indexes for profiles (only if columns exist)
DO $$
BEGIN
    -- Check if username column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
    END IF;
    
    -- Check if email column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
    END IF;
    
    -- Check if phone column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
    END IF;
    
    -- Check if location column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);
    END IF;
    
    -- Check if is_business column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_business') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_is_business ON profiles(is_business);
    END IF;
    
    -- Check if is_verified column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);
    END IF;
    
    -- Check if created_at column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
    END IF;
END $$;

-- =============================================
-- LISTINGS TABLE (Already exists, but ensure completeness)
-- =============================================

-- The listings table was already created in setup-listings-table.sql
-- Ensure it has all necessary fields for Phase 1

-- =============================================
-- CONVERSATIONS TABLE (Chat System)
-- =============================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Conversation Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    
    -- Last Message Info (for performance)
    last_message_id UUID,
    last_message_content TEXT,
    last_message_at TIMESTAMPTZ DEFAULT now(),
    last_message_sender_id UUID REFERENCES profiles(id),
    
    -- Read Status
    buyer_last_read_at TIMESTAMPTZ DEFAULT now(),
    seller_last_read_at TIMESTAMPTZ DEFAULT now(),
    buyer_unread_count INTEGER DEFAULT 0,
    seller_unread_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique conversation per listing-buyer pair
    UNIQUE(listing_id, buyer_id)
);

-- Add indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- =============================================
-- MESSAGES TABLE (Chat Messages)
-- =============================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Message Content
    content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'offer', 'system')),
    
    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Message Status
    is_read BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    
    -- Offer-specific fields (when message_type = 'offer')
    offer_amount DECIMAL(10,2),
    offer_status TEXT CHECK (offer_status IN ('pending', 'accepted', 'rejected', 'expired')),
    offer_expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- =============================================
-- OFFERS TABLE (Formal Offers System)
-- =============================================

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Offer Details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    message TEXT CHECK (char_length(message) <= 500),
    
    -- Offer Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),
    
    -- Response Details
    response_message TEXT CHECK (char_length(response_message) <= 500),
    responded_at TIMESTAMPTZ,
    
    -- Expiry
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for offers
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers(expires_at);

-- =============================================
-- POSTS TABLE (Community Features)
-- =============================================

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Post Content
    title TEXT CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 5000),
    post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'question', 'tip', 'review', 'announcement')),
    
    -- Optional listing reference (for posts about specific listings)
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    
    -- Media and Location
    images JSONB DEFAULT '[]'::jsonb,
    location TEXT,
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    
    -- Post Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'reported', 'removed')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    reported_count INTEGER DEFAULT 0,
    is_moderated BOOLEAN DEFAULT FALSE,
    moderated_by UUID REFERENCES profiles(id),
    moderated_at TIMESTAMPTZ,
    moderation_reason TEXT,
    
    -- Tags and Categories
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_listing_id ON posts(listing_id);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);

-- =============================================
-- COMMENTS TABLE (Post Comments)
-- =============================================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested comments
    
    -- Comment Content
    content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    
    -- Comment Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_reported BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- =============================================
-- NOTIFICATIONS TABLE (User Notifications)
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Notification Content
    title TEXT NOT NULL CHECK (char_length(title) <= 100),
    message TEXT NOT NULL CHECK (char_length(message) <= 500),
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'message', 'offer', 'listing_sold', 'listing_expired', 'payment_received', 
        'payment_failed', 'post_liked', 'post_commented', 'follow', 'system'
    )),
    
    -- Related Entities
    related_id UUID, -- ID of related entity (listing, message, post, etc.)
    related_type TEXT, -- Type of related entity
    
    -- Notification Status
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    
    -- Delivery Channels
    sent_push BOOLEAN DEFAULT FALSE,
    sent_email BOOLEAN DEFAULT FALSE,
    sent_sms BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================
-- USER_SETTINGS TABLE (User Preferences)
-- =============================================

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Notification Preferences
    notifications_enabled BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    
    -- Specific Notification Types
    notify_messages BOOLEAN DEFAULT TRUE,
    notify_offers BOOLEAN DEFAULT TRUE,
    notify_sales BOOLEAN DEFAULT TRUE,
    notify_posts BOOLEAN DEFAULT TRUE,
    notify_marketing BOOLEAN DEFAULT FALSE,
    
    -- Privacy Settings
    profile_searchable BOOLEAN DEFAULT TRUE,
    show_online_status BOOLEAN DEFAULT TRUE,
    allow_friend_requests BOOLEAN DEFAULT TRUE,
    
    -- App Preferences
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'GHS',
    timezone TEXT DEFAULT 'Africa/Accra',
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BASIC RLS POLICIES (More detailed policies in next migration)
-- =============================================

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations
FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations" ON messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
    )
);

-- Posts policies
CREATE POLICY "Published posts are viewable by everyone" ON posts
FOR SELECT USING (status = 'published');

CREATE POLICY "Users can create posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments on published posts are viewable" ON comments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM posts 
        WHERE posts.id = comments.post_id 
        AND posts.status = 'published'
    )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify tables were created
SELECT 'Core database schema migration completed successfully' as status;

-- Show table counts
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    typname as data_type
FROM pg_tables 
JOIN pg_attribute ON pg_tables.tablename::regclass = pg_attribute.attrelid
JOIN pg_type ON pg_attribute.atttypid = pg_type.oid
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'conversations', 'messages', 'offers', 'posts', 'comments', 'notifications', 'user_settings')
    AND attnum > 0
ORDER BY tablename, attnum;
