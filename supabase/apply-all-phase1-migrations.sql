-- =============================================
-- APPLY ALL PHASE 1 MIGRATIONS
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- STEP 1: PROFILES TABLE ENHANCEMENT
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
        ALTER TABLE profiles ADD COLUMN username TEXT;
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
    
    -- Business fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_business') THEN
        ALTER TABLE profiles ADD COLUMN is_business BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_name') THEN
        ALTER TABLE profiles ADD COLUMN business_name TEXT;
    END IF;
    
    -- Verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Statistics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_listings') THEN
        ALTER TABLE profiles ADD COLUMN total_listings INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating_average') THEN
        ALTER TABLE profiles ADD COLUMN rating_average DECIMAL(3,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating_count') THEN
        ALTER TABLE profiles ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- =============================================
-- STEP 2: CORE TABLES
-- =============================================

-- Conversations table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to conversations table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'listing_id') THEN
        ALTER TABLE conversations ADD COLUMN listing_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'buyer_id') THEN
        ALTER TABLE conversations ADD COLUMN buyer_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'seller_id') THEN
        ALTER TABLE conversations ADD COLUMN seller_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'status') THEN
        ALTER TABLE conversations ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_content') THEN
        ALTER TABLE conversations ADD COLUMN last_message_content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_at') THEN
        ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'buyer_unread_count') THEN
        ALTER TABLE conversations ADD COLUMN buyer_unread_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'seller_unread_count') THEN
        ALTER TABLE conversations ADD COLUMN seller_unread_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add foreign key constraints after tables exist
DO $$
BEGIN
    -- Add listing_id foreign key if column and constraint don't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'listing_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_listing_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_listing_id_fkey 
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
    END IF;
    
    -- Add buyer_id foreign key if column and constraint don't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'buyer_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_buyer_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_buyer_id_fkey 
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Add seller_id foreign key if column and constraint don't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'seller_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_seller_id_fkey' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Add unique constraint if columns and constraint don't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'listing_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'buyer_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversations_listing_id_buyer_id_key' 
        AND table_name = 'conversations'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_listing_id_buyer_id_key 
        UNIQUE(listing_id, buyer_id);
    END IF;
END $$;

-- Messages table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns to messages table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
        ALTER TABLE messages ADD COLUMN conversation_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        ALTER TABLE messages ADD COLUMN sender_id UUID NOT NULL DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
        ALTER TABLE messages ADD COLUMN content TEXT NOT NULL DEFAULT '' CHECK (char_length(content) >= 1 AND char_length(content) <= 2000);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'offer', 'system'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachments') THEN
        ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Offers table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    message TEXT CHECK (char_length(message) <= 500),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL CHECK (char_length(title) <= 100),
    message TEXT NOT NULL CHECK (char_length(message) <= 500),
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'message', 'offer', 'listing_sold', 'listing_expired', 'payment_received', 
        'payment_failed', 'post_liked', 'post_commented', 'follow', 'system'
    )),
    related_id UUID,
    related_type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STEP 3: MONETIZATION TABLES
-- =============================================

-- User credits table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_spent INTEGER DEFAULT 0,
    free_listings_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credit transactions table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'purchase', 'refund', 'bonus')),
    amount INTEGER NOT NULL CHECK (amount != 0),
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit purchases table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    package_name TEXT NOT NULL,
    credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
    price_amount DECIMAL(10,2) NOT NULL CHECK (price_amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    payment_reference TEXT UNIQUE NOT NULL,
    credits_awarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Paystack transactions table (create without foreign key constraints first)
CREATE TABLE IF NOT EXISTS paystack_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    paystack_reference TEXT UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'mobile_money')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    purchase_type TEXT NOT NULL CHECK (purchase_type IN ('credit_package', 'subscription', 'feature')),
    purchase_id UUID,
    paystack_response JSONB DEFAULT '{}'::jsonb,
    webhook_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STEP 3.5: ADD ALL FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign key constraints for all tables after they're created
DO $$
BEGIN
    -- Messages table foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_conversation_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_conversation_id_fkey 
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Offers table foreign keys (check column existence first)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'listing_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'offers_listing_id_fkey' 
        AND table_name = 'offers'
    ) THEN
        ALTER TABLE offers 
        ADD CONSTRAINT offers_listing_id_fkey 
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'buyer_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'offers_buyer_id_fkey' 
        AND table_name = 'offers'
    ) THEN
        ALTER TABLE offers 
        ADD CONSTRAINT offers_buyer_id_fkey 
        FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'seller_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'offers_seller_id_fkey' 
        AND table_name = 'offers'
    ) THEN
        ALTER TABLE offers 
        ADD CONSTRAINT offers_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Notifications table foreign keys (check column existence first)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- User credits table foreign keys (check column existence first)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_credits' AND column_name = 'user_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_credits_user_id_fkey' 
        AND table_name = 'user_credits'
    ) THEN
        ALTER TABLE user_credits 
        ADD CONSTRAINT user_credits_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Credit transactions table foreign keys (check column existence first)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_transactions' AND column_name = 'user_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_transactions_user_id_fkey' 
        AND table_name = 'credit_transactions'
    ) THEN
        ALTER TABLE credit_transactions 
        ADD CONSTRAINT credit_transactions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Credit purchases table foreign keys (check column existence first)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_purchases' AND column_name = 'user_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_purchases_user_id_fkey' 
        AND table_name = 'credit_purchases'
    ) THEN
        ALTER TABLE credit_purchases 
        ADD CONSTRAINT credit_purchases_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Paystack transactions table foreign keys (check column existence first)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'paystack_transactions' AND column_name = 'user_id')
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'paystack_transactions_user_id_fkey' 
        AND table_name = 'paystack_transactions'
    ) THEN
        ALTER TABLE paystack_transactions 
        ADD CONSTRAINT paystack_transactions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 5: BASIC RLS POLICIES
-- =============================================

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- User credits policies
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
CREATE POLICY "Users can view own credits" ON user_credits
FOR SELECT USING (auth.uid() = user_id);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- STEP 6: CORE RPC FUNCTIONS
-- =============================================

-- Function to get user's current credit balance
CREATE OR REPLACE FUNCTION get_user_credits(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    balance INTEGER,
    lifetime_earned INTEGER,
    lifetime_spent INTEGER,
    free_listings_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO user_credits (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Return credit information
    RETURN QUERY
    SELECT 
        uc.balance,
        uc.lifetime_earned,
        uc.lifetime_spent,
        uc.free_listings_count
    FROM user_credits uc
    WHERE uc.user_id = user_uuid;
END;
$$;

-- Function to add credits to user account
CREATE OR REPLACE FUNCTION add_user_credits(
    user_uuid UUID,
    credit_amount INTEGER,
    transaction_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Validate input
    IF credit_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be positive';
    END IF;
    
    -- Ensure user_credits record exists
    INSERT INTO user_credits (user_id) 
    VALUES (user_uuid)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current balance
    SELECT balance INTO current_balance
    FROM user_credits
    WHERE user_id = user_uuid;
    
    -- Calculate new balance
    new_balance := current_balance + credit_amount;
    
    -- Update user credits
    UPDATE user_credits 
    SET 
        balance = new_balance,
        lifetime_earned = lifetime_earned + credit_amount,
        updated_at = now()
    WHERE user_id = user_uuid;
    
    -- Record transaction
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description
    ) VALUES (
        user_uuid,
        'earn',
        credit_amount,
        current_balance,
        new_balance,
        transaction_description
    );
    
    RETURN TRUE;
END;
$$;

-- Function to check if user can create listing
CREATE OR REPLACE FUNCTION can_create_listing(user_uuid UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    credits_info RECORD;
    result JSONB;
BEGIN
    -- Get user's credit information
    SELECT * INTO credits_info
    FROM get_user_credits(user_uuid);
    
    -- Check if user has free listings remaining
    IF credits_info.free_listings_count < 5 THEN
        RETURN jsonb_build_object(
            'can_create', true,
            'is_free', true,
            'free_listings_remaining', 5 - credits_info.free_listings_count,
            'message', 'You can create this listing for free!'
        );
    END IF;
    
    -- Check if user has sufficient credits
    IF credits_info.balance < 5 THEN
        RETURN jsonb_build_object(
            'can_create', false,
            'reason', 'insufficient_credits',
            'required_credits', 5,
            'current_balance', credits_info.balance,
            'message', 'You need 5 credits to create a listing. Purchase credits to continue.'
        );
    END IF;
    
    -- User can create listing with credits
    RETURN jsonb_build_object(
        'can_create', true,
        'is_free', false,
        'credits_required', 5,
        'current_balance', credits_info.balance,
        'message', 'Ready to create listing for 5 credits.'
    );
END;
$$;

-- =============================================
-- STEP 7: CREATE INDEXES
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(location);

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Credit transactions indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- =============================================
-- STEP 8: GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_credits(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_listing(UUID) TO authenticated;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Phase 1 database setup completed successfully!' as status;

-- Show created tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'conversations', 'messages', 'offers', 'notifications', 'user_credits', 'credit_transactions', 'credit_purchases', 'paystack_transactions')
ORDER BY table_name;
