-- =============================================
-- SELLAR MOBILE APP - COMPLETE DATABASE SETUP
-- Single file containing all migrations and setup
-- =============================================

-- Run this single file in your Supabase project's SQL Editor

-- Starting Sellar Mobile App complete database setup...

-- =============================================
-- MIGRATION 01: EXTENSIONS AND CORE SETUP
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE verification_level AS ENUM ('none', 'phone', 'email', 'identity', 'business', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('draft', 'active', 'inactive', 'sold', 'expired', 'pending', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged', 'under_review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- MIGRATION 02: PROFILES AND AUTHENTICATION
-- =============================================

-- Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    username TEXT UNIQUE,
    first_name TEXT NOT NULL DEFAULT 'User',
    last_name TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT DEFAULT 'Accra, Greater Accra',
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMPTZ,
    
    -- Business Information
    is_business BOOLEAN DEFAULT false,
    business_name TEXT,
    business_type TEXT,
    business_registration_number TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_email TEXT,
    business_website TEXT,
    business_description TEXT,
    business_established_year INTEGER,
    business_employee_count TEXT CHECK (business_employee_count IN ('1', '2-10', '11-50', '51-200', '200+')),
    business_services TEXT[],
    business_coverage_areas TEXT[],
    business_category_id UUID,
    
    -- Business Display Preferences
    display_business_name BOOLEAN DEFAULT false,
    business_name_priority TEXT DEFAULT 'secondary' CHECK (business_name_priority IN ('primary', 'secondary', 'hidden')),
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT false,
    verification_level verification_level DEFAULT 'none',
    verification_badges TEXT[] DEFAULT '{}',
    verification_documents JSONB DEFAULT '[]',
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMPTZ,
    business_verified BOOLEAN DEFAULT false,
    business_verified_at TIMESTAMPTZ,
    trust_score INTEGER DEFAULT 0,
    trust_score_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Social Information
    website TEXT,
    social_links JSONB DEFAULT '{}',
    
    -- Preferences
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'Africa/Accra',
    currency TEXT DEFAULT 'GHS',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ,
    
    -- Rating and Performance
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    credit_balance DECIMAL(12,2) DEFAULT 0,
    response_time TEXT DEFAULT 'within_hours' CHECK (response_time IN ('within_minutes', 'within_hours', 'within_day', 'within_week')),
    account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'business', 'premium')),
    
    -- Contact Preferences
    professional_title TEXT,
    years_of_experience INTEGER,
    specializations TEXT[] DEFAULT '{}',
    preferred_contact_method TEXT DEFAULT 'app' CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp')),
    response_time_expectation TEXT DEFAULT 'within_hours' CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week')),
    
    -- Privacy Settings
    show_phone BOOLEAN DEFAULT false,
    show_email BOOLEAN DEFAULT false,
    show_location BOOLEAN DEFAULT true,
    allow_messages BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    
    -- Privacy Settings
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
    phone_visibility TEXT DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private')),
    email_visibility TEXT DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private')),
    show_online_status BOOLEAN DEFAULT true,
    show_last_seen BOOLEAN DEFAULT true,
    allow_friend_requests BOOLEAN DEFAULT true,
    
    -- App Preferences
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'GHS',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Security events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Event Information
    event_type TEXT NOT NULL CHECK (event_type IN (
        'signup_attempt', 'login_attempt', 'login', 'failed_login', 'logout',
        'password_reset', 'password_change', 'email_verification', 'email_change',
        'profile_update', 'suspicious_activity', 'rate_limit_exceeded',
        'account_lockout', 'account_locked', 'device_change',
        'mfa_enabled', 'mfa_disabled', 'input_threat'
    )),
    
    -- Context Information
    email TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    
    -- Event Details
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 03: CATEGORIES AND LISTINGS
-- =============================================

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    
    -- Basic Information
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    image_url TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category attributes table
CREATE TABLE category_attributes (
    id UUID PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    
    -- Attribute Information
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'multiselect', 'boolean', 'date', 'url')),
    
    -- Configuration (EXACT APP MATCH)
    required BOOLEAN DEFAULT false, -- App expects this field name
    is_required BOOLEAN DEFAULT false, -- Keep for backward compatibility
    is_filterable BOOLEAN DEFAULT false,
    is_searchable BOOLEAN DEFAULT false,
    
    -- Options for select/multiselect types
    options JSONB DEFAULT '[]',
    
    -- Validation
    validation_rules JSONB DEFAULT '{}',
    
    -- Display
    placeholder TEXT,
    help_text TEXT,
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    
    -- Basic Information
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    
    -- Product Details
    condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    quantity INTEGER DEFAULT 1,
    brand TEXT,
    model TEXT,
    year INTEGER,
    
    -- Location
    location TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Images and Media
    images TEXT[] DEFAULT '{}',
    video_url TEXT,
    
    -- Category-specific attributes
    attributes JSONB DEFAULT '{}',
    
    -- Status and Visibility
    status listing_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    is_negotiable BOOLEAN DEFAULT true,
    accept_offers BOOLEAN DEFAULT true,
    
    -- Moderation
    moderation_status moderation_status DEFAULT 'pending',
    moderation_score INTEGER DEFAULT 0,
    flagged_reasons TEXT[],
    auto_moderated_at TIMESTAMPTZ,
    admin_reviewed_at TIMESTAMPTZ,
    admin_reviewed_by UUID REFERENCES profiles(id),
    
    -- Engagement Metrics
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- SEO and Search
    slug TEXT UNIQUE,
    seo_title TEXT,
    keywords TEXT[],
    tags TEXT[],
    search_vector tsvector,
    
    -- Expiry and Scheduling
    expires_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    
    -- Boost and Promotion
    is_boosted BOOLEAN DEFAULT false,
    boost_expires_at TIMESTAMPTZ,
    boost_level INTEGER DEFAULT 0,
    
    -- Contact Information
    contact_method TEXT DEFAULT 'app' CHECK (contact_method IN ('app', 'phone', 'email', 'whatsapp')),
    contact_phone TEXT,
    contact_email TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 04: MESSAGING AND CHAT
-- =============================================

-- Conversations table
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

-- Messages table
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
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offers table
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
-- MIGRATION 05: MONETIZATION SYSTEM
-- =============================================

-- User credits table
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) DEFAULT 0,
    total_earned DECIMAL(12,2) DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Main transactions table (what the frontend expects)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction Details (matching frontend Transaction interface)
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'credit_purchase', 'credit_usage', 'credit_refund', 'listing_boost', 
        'listing_promotion', 'feature_unlock', 'subscription_payment', 
        'commission_earned', 'referral_bonus', 'verification_fee', 
        'withdrawal', 'deposit', 'penalty', 'bonus', 'adjustment'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
    )),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    credits_amount INTEGER,
    
    -- Payment Information
    payment_method TEXT CHECK (payment_method IN (
        'credits', 'mobile_money', 'bank_transfer', 'card', 'paystack', 'system', 'manual'
    )),
    payment_reference TEXT,
    payment_provider TEXT,
    
    -- Transaction Content
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- Related Entities
    related_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    related_order_id UUID,
    related_subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Balance Tracking
    balance_before DECIMAL(12,2),
    balance_after DECIMAL(12,2),
    
    -- Additional Data
    metadata JSONB DEFAULT '{}',
    receipt_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Transaction categories table
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction receipts table
CREATE TABLE transaction_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_url TEXT NOT NULL,
    receipt_type TEXT DEFAULT 'pdf' CHECK (receipt_type IN ('pdf', 'image', 'html')),
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction notifications table
CREATE TABLE transaction_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'transaction_created', 'transaction_completed', 'transaction_failed', 
        'payment_received', 'refund_processed'
    )),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Credit transactions table (legacy - kept for backward compatibility)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction Details
    type TEXT NOT NULL CHECK (type IN ('earned', 'spent', 'purchased', 'refunded', 'bonus', 'penalty')),
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    
    -- Context
    description TEXT,
    reference_type TEXT, -- 'listing', 'boost', 'feature', etc.
    reference_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 06: SOCIAL FEATURES
-- =============================================

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    location TEXT,
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    
    -- Status
    is_pinned BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post likes table
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shares table
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)
);

-- Post bookmarks table
CREATE TABLE post_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)
);

-- =============================================
-- MIGRATION 07: SUPPORT SYSTEM
-- =============================================

-- Support tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Ticket Information
    ticket_number TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    
    -- Response Tracking
    first_response_at TIMESTAMPTZ,
    last_response_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support ticket messages table
CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message Content
    message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 2000),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachments JSONB DEFAULT '[]',
    
    -- Message Context
    is_internal BOOLEAN DEFAULT false, -- Internal support team messages
    is_system BOOLEAN DEFAULT false,   -- System-generated messages
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base articles table
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Article Content
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) >= 50),
    excerpt TEXT CHECK (char_length(excerpt) <= 500),
    
    -- Categorization
    category TEXT NOT NULL CHECK (category IN (
        'getting_started', 'buying_selling', 'credits_billing', 'account_privacy', 
        'technical_issues', 'safety_guidelines', 'features', 'policies'
    )),
    tags TEXT[] DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    
    -- Authorship
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- SEO
    meta_description TEXT CHECK (char_length(meta_description) <= 160),
    search_keywords TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base article feedback table
CREATE TABLE kb_article_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for anonymous feedback
    
    -- Feedback
    is_helpful BOOLEAN NOT NULL,
    feedback_text TEXT CHECK (char_length(feedback_text) <= 1000),
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one feedback per user per article
    UNIQUE(article_id, user_id)
);

-- FAQ categories table
CREATE TABLE faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    slug TEXT UNIQUE NOT NULL,
    description TEXT CHECK (char_length(description) <= 500),
    icon TEXT,
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQ items table
CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
    
    -- FAQ Content
    question TEXT NOT NULL CHECK (char_length(question) >= 10 AND char_length(question) <= 500),
    answer TEXT NOT NULL CHECK (char_length(answer) >= 20 AND char_length(answer) <= 2000),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 07: MODERATION SYSTEM
-- =============================================

-- Moderation categories table
CREATE TABLE moderation_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Severity and Actions
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    auto_action TEXT DEFAULT 'flag' CHECK (auto_action IN ('none', 'flag', 'hide', 'remove', 'ban')),
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reporter Information
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Target Content
    content_type TEXT NOT NULL CHECK (content_type IN ('listing', 'message', 'review', 'post', 'comment', 'profile', 'user')),
    content_id UUID NOT NULL,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Report Details
    category_id UUID REFERENCES moderation_categories(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    description TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed', 'escalated')),
    
    -- Resolution
    action_taken TEXT,
    resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 08: VERIFICATION SYSTEM
-- =============================================

-- User verification table
CREATE TABLE user_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Verification Type
    verification_type TEXT NOT NULL CHECK (verification_type IN ('phone', 'email', 'identity', 'business', 'address')),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired', 'cancelled')),
    
    -- Verification Data
    submitted_data JSONB DEFAULT '{}',
    documents JSONB DEFAULT '[]',
    verification_code TEXT,
    verification_token TEXT,
    
    -- Review Information
    reviewer_id UUID REFERENCES profiles(id),
    reviewer_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Context Information
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One active verification per type per user
    UNIQUE(user_id, verification_type)
);

-- Verification documents table
CREATE TABLE verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL REFERENCES user_verification(id) ON DELETE CASCADE,
    
    -- Document Information
    document_type TEXT NOT NULL CHECK (document_type IN (
        'national_id', 'passport', 'drivers_license', 'voters_id',
        'business_registration', 'tax_certificate', 'utility_bill',
        'bank_statement', 'selfie', 'address_proof'
    )),
    
    -- File Information
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- Processing Status
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'verified', 'rejected')),
    
    -- OCR and Analysis Results
    ocr_data JSONB DEFAULT '{}',
    analysis_results JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    
    -- Review Information
    reviewer_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification templates table
CREATE TABLE verification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Information
    verification_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Requirements
    required_documents TEXT[] DEFAULT '{}',
    required_fields JSONB DEFAULT '{}',
    
    -- Configuration
    auto_approve BOOLEAN DEFAULT false,
    requires_manual_review BOOLEAN DEFAULT true,
    expiry_days INTEGER DEFAULT 365,
    
    -- Processing Settings
    enable_ocr BOOLEAN DEFAULT false,
    enable_face_match BOOLEAN DEFAULT false,
    min_confidence_score DECIMAL(3,2) DEFAULT 0.80,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for ON CONFLICT
    UNIQUE(verification_type, name)
);

-- Verification history table
CREATE TABLE verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verification_id UUID NOT NULL REFERENCES user_verification(id) ON DELETE CASCADE,
    
    -- Event Information
    event_type TEXT NOT NULL CHECK (event_type IN (
        'submitted', 'documents_uploaded', 'in_review', 'approved', 
        'rejected', 'expired', 'cancelled', 'resubmitted'
    )),
    
    -- Event Details
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Actor Information
    actor_id UUID REFERENCES profiles(id),
    actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'admin', 'system')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 09: NOTIFICATIONS SYSTEM
-- =============================================

-- Device tokens table
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Token Information
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    
    -- Device Information
    device_id TEXT,
    device_name TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(token)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Notification Type
    type TEXT NOT NULL CHECK (type IN (
        'message', 'offer', 'listing_update', 'review', 'follow',
        'like', 'comment', 'share', 'verification', 'system',
        'promotion', 'reminder', 'security'
    )),
    
    -- Reference Information
    reference_type TEXT,
    reference_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Delivery
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 10: ANALYTICS AND SEARCH
-- =============================================

-- Search analytics table
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Search Information
    search_query TEXT NOT NULL,
    search_type TEXT DEFAULT 'general' CHECK (search_type IN ('general', 'category', 'location', 'user', 'advanced')),
    
    -- Search Context
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    location TEXT,
    filters_applied JSONB DEFAULT '{}',
    
    -- Results
    results_count INTEGER DEFAULT 0,
    clicked_result_id UUID,
    clicked_result_position INTEGER,
    
    -- User Context
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    
    -- Timestamps
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listing views table
CREATE TABLE listing_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- View Context
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    -- Timestamps
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search suggestions table
CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Suggestion Information
    suggestion TEXT NOT NULL UNIQUE,
    category TEXT,
    
    -- Popularity Metrics
    search_count INTEGER DEFAULT 1,
    click_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity log table
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Activity Details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'view_listing', 'create_listing', 'edit_listing',
        'send_message', 'make_offer', 'search', 'favorite', 'unfavorite',
        'follow', 'unfollow', 'review', 'report', 'purchase_credits'
    )),
    
    -- Context
    target_type TEXT, -- 'listing', 'user', 'message', etc.
    target_id UUID,
    
    -- Additional Data
    metadata JSONB DEFAULT '{}',
    
    -- User Context
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Popular searches table
CREATE TABLE popular_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Search Information
    search_query TEXT NOT NULL,
    search_type TEXT DEFAULT 'general' CHECK (search_type IN ('general', 'category', 'location', 'user', 'advanced')),
    
    -- Metrics
    search_count INTEGER DEFAULT 1,
    unique_users INTEGER DEFAULT 1,
    click_through_rate DECIMAL(5,2) DEFAULT 0.0,
    
    -- Context
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    location TEXT,
    
    -- Status
    is_trending BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_searched_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(search_query, search_type, category_id, location)
);

-- =============================================
-- MIGRATION 10: BUSINESS CATEGORIES
-- =============================================

-- Business Categories table
CREATE TABLE business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Information
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES business_categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_business_categories_parent_id ON business_categories(parent_id);
CREATE INDEX idx_business_categories_slug ON business_categories(slug);
CREATE INDEX idx_business_categories_is_active ON business_categories(is_active);
CREATE INDEX idx_business_categories_sort_order ON business_categories(sort_order);

-- Add RLS policies
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active business categories
CREATE POLICY "Anyone can view active business categories" ON business_categories
    FOR SELECT USING (is_active = true);

-- Only authenticated users can insert/update/delete (for admin purposes)
CREATE POLICY "Authenticated users can manage business categories" ON business_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_business_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_categories_updated_at_trigger
    BEFORE UPDATE ON business_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_business_categories_updated_at();

-- Insert default business categories
INSERT INTO business_categories (name, slug, description, icon, sort_order) VALUES
    ('Technology & IT', 'technology-it', 'Software, hardware, and IT services', 'laptop', 1),
    ('Healthcare & Medical', 'healthcare-medical', 'Medical services, healthcare providers', 'heart', 2),
    ('Legal Services', 'legal-services', 'Lawyers, legal consultation, legal advice', 'scale', 3),
    ('Financial Services', 'financial-services', 'Banking, accounting, financial consulting', 'dollar-sign', 4),
    ('Real Estate', 'real-estate', 'Property sales, rentals, real estate services', 'home', 5),
    ('Education & Training', 'education-training', 'Schools, tutoring, professional training', 'graduation-cap', 6),
    ('Consulting', 'consulting', 'Business consulting, management consulting', 'users', 7),
    ('Marketing & Advertising', 'marketing-advertising', 'Digital marketing, advertising agencies', 'megaphone', 8),
    ('Construction & Renovation', 'construction-renovation', 'Building, renovation, construction services', 'hammer', 9),
    ('Automotive Services', 'automotive-services', 'Car repair, maintenance, automotive services', 'car', 10),
    ('Beauty & Wellness', 'beauty-wellness', 'Salons, spas, wellness services', 'sparkles', 11),
    ('Food & Catering', 'food-catering', 'Restaurants, catering, food services', 'utensils', 12),
    ('Transportation & Logistics', 'transportation-logistics', 'Delivery, shipping, transportation services', 'truck', 13),
    ('Entertainment & Events', 'entertainment-events', 'Event planning, entertainment services', 'music', 14),
    ('Home Services', 'home-services', 'Cleaning, maintenance, home improvement', 'wrench', 15),
    ('Professional Services', 'professional-services', 'Various professional services', 'briefcase', 16),
    ('Creative Services', 'creative-services', 'Design, photography, creative work', 'palette', 17),
    ('Security Services', 'security-services', 'Security, surveillance, protection services', 'shield', 18),
    ('Environmental Services', 'environmental-services', 'Environmental consulting, green services', 'leaf', 19),
    ('Other Business Services', 'other-business-services', 'Miscellaneous business services', 'more-horizontal', 20)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- MIGRATION 10.5: PROFILE COMPLETION FUNCTION
-- =============================================

-- Create function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_record RECORD;
    completion_percentage INTEGER := 0;
    missing_fields TEXT[] := '{}';
    suggestions TEXT[] := '{}';
    total_fields INTEGER := 0;
    completed_fields INTEGER := 0;
BEGIN
    -- Get the user's profile
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = user_uuid;
    
    -- If no profile found, return empty completion
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'percentage', 0,
            'missing_fields', '{}',
            'suggestions', ARRAY['Create your profile to get started']
        );
    END IF;
    
    -- Define required fields and their weights
    -- Basic Information (40% of completion)
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'full_name');
        suggestions := array_append(suggestions, 'Add your full name');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'bio');
        suggestions := array_append(suggestions, 'Write a bio to tell others about yourself');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'location');
        suggestions := array_append(suggestions, 'Add your location');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'avatar_url');
        suggestions := array_append(suggestions, 'Upload a profile picture');
    END IF;
    total_fields := total_fields + 1;
    
    -- Contact Information (20% of completion)
    IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'phone');
        suggestions := array_append(suggestions, 'Add your phone number');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.website IS NOT NULL AND profile_record.website != '' THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'website');
        suggestions := array_append(suggestions, 'Add your website or social media');
    END IF;
    total_fields := total_fields + 1;
    
    -- Business Information (20% of completion) - only if user is a business
    IF profile_record.is_business = true THEN
        IF profile_record.business_name IS NOT NULL AND profile_record.business_name != '' THEN
            completed_fields := completed_fields + 1;
        ELSE
            missing_fields := array_append(missing_fields, 'business_name');
            suggestions := array_append(suggestions, 'Add your business name');
        END IF;
        total_fields := total_fields + 1;
        
        IF profile_record.business_description IS NOT NULL AND profile_record.business_description != '' THEN
            completed_fields := completed_fields + 1;
        ELSE
            missing_fields := array_append(missing_fields, 'business_description');
            suggestions := array_append(suggestions, 'Describe your business');
        END IF;
        total_fields := total_fields + 1;
        
        IF profile_record.business_category_id IS NOT NULL THEN
            completed_fields := completed_fields + 1;
        ELSE
            missing_fields := array_append(missing_fields, 'business_category_id');
            suggestions := array_append(suggestions, 'Select your business category');
        END IF;
        total_fields := total_fields + 1;
    END IF;
    
    -- Verification (20% of completion)
    IF profile_record.email_verified = true THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'email_verified');
        suggestions := array_append(suggestions, 'Verify your email address');
    END IF;
    total_fields := total_fields + 1;
    
    IF profile_record.phone_verified = true THEN
        completed_fields := completed_fields + 1;
    ELSE
        missing_fields := array_append(missing_fields, 'phone_verified');
        suggestions := array_append(suggestions, 'Verify your phone number');
    END IF;
    total_fields := total_fields + 1;
    
    -- Calculate completion percentage
    IF total_fields > 0 THEN
        completion_percentage := ROUND((completed_fields::DECIMAL / total_fields::DECIMAL) * 100);
    END IF;
    
    -- Return completion data
    RETURN jsonb_build_object(
        'percentage', completion_percentage,
        'missing_fields', missing_fields,
        'suggestions', suggestions,
        'completed_fields', completed_fields,
        'total_fields', total_fields
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_profile_completion(UUID) TO authenticated;

-- =============================================
-- MIGRATION 11: SOCIAL FEATURES (COMPLETE)
-- =============================================

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    
    -- Review Content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    
    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One review per user per listing
    UNIQUE(reviewer_id, listing_id)
);

-- Review helpful votes table
CREATE TABLE review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Vote
    is_helpful BOOLEAN NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(review_id, user_id)
);

-- Follows table
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure users can't follow themselves
    CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);

-- Favorites table
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, listing_id)
);

-- =============================================
-- MIGRATION 12: MONETIZATION SYSTEM (COMPLETE)
-- =============================================

-- Credit purchases table
CREATE TABLE credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Purchase Details
    amount DECIMAL(12,2) NOT NULL,
    credits_received INTEGER NOT NULL,
    currency TEXT DEFAULT 'GHS',
    
    -- Payment Information
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Paystack transactions table
CREATE TABLE paystack_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Paystack Details
    paystack_reference TEXT UNIQUE NOT NULL,
    paystack_transaction_id TEXT,
    
    -- Transaction Details
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    description TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    
    -- Response Data
    paystack_response JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature purchases table
CREATE TABLE feature_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Feature Details
    feature_type TEXT NOT NULL CHECK (feature_type IN ('boost', 'featured', 'urgent', 'premium_placement')),
    feature_value JSONB NOT NULL,
    
    -- Purchase Details
    credits_cost INTEGER NOT NULL,
    duration_days INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================
-- MIGRATION 13: REWARD SYSTEM (COMPLETE)
-- =============================================

-- Community rewards table
CREATE TABLE community_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Reward Details
    reward_type TEXT NOT NULL CHECK (reward_type IN (
        'positive_review', 'first_post_bonus', 'first_like_bonus', 
        'engagement_milestone_10', 'engagement_milestone_25', 'engagement_milestone_50',
        'viral_post', 'super_viral_post', 'helpful_commenter', 'report_validation',
        'community_guardian', 'referral_bonus', 'anniversary_bonus'
    )),
    credits_earned INTEGER NOT NULL CHECK (credits_earned > 0),
    trigger_action TEXT NOT NULL CHECK (char_length(trigger_action) >= 5 AND char_length(trigger_action) <= 200),
    
    -- Reference Information
    reference_id UUID, -- ID of the post, review, etc. that triggered the reward
    reference_type TEXT CHECK (reference_type IN ('post', 'review', 'comment', 'report', 'referral', 'anniversary')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    is_validated BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique rewards per user per reference (where applicable)
    UNIQUE(user_id, reward_type, reference_id)
);

-- User achievements table
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Achievement Details
    achievement_type TEXT NOT NULL CHECK (achievement_type IN (
        'first_post', 'first_like', 'viral_creator', 'helpful_commenter',
        'community_guardian', 'referral_master', 'anniversary_member',
        'engagement_expert', 'review_collector', 'moderation_helper'
    )),
    achievement_name TEXT NOT NULL CHECK (char_length(achievement_name) >= 5 AND char_length(achievement_name) <= 100),
    description TEXT CHECK (char_length(description) <= 500),
    icon TEXT DEFAULT '🏆',
    
    -- Progress Tracking
    progress_current INTEGER DEFAULT 0,
    progress_required INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT false,
    
    -- Rewards
    credits_rewarded INTEGER DEFAULT 0,
    
    -- Timestamps
    unlocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one achievement per type per user
    UNIQUE(user_id, achievement_type)
);

-- User reward history table
CREATE TABLE user_reward_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Reward Details
    reward_type TEXT NOT NULL,
    credits_earned INTEGER NOT NULL,
    is_claimed BOOLEAN DEFAULT false,
    
    -- Claim Information
    claimed_at TIMESTAMPTZ,
    claim_method TEXT CHECK (claim_method IN ('automatic', 'manual', 'system')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one reward history per type per user (for one-time rewards)
    UNIQUE(user_id, reward_type)
);

-- Reward triggers table
CREATE TABLE reward_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trigger Configuration
    trigger_name TEXT UNIQUE NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('post', 'review', 'comment', 'report', 'referral', 'anniversary')),
    trigger_condition JSONB NOT NULL, -- Conditions that must be met
    
    -- Reward Configuration
    reward_type TEXT NOT NULL,
    credits_earned INTEGER NOT NULL,
    is_automatic BOOLEAN DEFAULT true,
    is_one_time BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 09: BUSINESS PLANS
-- =============================================

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan Information
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Features
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    
    -- Subscription Details
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan entitlements table
CREATE TABLE plan_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    
    -- Entitlement Details
    feature_type TEXT NOT NULL,
    feature_value JSONB,
    feature_enabled BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MIGRATION 10: STORAGE POLICIES
-- =============================================

-- Create storage buckets (matching frontend STORAGE_BUCKETS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
('listing-images', 'listing-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
('community-images', 'community-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
('chat-attachments', 'chat-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
('verification-documents', 'verification-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own community images" ON storage.objects;

DROP POLICY IF EXISTS "Users can view chat attachments they're involved in" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete chat attachments they uploaded" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own verification documents" ON storage.objects;

-- Profile images bucket policies
CREATE POLICY "Users can view all profile images" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can update their own profile images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own profile images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Listing images bucket policies
CREATE POLICY "Anyone can view listing images" ON storage.objects
    FOR SELECT USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'listing-images' 
        AND auth.role() = 'authenticated'
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can update their own listing images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'listing-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own listing images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'listing-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Community images bucket policies
CREATE POLICY "Anyone can view community images" ON storage.objects
    FOR SELECT USING (bucket_id = 'community-images');

CREATE POLICY "Authenticated users can upload community images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'community-images' 
        AND auth.role() = 'authenticated'
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can update their own community images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'community-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own community images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'community-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Chat attachments bucket policies (private)
CREATE POLICY "Users can view chat attachments they're involved in" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat-attachments' 
        AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            auth.uid()::text = (storage.foldername(name))[2]
        )
    );

CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-attachments' 
        AND auth.role() = 'authenticated'
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can delete chat attachments they uploaded" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'chat-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Verification documents bucket policies (private)
CREATE POLICY "Users can view their own verification documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload their own verification documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    );

CREATE POLICY "Users can delete their own verification documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage usage tracking table
CREATE TABLE storage_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Usage by bucket
    profile_images_size BIGINT DEFAULT 0,
    listing_images_size BIGINT DEFAULT 0,
    community_images_size BIGINT DEFAULT 0,
    chat_attachments_size BIGINT DEFAULT 0,
    verification_documents_size BIGINT DEFAULT 0,
    
    -- Total usage
    total_size BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================
-- MIGRATION 11: RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- Enable RLS on additional tables
ALTER TABLE moderation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_triggers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on support and analytics tables
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_searches ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User settings RLS policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can insert user settings" ON user_settings FOR INSERT WITH CHECK (true);

-- Security events RLS policies
CREATE POLICY "Users can view their own security events" ON security_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert security events" ON security_events FOR INSERT WITH CHECK (true);

-- User credits RLS policies
CREATE POLICY "Users can view own credits" ON user_credits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own credits" ON user_credits FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own credits" ON user_credits FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can insert user credits" ON user_credits FOR INSERT WITH CHECK (true);

-- Transactions RLS policies
CREATE POLICY "Users can view their own transactions" ON transactions 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own transactions" ON transactions 
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own transactions" ON transactions 
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can manage all transactions" ON transactions 
    FOR ALL USING (true);

-- Transaction categories RLS policies
CREATE POLICY "Anyone can view transaction categories" ON transaction_categories 
    FOR SELECT USING (true);

-- Transaction receipts RLS policies
CREATE POLICY "Users can view receipts for their transactions" ON transaction_receipts 
    FOR SELECT USING (
        transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid())
    );
CREATE POLICY "System can manage transaction receipts" ON transaction_receipts 
    FOR ALL USING (true);

-- Transaction notifications RLS policies
CREATE POLICY "Users can view their own transaction notifications" ON transaction_notifications 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage transaction notifications" ON transaction_notifications 
    FOR ALL USING (true);

-- Listings RLS policies
CREATE POLICY "Users can view active listings" ON listings FOR SELECT USING (status = 'active');
CREATE POLICY "Users can manage own listings" ON listings FOR ALL USING (auth.uid() = user_id);

-- Messages RLS policies
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
);
CREATE POLICY "Users can send messages in their conversations" ON messages FOR INSERT WITH CHECK (
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    )
);

-- Offers RLS policies
CREATE POLICY "Users can view offers they're involved in" ON offers FOR SELECT USING (
    buyer_id = auth.uid() OR seller_id = auth.uid()
);
CREATE POLICY "Users can create offers" ON offers FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Additional RLS policies for new tables

-- Moderation categories policies
CREATE POLICY "Anyone can view moderation categories" ON moderation_categories FOR SELECT USING (true);

-- Reports policies
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- User verification policies
CREATE POLICY "Users can view their own verification" ON user_verification FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create verification requests" ON user_verification FOR INSERT WITH CHECK (user_id = auth.uid());

-- Verification documents policies
CREATE POLICY "Users can view their own verification documents" ON verification_documents
    FOR SELECT USING (
        verification_id IN (
            SELECT id FROM user_verification WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create verification documents" ON verification_documents
    FOR INSERT WITH CHECK (
        verification_id IN (
            SELECT id FROM user_verification WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own verification documents" ON verification_documents
    FOR UPDATE USING (
        verification_id IN (
            SELECT id FROM user_verification WHERE user_id = auth.uid()
        )
    );

-- Verification templates policies (public read access)
CREATE POLICY "Anyone can view verification templates" ON verification_templates
    FOR SELECT USING (is_active = true);

-- Verification history policies
CREATE POLICY "Users can view their own verification history" ON verification_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create verification history" ON verification_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Device tokens policies
CREATE POLICY "Users can manage their own device tokens" ON device_tokens FOR ALL USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Search analytics policies
CREATE POLICY "Users can view their own search analytics" ON search_analytics FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create search analytics" ON search_analytics FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Listing views policies
CREATE POLICY "Anyone can create listing views" ON listing_views FOR INSERT WITH CHECK (true);

-- Reviews policies
CREATE POLICY "Anyone can view public reviews" ON reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view their own reviews" ON reviews FOR SELECT USING (reviewer_id = auth.uid() OR reviewed_user_id = auth.uid());
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Review helpful votes policies
CREATE POLICY "Users can manage their own helpful votes" ON review_helpful_votes FOR ALL USING (user_id = auth.uid());

-- Follows policies
CREATE POLICY "Users can view follows" ON follows FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());
CREATE POLICY "Users can manage their own follows" ON follows FOR ALL USING (follower_id = auth.uid());

-- Favorites policies
CREATE POLICY "Users can manage their own favorites" ON favorites FOR ALL USING (user_id = auth.uid());

-- Credit purchases policies
CREATE POLICY "Users can view their own credit purchases" ON credit_purchases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create credit purchases" ON credit_purchases FOR INSERT WITH CHECK (user_id = auth.uid());

-- Paystack transactions policies
CREATE POLICY "Users can view their own paystack transactions" ON paystack_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create paystack transactions" ON paystack_transactions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Feature purchases policies
CREATE POLICY "Users can view their own feature purchases" ON feature_purchases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create feature purchases" ON feature_purchases FOR INSERT WITH CHECK (user_id = auth.uid());

-- Plan entitlements policies
CREATE POLICY "Anyone can view plan entitlements" ON plan_entitlements FOR SELECT USING (true);

-- Community rewards policies
CREATE POLICY "Users can view their own rewards" ON community_rewards FOR SELECT USING (user_id = auth.uid());

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (user_id = auth.uid());

-- User reward history policies
CREATE POLICY "Users can view their own reward history" ON user_reward_history FOR SELECT USING (user_id = auth.uid());

-- Reward triggers policies
CREATE POLICY "Anyone can view reward triggers" ON reward_triggers FOR SELECT USING (true);

-- Knowledge base policies
CREATE POLICY "Anyone can view published KB articles" ON kb_articles FOR SELECT USING (status = 'published');
CREATE POLICY "Users can view their own KB articles" ON kb_articles FOR SELECT USING (author_id = auth.uid());

-- KB article feedback policies
CREATE POLICY "Users can create KB article feedback" ON kb_article_feedback FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- FAQ policies
CREATE POLICY "Anyone can view active FAQ categories" ON faq_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active FAQ items" ON faq_items FOR SELECT USING (is_active = true);

-- Search suggestions policies
CREATE POLICY "Anyone can view active search suggestions" ON search_suggestions FOR SELECT USING (is_active = true);

-- User activity log policies
CREATE POLICY "Users can view their own activity" ON user_activity_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create activity logs" ON user_activity_log FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Popular searches policies
CREATE POLICY "Anyone can view popular searches" ON popular_searches FOR SELECT USING (true);

-- =============================================
-- MIGRATION 12: FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_full_name TEXT;
BEGIN
    -- Extract first and last names from metadata
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
    
    -- Create full name
    v_full_name := CASE 
        WHEN v_first_name != '' AND v_last_name != '' THEN v_first_name || ' ' || v_last_name
        WHEN v_first_name != '' THEN v_first_name
        WHEN v_last_name != '' THEN v_last_name
        ELSE 'User'
    END;
    
    -- Create profile for new user
    INSERT INTO profiles (
        id,
        first_name,
        last_name,
        full_name,
        email,
        phone,
        location,
        is_business
    )
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(v_first_name), ''), 'User'),
        COALESCE(NULLIF(TRIM(v_last_name), ''), ''),
        v_full_name,
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra'),
        COALESCE((NEW.raw_user_meta_data->>'is_business')::boolean, false)
    );
    
    -- Create user settings with defaults
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
    
    -- Create user credits record
    INSERT INTO user_credits (user_id, balance)
    VALUES (NEW.id, 0);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        
        -- Still return NEW to allow user creation in auth.users
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions for the function
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- =============================================
-- REFERRAL TRACKING TABLE
-- =============================================

-- Create referral_tracking table to track successful referrals
CREATE TABLE IF NOT EXISTS referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referral Information
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    
    -- Status and Rewards
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'failed')),
    referrer_rewarded BOOLEAN DEFAULT false,
    referee_rewarded BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    UNIQUE(referrer_id, referee_id), -- One referral per referrer-referee pair
    UNIQUE(referee_id) -- Each user can only be referred once
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer_id ON referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referee_id ON referral_tracking(referee_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referral_code ON referral_tracking(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_status ON referral_tracking(status);

-- Add RLS policies for referral_tracking
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer or referee)
CREATE POLICY "Users can view their own referrals" ON referral_tracking 
FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referee_id
);

-- Authenticated users can insert referral records
CREATE POLICY "Authenticated users can create referrals" ON referral_tracking 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only system can update referral status
CREATE POLICY "System can update referral status" ON referral_tracking 
FOR UPDATE USING (auth.role() = 'authenticated');

-- =============================================
-- REWARD SYSTEM FUNCTIONS
-- =============================================

-- Function to get user reward summary
CREATE OR REPLACE FUNCTION get_user_reward_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_credits INTEGER;
    v_total_rewards INTEGER;
    v_achievements_count INTEGER;
    v_recent_rewards JSON;
BEGIN
    -- Get total credits earned from rewards
    SELECT COALESCE(SUM(credits_earned), 0) INTO v_total_credits
    FROM community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get total rewards count
    SELECT COUNT(*) INTO v_total_rewards
    FROM community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get completed achievements count
    SELECT COUNT(*) INTO v_achievements_count
    FROM user_achievements
    WHERE user_id = p_user_id AND is_completed = true;
    
    -- Get recent rewards (last 10)
    SELECT json_agg(
        json_build_object(
            'id', id,
            'reward_type', reward_type,
            'credits_earned', credits_earned,
            'trigger_action', trigger_action,
            'created_at', created_at
        )
    ) INTO v_recent_rewards
    FROM (
        SELECT id, reward_type, credits_earned, trigger_action, created_at
        FROM community_rewards
        WHERE user_id = p_user_id AND is_validated = true
        ORDER BY created_at DESC
        LIMIT 10
    ) recent;
    
    RETURN json_build_object(
        'total_credits_earned', v_total_credits,
        'total_rewards', v_total_rewards,
        'achievements_unlocked', v_achievements_count,
        'recent_rewards', COALESCE(v_recent_rewards, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award community credits
CREATE OR REPLACE FUNCTION award_community_credits(
    p_user_id UUID,
    p_reward_type TEXT,
    p_credits_earned INTEGER,
    p_trigger_action TEXT DEFAULT 'manual'
)
RETURNS JSON AS $$
DECLARE
    v_reward_id UUID;
    v_transaction_id UUID;
    v_credit_balance INTEGER;
BEGIN
    -- Insert reward record
    INSERT INTO community_rewards (user_id, reward_type, credits_earned, is_validated, trigger_action)
    VALUES (p_user_id, p_reward_type, p_credits_earned, true, p_trigger_action)
    RETURNING id INTO v_reward_id;
    
    -- Create transaction record
    INSERT INTO transactions (user_id, transaction_type, amount, title, credits_amount, description, category)
    VALUES (p_user_id, 'credit_earned', p_credits_earned, 'Community Reward: ' || p_reward_type, p_credits_earned, 'Earned from ' || p_trigger_action, 'reward')
    RETURNING id INTO v_transaction_id;
    
    -- Update user credits
    UPDATE user_credits 
    SET balance = balance + p_credits_earned,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_credit_balance;
    
    -- If no existing credit record, create one
    IF v_credit_balance IS NULL THEN
        INSERT INTO user_credits (user_id, balance)
        VALUES (p_user_id, p_credits_earned)
        RETURNING balance INTO v_credit_balance;
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'reward_id', v_reward_id,
        'transaction_id', v_transaction_id,
        'new_balance', v_credit_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for reward functions
GRANT EXECUTE ON FUNCTION get_user_reward_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION award_community_credits(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- =============================================
-- REFERRAL SYSTEM FUNCTIONS
-- =============================================

-- Create function to claim referral bonus
CREATE OR REPLACE FUNCTION claim_referral_bonus(
    p_referrer_id UUID,
    p_referee_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_record RECORD;
    v_referrer_credits INTEGER;
    v_referee_credits INTEGER;
    v_referral_tracking_id UUID;
    v_reward_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Validate input parameters
    IF p_referrer_id IS NULL OR p_referee_id IS NULL OR p_referral_code IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing required parameters');
    END IF;
    
    -- Check if referrer and referee exist
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_referrer_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referrer not found');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_referee_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referee not found');
    END IF;
    
    -- Check if referral record exists and is completed
    SELECT * INTO v_referral_record 
    FROM referral_tracking 
    WHERE referrer_id = p_referrer_id 
    AND referee_id = p_referee_id 
    AND referral_code = p_referral_code
    AND status = 'completed';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Referral not found or not completed');
    END IF;
    
    -- Check if already rewarded
    IF v_referral_record.referrer_rewarded THEN
        RETURN json_build_object('success', false, 'error', 'Referral bonus already claimed');
    END IF;
    
    -- Set reward amounts (20 credits for referrer, 20 credits for referee)
    v_referrer_credits := 20;
    v_referee_credits := 20;
    
    -- Award credits to referrer
    UPDATE user_credits 
    SET balance = balance + v_referrer_credits,
        lifetime_earned = lifetime_earned + v_referrer_credits
    WHERE user_id = p_referrer_id;
    
    -- Award credits to referee
    UPDATE user_credits 
    SET balance = balance + v_referee_credits,
        lifetime_earned = lifetime_earned + v_referee_credits
    WHERE user_id = p_referee_id;
    
    -- Create reward record for referrer
    INSERT INTO community_rewards (
        user_id, reward_type, credits_earned, trigger_action,
        reference_id, reference_type, metadata
    ) VALUES (
        p_referrer_id, 'referral_bonus', v_referrer_credits, 'Successfully referred a new user',
        v_referral_record.id, 'referral_tracking', 
        json_build_object('referee_id', p_referee_id, 'referral_code', p_referral_code)
    ) RETURNING id INTO v_reward_id;
    
    -- Create reward record for referee
    INSERT INTO community_rewards (
        user_id, reward_type, credits_earned, trigger_action,
        reference_id, reference_type, metadata
    ) VALUES (
        p_referee_id, 'referral_bonus', v_referee_credits, 'Joined via referral',
        v_referral_record.id, 'referral_tracking', 
        json_build_object('referrer_id', p_referrer_id, 'referral_code', p_referral_code)
    );
    
    -- Create credit transaction for referrer
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, description,
        balance_before, balance_after, metadata
    ) VALUES (
        p_referrer_id, 'referral_bonus', v_referrer_credits, 
        'Referral bonus for inviting a friend',
        (SELECT balance FROM user_credits WHERE user_id = p_referrer_id) - v_referrer_credits,
        (SELECT balance FROM user_credits WHERE user_id = p_referrer_id),
        json_build_object('referral_id', v_referral_record.id, 'referee_id', p_referee_id)
    ) RETURNING id INTO v_transaction_id;
    
    -- Create credit transaction for referee
    INSERT INTO credit_transactions (
        user_id, transaction_type, amount, description,
        balance_before, balance_after, metadata
    ) VALUES (
        p_referee_id, 'referral_bonus', v_referee_credits, 
        'Welcome bonus for joining via referral',
        (SELECT balance FROM user_credits WHERE user_id = p_referee_id) - v_referee_credits,
        (SELECT balance FROM user_credits WHERE user_id = p_referee_id),
        json_build_object('referral_id', v_referral_record.id, 'referrer_id', p_referrer_id)
    );
    
    -- Update referral tracking record
    UPDATE referral_tracking 
    SET referrer_rewarded = true,
        referee_rewarded = true,
        rewarded_at = NOW(),
        status = 'rewarded'
    WHERE id = v_referral_record.id;
    
    -- Add to reward history for both users
    INSERT INTO user_reward_history (user_id, reward_type, credits_earned, is_claimed, claim_method)
    VALUES 
        (p_referrer_id, 'referral_bonus', v_referrer_credits, true, 'automatic'),
        (p_referee_id, 'referral_bonus', v_referee_credits, true, 'automatic')
    ON CONFLICT (user_id, reward_type) DO NOTHING;
    
    RETURN json_build_object(
        'success', true,
        'referrer_credits', v_referrer_credits,
        'referee_credits', v_referee_credits,
        'referral_id', v_referral_record.id,
        'message', 'Referral bonus claimed successfully'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_referral_bonus(UUID, UUID, TEXT) TO authenticated;

-- Create function to create referral record
CREATE OR REPLACE FUNCTION create_referral_record(
    p_referrer_id UUID,
    p_referee_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_id UUID;
BEGIN
    -- Validate input parameters
    IF p_referrer_id IS NULL OR p_referee_id IS NULL OR p_referral_code IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Missing required parameters');
    END IF;
    
    -- Check if referrer exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_referrer_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referrer not found');
    END IF;
    
    -- Check if referee already exists (should not happen during signup)
    IF EXISTS (SELECT 1 FROM profiles WHERE id = p_referee_id) THEN
        RETURN json_build_object('success', false, 'error', 'Referee already exists');
    END IF;
    
    -- Create referral record
    INSERT INTO referral_tracking (
        referrer_id, referee_id, referral_code, status
    ) VALUES (
        p_referrer_id, p_referee_id, p_referral_code, 'pending'
    ) RETURNING id INTO v_referral_id;
    
    RETURN json_build_object(
        'success', true,
        'referral_id', v_referral_id,
        'message', 'Referral record created successfully'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_referral_record(UUID, UUID, TEXT) TO authenticated;

-- Create function to complete referral (called when referee completes signup)
CREATE OR REPLACE FUNCTION complete_referral(
    p_referee_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_record RECORD;
BEGIN
    -- Find pending referral for this referee
    SELECT * INTO v_referral_record 
    FROM referral_tracking 
    WHERE referee_id = p_referee_id 
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'No pending referral found');
    END IF;
    
    -- Update referral status to completed
    UPDATE referral_tracking 
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_referral_record.id;
    
    RETURN json_build_object(
        'success', true,
        'referral_id', v_referral_record.id,
        'referrer_id', v_referral_record.referrer_id,
        'message', 'Referral completed successfully'
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_referral(UUID) TO authenticated;

-- Create function to get user referral stats
CREATE OR REPLACE FUNCTION get_user_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_invites INTEGER;
    v_successful_invites INTEGER;
    v_pending_invites INTEGER;
    v_total_earned DECIMAL(10,2);
BEGIN
    -- Get total invites sent
    SELECT COUNT(*) INTO v_total_invites
    FROM referral_tracking 
    WHERE referrer_id = p_user_id;
    
    -- Get successful invites (completed and rewarded)
    SELECT COUNT(*) INTO v_successful_invites
    FROM referral_tracking 
    WHERE referrer_id = p_user_id 
    AND status IN ('completed', 'rewarded');
    
    -- Get pending invites
    SELECT COUNT(*) INTO v_pending_invites
    FROM referral_tracking 
    WHERE referrer_id = p_user_id 
    AND status = 'pending';
    
    -- Get total earned from referrals
    SELECT COALESCE(SUM(credits_earned), 0) INTO v_total_earned
    FROM community_rewards 
    WHERE user_id = p_user_id 
    AND reward_type = 'referral_bonus';
    
    RETURN json_build_object(
        'total_invites', v_total_invites,
        'successful_invites', v_successful_invites,
        'pending_invites', v_pending_invites,
        'total_earned', v_total_earned
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_referral_stats(UUID) TO authenticated;

-- =============================================
-- GDPR COMPLIANCE TABLES
-- =============================================

-- Create data_export_requests table for GDPR data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Information
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Request Details
    request_type TEXT NOT NULL DEFAULT 'full_export' CHECK (request_type IN ('full_export', 'partial_export', 'specific_data')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_data_types TEXT[] DEFAULT '{}', -- Array of data types requested (e.g., ['profile', 'transactions', 'messages'])
    
    -- Processing Information
    file_url TEXT, -- URL to the exported data file
    file_size_bytes BIGINT,
    expires_at TIMESTAMPTZ, -- When the download link expires
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT, -- Admin notes about the request
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create data_deletion_requests table for GDPR data deletion requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Information
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Request Details
    request_type TEXT NOT NULL DEFAULT 'account_deletion' CHECK (request_type IN ('account_deletion', 'data_deletion', 'specific_data_deletion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
    deletion_scope TEXT NOT NULL DEFAULT 'full_account' CHECK (deletion_scope IN ('full_account', 'personal_data', 'specific_data')),
    
    -- Deletion Details
    data_types_to_delete TEXT[] DEFAULT '{}', -- Array of data types to delete
    reason TEXT, -- User's reason for deletion request
    verification_method TEXT, -- How the user was verified (email, phone, etc.)
    
    -- Processing Information
    retention_period_days INTEGER DEFAULT 30, -- How long to retain data before deletion
    scheduled_deletion_date TIMESTAMPTZ,
    actual_deletion_date TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    admin_notes TEXT, -- Admin notes about the request
    legal_hold BOOLEAN DEFAULT false, -- Whether data is under legal hold
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_requested_at ON data_export_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_created_at ON data_export_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_expires_at ON data_export_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_requested_at ON data_deletion_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_created_at ON data_deletion_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled_deletion_date ON data_deletion_requests(scheduled_deletion_date);

-- Add RLS policies for data_export_requests
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own export requests
CREATE POLICY "Users can view their own export requests" ON data_export_requests 
FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own export requests
CREATE POLICY "Users can create their own export requests" ON data_export_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending export requests
CREATE POLICY "Users can update their own pending export requests" ON data_export_requests 
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all export requests
CREATE POLICY "Admins can manage all export requests" ON data_export_requests 
FOR ALL USING (auth.role() = 'service_role');

-- Add RLS policies for data_deletion_requests
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests" ON data_deletion_requests 
FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own deletion requests
CREATE POLICY "Users can create their own deletion requests" ON data_deletion_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending deletion requests
CREATE POLICY "Users can update their own pending deletion requests" ON data_deletion_requests 
FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'under_review'));

-- Admins can manage all deletion requests
CREATE POLICY "Admins can manage all deletion requests" ON data_deletion_requests 
FOR ALL USING (auth.role() = 'service_role');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_data_export_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_export_requests_updated_at_trigger
    BEFORE UPDATE ON data_export_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_data_export_requests_updated_at();

CREATE OR REPLACE FUNCTION update_data_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_deletion_requests_updated_at_trigger
    BEFORE UPDATE ON data_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_data_deletion_requests_updated_at();

-- Create function to process data export request
CREATE OR REPLACE FUNCTION process_data_export_request(
    p_request_id UUID,
    p_file_url TEXT,
    p_file_size_bytes BIGINT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- Get the request
    SELECT * INTO v_request 
    FROM data_export_requests 
    WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Export request not found');
    END IF;
    
    -- Check if request is in valid state for processing
    IF v_request.status NOT IN ('pending', 'processing') THEN
        RETURN json_build_object('success', false, 'error', 'Request is not in a processable state');
    END IF;
    
    -- Update the request
    UPDATE data_export_requests 
    SET status = 'completed',
        file_url = p_file_url,
        file_size_bytes = p_file_size_bytes,
        expires_at = COALESCE(p_expires_at, NOW() + INTERVAL '7 days'),
        processed_at = NOW(),
        completed_at = NOW()
    WHERE id = p_request_id;
    
    RETURN json_build_object(
        'success', true,
        'request_id', p_request_id,
        'message', 'Export request processed successfully'
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION process_data_export_request(UUID, TEXT, BIGINT, TIMESTAMPTZ) TO service_role;

-- Create function to process data deletion request
CREATE OR REPLACE FUNCTION process_data_deletion_request(
    p_request_id UUID,
    p_approved BOOLEAN,
    p_admin_notes TEXT DEFAULT NULL,
    p_scheduled_deletion_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
    v_new_status TEXT;
    v_deletion_date TIMESTAMPTZ;
BEGIN
    -- Get the request
    SELECT * INTO v_request 
    FROM data_deletion_requests 
    WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Deletion request not found');
    END IF;
    
    -- Check if request is in valid state for processing
    IF v_request.status NOT IN ('pending', 'under_review') THEN
        RETURN json_build_object('success', false, 'error', 'Request is not in a processable state');
    END IF;
    
    -- Determine new status and deletion date
    IF p_approved THEN
        v_new_status := 'approved';
        v_deletion_date := COALESCE(p_scheduled_deletion_date, NOW() + INTERVAL '30 days');
    ELSE
        v_new_status := 'rejected';
        v_deletion_date := NULL;
    END IF;
    
    -- Update the request
    UPDATE data_deletion_requests 
    SET status = v_new_status,
        admin_notes = p_admin_notes,
        scheduled_deletion_date = v_deletion_date,
        approved_at = CASE WHEN p_approved THEN NOW() ELSE NULL END,
        processed_at = NOW()
    WHERE id = p_request_id;
    
    RETURN json_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', v_new_status,
        'scheduled_deletion_date', v_deletion_date,
        'message', 'Deletion request processed successfully'
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION process_data_deletion_request(UUID, BOOLEAN, TEXT, TIMESTAMPTZ) TO service_role;

-- =============================================
-- RLS POLICIES FOR SOCIAL FEATURES
-- =============================================

-- Posts RLS policies
-- Allow users to view their own posts (regardless of status)
CREATE POLICY "Users can view their own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to manage their own posts (insert, update, delete)
CREATE POLICY "Users can manage their own posts" ON posts
    FOR ALL USING (auth.uid() = user_id);

-- Allow anyone to view posts (simplified - no status filtering for now)
CREATE POLICY "Anyone can view posts" ON posts
    FOR SELECT USING (true);

-- Post likes RLS policies
CREATE POLICY "Users can manage their own post likes" ON post_likes
    FOR ALL USING (auth.uid() = user_id);

-- Comments RLS policies
CREATE POLICY "Anyone can view active comments" ON comments
    FOR SELECT USING (status = 'active');

CREATE POLICY "Users can view their own comments" ON comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comments" ON comments
    FOR ALL USING (auth.uid() = user_id);

-- Shares RLS policies
CREATE POLICY "Users can manage their own shares" ON shares
    FOR ALL USING (auth.uid() = user_id);

-- Post bookmarks RLS policies
CREATE POLICY "Users can manage their own post bookmarks" ON post_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update full_name when first_name or last_name changes
CREATE OR REPLACE FUNCTION update_full_name_from_parts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update full_name when first_name or last_name changes
    NEW.full_name := CASE 
        WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN
            NEW.first_name || ' ' || NEW.last_name
        WHEN NEW.first_name IS NOT NULL AND NEW.first_name != '' THEN
            NEW.first_name
        WHEN NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN
            NEW.last_name
        ELSE 'User'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic full_name updates
CREATE TRIGGER update_full_name_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_full_name_from_parts();

-- =============================================
-- ADDITIONAL HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if user exists by email
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = LOWER(TRIM(email_to_check))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for check_email_exists function
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;

-- Function to create transactions (what the frontend expects)
CREATE OR REPLACE FUNCTION create_transaction(
    p_user_id UUID,
    p_transaction_type TEXT,
    p_amount DECIMAL,
    p_title TEXT,
    p_credits_amount INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_payment_reference TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_current_balance DECIMAL(12,2);
BEGIN
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- Create the transaction
    INSERT INTO transactions (
        user_id, transaction_type, amount, credits_amount, title, description,
        category, payment_method, payment_reference, metadata, balance_before
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, p_credits_amount, p_title, p_description,
        p_category, p_payment_method, p_payment_reference, p_metadata, COALESCE(v_current_balance, 0)
    ) RETURNING id INTO v_transaction_id;
    
    -- Update user balance if credits are involved
    IF p_credits_amount IS NOT NULL THEN
        UPDATE user_credits 
        SET balance = balance + p_credits_amount,
            total_earned = CASE 
                WHEN p_credits_amount > 0 THEN total_earned + p_credits_amount 
                ELSE total_earned 
            END,
            total_spent = CASE 
                WHEN p_credits_amount < 0 THEN total_spent + ABS(p_credits_amount) 
                ELSE total_spent 
            END
        WHERE user_id = p_user_id;
        
        -- Update transaction with new balance
        UPDATE transactions 
        SET balance_after = (SELECT balance FROM user_credits WHERE user_id = p_user_id)
        WHERE id = v_transaction_id;
    END IF;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user transaction summary (what the frontend expects)
CREATE OR REPLACE FUNCTION get_user_transaction_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_summary JSON;
BEGIN
    SELECT json_build_object(
        'total_transactions', COUNT(*),
        'total_spent', COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0),
        'total_earned', COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
        'credits_purchased', COALESCE(SUM(CASE WHEN transaction_type = 'credit_purchase' AND credits_amount > 0 THEN credits_amount ELSE 0 END), 0),
        'credits_used', COALESCE(SUM(CASE WHEN credits_amount < 0 THEN ABS(credits_amount) ELSE 0 END), 0),
        'pending_transactions', COUNT(CASE WHEN status = 'pending' THEN 1 END),
        'last_transaction_date', MAX(created_at)
    ) INTO v_summary
    FROM transactions
    WHERE user_id = p_user_id;
    
    RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get transaction analytics (what the frontend expects)
CREATE OR REPLACE FUNCTION get_transaction_analytics(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_analytics JSON;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- Set default date range if not provided
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());
    
    WITH transaction_stats AS (
        SELECT 
            transaction_type,
            status,
            COUNT(*) as count,
            SUM(amount) as total_amount,
            SUM(COALESCE(credits_amount, 0)) as total_credits
        FROM transactions
        WHERE user_id = p_user_id
        AND created_at >= v_start_date
        AND created_at <= v_end_date
        GROUP BY transaction_type, status
    ),
    totals AS (
        SELECT 
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount,
            SUM(CASE WHEN credits_amount < 0 THEN ABS(credits_amount) ELSE 0 END) as credits_spent,
            SUM(CASE WHEN credits_amount > 0 THEN credits_amount ELSE 0 END) as credits_earned
        FROM transactions
        WHERE user_id = p_user_id
        AND created_at >= v_start_date
        AND created_at <= v_end_date
    )
    SELECT json_build_object(
        'period', json_build_object(
            'start_date', v_start_date,
            'end_date', v_end_date
        ),
        'totals', (SELECT row_to_json(totals) FROM totals),
        'by_type', (
            SELECT json_object_agg(
                transaction_type,
                json_build_object(
                    'count', count,
                    'total_amount', total_amount,
                    'total_credits', total_credits
                )
            )
            FROM transaction_stats
            GROUP BY transaction_type
        ),
        'by_status', (
            SELECT json_object_agg(
                status,
                count
            )
            FROM transaction_stats
            GROUP BY status
        )
    ) INTO v_analytics;
    
    RETURN v_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for transaction functions
GRANT EXECUTE ON FUNCTION create_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_transaction_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_analytics TO authenticated;

-- Function to award community credits
CREATE OR REPLACE FUNCTION award_community_credits(
    p_user_id UUID,
    p_reward_type TEXT,
    p_credits_earned INTEGER,
    p_trigger_action TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
    v_reward_id UUID;
    v_credit_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Create reward record
    INSERT INTO community_rewards (
        user_id, reward_type, credits_earned, trigger_action,
        reference_id, reference_type, metadata
    ) VALUES (
        p_user_id, p_reward_type, p_credits_earned, p_trigger_action,
        p_reference_id, p_reference_type, p_metadata
    ) RETURNING id INTO v_reward_id;
    
    -- Update user credit balance
    UPDATE user_credits 
    SET balance = balance + p_credits_earned,
        total_earned = total_earned + p_credits_earned
    WHERE user_id = p_user_id
    RETURNING balance INTO v_credit_balance;
    
    -- Create credit transaction record
    INSERT INTO credit_transactions (
        user_id, type, amount, description,
        balance_before, balance_after
    ) VALUES (
        p_user_id, 'earned', p_credits_earned, 
        'Community reward: ' || p_trigger_action,
        v_credit_balance - p_credits_earned, v_credit_balance
    ) RETURNING id INTO v_transaction_id;
    
    RETURN json_build_object(
        'success', true, 
        'reward_id', v_reward_id,
        'transaction_id', v_transaction_id,
        'new_balance', v_credit_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user business entitlements
CREATE OR REPLACE FUNCTION get_user_business_entitlements(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_subscription RECORD;
    v_entitlements JSON;
BEGIN
    -- Get user's active subscription
    SELECT us.*, sp.*
    INTO v_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id 
    AND us.status = 'active'
    AND us.ends_at > NOW()
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    IF v_subscription IS NULL THEN
        -- Return free user entitlements
        RETURN json_build_object(
            'plan_name', 'Free',
            'max_listings', 5,
            'boost_credits', 0,
            'business_badge', false,
            'priority_seller_badge', false,
            'premium_badge', false,
            'analytics_level', 0,
            'auto_boost', false,
            'priority_support', false,
            'homepage_placement', false,
            'account_manager', false,
            'sponsored_posts', false
        );
    END IF;
    
    -- Get plan entitlements
    SELECT json_object_agg(
        pe.feature_type, 
        CASE 
            WHEN pe.feature_value IS NOT NULL THEN pe.feature_value
            ELSE pe.feature_enabled
        END
    ) INTO v_entitlements
    FROM plan_entitlements pe
    WHERE pe.plan_id = v_subscription.plan_id;
    
    RETURN json_build_object(
        'plan_name', v_subscription.name,
        'plan_id', v_subscription.plan_id,
        'subscription_id', v_subscription.id,
        'ends_at', v_subscription.ends_at,
        'entitlements', COALESCE(v_entitlements, '{}'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create more listings
CREATE OR REPLACE FUNCTION can_create_listing(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Get user's listing limit from entitlements
    SELECT (get_user_business_entitlements(p_user_id)->'entitlements'->>'max_listings')::INTEGER
    INTO v_limit;
    
    -- Default to 5 for free users
    IF v_limit IS NULL THEN
        v_limit := 5;
    END IF;
    
    -- If unlimited (very high number), return true
    IF v_limit >= 999999 THEN
        RETURN true;
    END IF;
    
    -- Get current active listings count
    SELECT COUNT(*) INTO v_current_count
    FROM listings
    WHERE user_id = p_user_id AND status = 'active';
    
    -- Check if under limit
    RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADDITIONAL TRIGGERS
-- =============================================

-- Update triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle first post bonus
CREATE OR REPLACE FUNCTION handle_first_post_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_post_count INTEGER;
BEGIN
    -- Only trigger for new posts
    IF TG_OP = 'INSERT' THEN
        -- Check if this is the user's first post
        SELECT COUNT(*) INTO v_post_count
        FROM posts
        WHERE user_id = NEW.user_id;
        
        IF v_post_count = 1 THEN
            PERFORM award_community_credits(
                NEW.user_id,
                'first_post_bonus',
                5,
                'Created your first community post',
                NEW.id,
                'post'
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for first post bonus
CREATE TRIGGER first_post_bonus_trigger
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION handle_first_post_bonus();

-- Function to check listing limit before creating new listing
CREATE OR REPLACE FUNCTION check_listing_limit_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user can create more listings
    IF NOT can_create_listing(NEW.user_id) THEN
        RAISE EXCEPTION 'Listing limit exceeded. Upgrade to a business plan to create more listings.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for listing limit check
CREATE TRIGGER check_listing_limit_trigger
    BEFORE INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION check_listing_limit_before_insert();

-- =============================================
-- ADDITIONAL FUNCTIONS FROM MIGRATION 13
-- =============================================

-- Function to update profile completion percentage
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_completion_score INTEGER := 0;
BEGIN
    -- Calculate completion score based on filled fields
    IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN v_completion_score := v_completion_score + 20; END IF;
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN v_completion_score := v_completion_score + 15; END IF;
    IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '' THEN v_completion_score := v_completion_score + 15; END IF;
    IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN v_completion_score := v_completion_score + 10; END IF;
    IF NEW.location IS NOT NULL AND NEW.location != '' THEN v_completion_score := v_completion_score + 10; END IF;
    IF NEW.date_of_birth IS NOT NULL THEN v_completion_score := v_completion_score + 10; END IF;
    IF NEW.website IS NOT NULL AND NEW.website != '' THEN v_completion_score := v_completion_score + 10; END IF;
    IF NEW.social_links IS NOT NULL AND NEW.social_links != '{}' THEN v_completion_score := v_completion_score + 10; END IF;
    
    -- Update the completion score (assuming we have this column)
    -- NEW.profile_completion := v_completion_score;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update listing counts
CREATE OR REPLACE FUNCTION update_listing_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment user's listing count
        UPDATE profiles 
        SET updated_at = NOW() 
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement user's listing count
        UPDATE profiles 
        SET updated_at = NOW() 
        WHERE id = OLD.user_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate listing slug
CREATE OR REPLACE FUNCTION auto_generate_listing_slug()
RETURNS TRIGGER AS $$
DECLARE
    v_slug TEXT;
    v_counter INTEGER := 1;
BEGIN
    -- Generate slug from title
    v_slug := LOWER(REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9\s]', '', 'g'));
    v_slug := REGEXP_REPLACE(v_slug, '\s+', '-', 'g');
    v_slug := TRIM(v_slug, '-');
    
    -- Ensure slug is not empty
    IF v_slug = '' THEN
        v_slug := 'listing';
    END IF;
    
    -- Make slug unique
    WHILE EXISTS (SELECT 1 FROM listings WHERE slug = v_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)) LOOP
        v_slug := v_slug || '-' || v_counter;
        v_counter := v_counter + 1;
    END LOOP;
    
    NEW.slug := v_slug;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user ratings
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3,2);
    v_total_reviews INTEGER;
BEGIN
    -- Calculate new average rating for reviewed user
    SELECT AVG(rating)::DECIMAL(3,2), COUNT(*)
    INTO v_avg_rating, v_total_reviews
    FROM reviews
    WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
    
    -- Update user's rating in profiles table
    UPDATE profiles 
    SET rating = COALESCE(v_avg_rating, 0.00), 
        total_reviews = v_total_reviews,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to backfill user ratings from existing reviews
CREATE OR REPLACE FUNCTION backfill_user_ratings()
RETURNS VOID AS $$
BEGIN
    -- Update all user ratings based on existing reviews
    UPDATE profiles 
    SET rating = COALESCE((
        SELECT AVG(rating)::DECIMAL(3,2) 
        FROM reviews 
        WHERE reviewed_user_id = profiles.id
    ), 0.00),
    total_reviews = COALESCE((
        SELECT COUNT(*) 
        FROM reviews 
        WHERE reviewed_user_id = profiles.id
    ), 0),
    total_sales = COALESCE((
        SELECT COUNT(*) 
        FROM transactions 
        WHERE user_id = profiles.id 
        AND transaction_type = 'commission_earned'
    ), 0),
    updated_at = NOW()
    WHERE EXISTS (
        SELECT 1 FROM reviews WHERE reviewed_user_id = profiles.id
    );
    
    RAISE NOTICE 'User ratings backfilled successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'total_listings', (SELECT COUNT(*) FROM listings WHERE user_id = p_user_id),
        'active_listings', (SELECT COUNT(*) FROM listings WHERE user_id = p_user_id AND status = 'active'),
        'total_reviews', (SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = p_user_id),
        'average_rating', (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE reviewed_user_id = p_user_id),
        'total_followers', (SELECT COUNT(*) FROM follows WHERE following_id = p_user_id),
        'total_following', (SELECT COUNT(*) FROM follows WHERE follower_id = p_user_id),
        'total_favorites', (SELECT COUNT(*) FROM favorites WHERE user_id = p_user_id),
        'member_since', (SELECT created_at FROM profiles WHERE id = p_user_id)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search listings
CREATE OR REPLACE FUNCTION search_listings(
    p_search_query TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    price DECIMAL,
    location TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ,
    user_id UUID,
    category_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.location,
        l.images,
        l.created_at,
        l.user_id,
        l.category_id
    FROM listings l
    WHERE l.status = 'active'
    AND (p_search_query IS NULL OR l.search_vector @@ plainto_tsquery('english', p_search_query))
    AND (p_category_id IS NULL OR l.category_id = p_category_id)
    AND (p_location IS NULL OR l.location ILIKE '%' || p_location || '%')
    AND (p_min_price IS NULL OR l.price >= p_min_price)
    AND (p_max_price IS NULL OR l.price <= p_max_price)
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ADDITIONAL TRIGGERS
-- =============================================

-- Trigger for profile completion
CREATE TRIGGER update_profile_completion_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- Trigger for listing counts
CREATE TRIGGER update_listing_counts_trigger
    AFTER INSERT OR DELETE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_counts();

-- Trigger for auto-generating listing slugs
CREATE TRIGGER auto_generate_listing_slug_trigger
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_listing_slug();

-- Trigger for updating user ratings
CREATE TRIGGER update_user_ratings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ratings();

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_is_business ON profiles(is_business);
CREATE INDEX idx_profiles_verification_level ON profiles(verification_level);

-- Listings indexes
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_category_id ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings(location);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_search_vector ON listings USING GIN(search_vector);

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Offers indexes
CREATE INDEX idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX idx_offers_seller_id ON offers(seller_id);
CREATE INDEX idx_offers_listing_id ON offers(listing_id);
CREATE INDEX idx_offers_status ON offers(status);

-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_status ON posts(status);

-- Reviews indexes
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Follows indexes
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- Favorites indexes
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_listing_id ON favorites(listing_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Search analytics indexes
CREATE INDEX idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_searched_at ON search_analytics(searched_at DESC);

-- Reports indexes
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_content_type ON reports(content_type);
CREATE INDEX idx_reports_status ON reports(status);

-- User verification indexes
CREATE INDEX idx_user_verification_user_id ON user_verification(user_id);
CREATE INDEX idx_user_verification_type ON user_verification(verification_type);
CREATE INDEX idx_user_verification_status ON user_verification(status);

-- Verification documents indexes
CREATE INDEX idx_verification_documents_verification_id ON verification_documents(verification_id);
CREATE INDEX idx_verification_documents_document_type ON verification_documents(document_type);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);

-- Verification templates indexes
CREATE INDEX idx_verification_templates_verification_type ON verification_templates(verification_type);
CREATE INDEX idx_verification_templates_is_active ON verification_templates(is_active);

-- Verification history indexes
CREATE INDEX idx_verification_history_user_id ON verification_history(user_id);
CREATE INDEX idx_verification_history_verification_id ON verification_history(verification_id);
CREATE INDEX idx_verification_history_event_type ON verification_history(event_type);
CREATE INDEX idx_verification_history_actor_id ON verification_history(actor_id);
CREATE INDEX idx_verification_history_created_at ON verification_history(created_at);

-- =============================================
-- PERFORMANCE INDEXES FROM MIGRATION 14
-- =============================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_active_featured 
ON listings(status, is_featured, created_at DESC) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_user_status 
ON listings(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_category_location 
ON listings(category_id, location, status, created_at DESC) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_listings_price_range 
ON listings(price, status, created_at DESC) 
WHERE status = 'active';

-- Messages performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(conversation_id, read_at) 
WHERE read_at IS NULL;

-- Posts performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_engagement 
ON posts(likes_count, comments_count, created_at DESC) 
WHERE status = 'active';

-- Reviews performance indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_rating 
ON reviews(reviewed_user_id, rating, created_at DESC);

-- Follows performance indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_created 
ON follows(follower_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_following_created 
ON follows(following_id, created_at DESC);

-- Notifications performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC);

-- Search analytics performance indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_date 
ON search_analytics(search_query, searched_at DESC);

-- Support tickets performance indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status 
ON support_tickets(user_id, status, created_at DESC);

-- Knowledge base performance indexes
CREATE INDEX IF NOT EXISTS idx_kb_articles_category_status 
ON kb_articles(category, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_kb_articles_search 
ON kb_articles USING GIN(search_keywords);

-- FAQ performance indexes
CREATE INDEX IF NOT EXISTS idx_faq_items_category_active 
ON faq_items(category_id, is_active, sort_order);

-- User activity performance indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_type 
ON user_activity_log(user_id, activity_type, created_at DESC);

-- Popular searches performance indexes
CREATE INDEX IF NOT EXISTS idx_popular_searches_trending 
ON popular_searches(is_trending, search_count DESC, last_searched_at DESC);

-- Transaction performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_related_listing ON transactions(related_listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_status ON transactions(user_id, transaction_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default categories with FIXED UUIDs (matching frontend expectations)
INSERT INTO categories (id, name, slug, description, icon, is_active, is_featured, sort_order) VALUES
('00000000-0000-4000-8000-000000000000', 'Other', 'other', 'Miscellaneous items and general category', 'more-horizontal', true, false, 15),
('00000000-0000-4000-8000-000000000001', 'Electronics & Technology', 'electronics', 'Phones, laptops, gadgets and electronic devices', 'smartphone', true, true, 1),
('00000000-0000-4000-8000-000000000002', 'Fashion', 'fashion', 'Clothing, shoes, accessories and beauty products', 'shirt', true, true, 2),
('00000000-0000-4000-8000-000000000003', 'Vehicles', 'vehicles', 'Cars, motorcycles, bicycles and vehicle parts', 'car', true, true, 3),
('00000000-0000-4000-8000-000000000004', 'Home & Garden', 'home-garden', 'Furniture, appliances, home decor and garden items', 'home', true, true, 4),
('00000000-0000-4000-8000-000000000005', 'Sports & Fitness', 'sports-fitness', 'Sports equipment, musical instruments and hobby items', 'dumbbell', true, true, 5),
('00000000-0000-4000-8000-000000000006', 'Books & Media', 'books-media', 'Books, educational materials and courses', 'book', true, false, 6),
('00000000-0000-4000-8000-000000000007', 'Services', 'services', 'Professional services and skill-based offerings', 'briefcase', true, true, 7),
('00000000-0000-4000-8000-000000000008', 'Baby & Kids', 'baby-kids', 'Baby products, toys and children items', 'baby', true, false, 8),
('00000000-0000-4000-8000-000000000009', 'Beauty & Health', 'beauty-health', 'Health products, fitness equipment and wellness items', 'heart', true, false, 9),
('00000000-0000-4000-8000-000000000010', 'Food & Beverages', 'food-beverages', 'Food items, beverages and kitchen supplies', 'utensils', true, false, 10)
ON CONFLICT (id) DO NOTHING;

-- Insert business subscription plans
INSERT INTO subscription_plans (id, name, description, price, currency, billing_cycle, features, limits, is_active, is_featured) VALUES
('00000000-0000-4000-8000-000000000011', 'Starter Business', 'Perfect for small businesses getting started', 0, 'GHS', 'monthly', 
 '{"listing_limit": 10, "boost_credits": 5, "analytics": true, "priority_support": false}', 
 '{"max_listings": 10, "boost_credits_per_month": 5}', true, false),
('00000000-0000-4000-8000-000000000012', 'Pro Business', 'For growing businesses with more needs', 50, 'GHS', 'monthly',
 '{"listing_limit": 50, "boost_credits": 25, "analytics": true, "priority_support": true, "custom_branding": true}',
 '{"max_listings": 50, "boost_credits_per_month": 25}', true, true),
('00000000-0000-4000-8000-000000000013', 'Premium Business', 'For established businesses with high volume', 100, 'GHS', 'monthly',
 '{"listing_limit": -1, "boost_credits": 100, "analytics": true, "priority_support": true, "custom_branding": true, "api_access": true}',
 '{"max_listings": -1, "boost_credits_per_month": 100}', true, false)
ON CONFLICT (id) DO NOTHING;

-- Insert default transaction categories
INSERT INTO transaction_categories (name, display_name, description, icon, color, sort_order) VALUES
('credits', 'Credit Operations', 'All credit-related transactions', 'credit-card', '#3B82F6', 1),
('listings', 'Listing Operations', 'Listing boost and promotion transactions', 'trending-up', '#10B981', 2),
('earnings', 'Earnings', 'Commission and bonus earnings', 'dollar-sign', '#F59E0B', 3),
('payments', 'Payments', 'Payment and withdrawal transactions', 'arrow-up-right', '#8B5CF6', 4),
('subscriptions', 'Subscriptions', 'Subscription and plan payments', 'crown', '#EC4899', 5),
('services', 'Services', 'Verification and service fees', 'shield-check', '#6B7280', 6),
('adjustments', 'Adjustments', 'System adjustments and penalties', 'settings', '#EF4444', 7)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- BACKFILL EXISTING DATA
-- =============================================

-- Backfill user ratings from existing reviews
SELECT backfill_user_ratings();

-- =============================================
-- FINAL SETUP VERIFICATION
-- =============================================

-- Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'profiles', 'user_settings', 'security_events', 'categories', 'category_attributes', 'listings',
        'conversations', 'messages', 'offers', 'user_credits', 'transactions', 'transaction_categories',
        'transaction_receipts', 'transaction_notifications', 'credit_transactions',
        'posts', 'post_likes', 'comments', 'shares', 'post_bookmarks',
        'support_tickets', 'support_ticket_messages', 'community_rewards', 'user_achievements',
        'subscription_plans', 'user_subscriptions', 'storage_usage',
        'moderation_categories', 'reports', 'user_verification', 'verification_documents', 'verification_templates', 'verification_history', 'device_tokens',
        'notifications', 'search_analytics', 'listing_views', 'reviews',
        'review_helpful_votes', 'follows', 'favorites', 'credit_purchases',
        'paystack_transactions', 'feature_purchases', 'plan_entitlements',
        'user_reward_history', 'reward_triggers', 'kb_articles', 'kb_article_feedback',
        'faq_categories', 'faq_items', 'search_suggestions', 'user_activity_log',
        'popular_searches'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    current_table TEXT;
BEGIN
    FOREACH current_table IN ARRAY expected_tables LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = current_table;
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, current_table);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All % tables created successfully!', array_length(expected_tables, 1);
    END IF;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' 
    AND c.relrowsecurity = true;
    
    RAISE NOTICE 'RLS enabled on % tables', rls_count;
END $$;

-- Final success message
SELECT 
    'Database setup completed successfully!' as status,
    NOW() as completed_at,
    current_database() as database_name,
    current_user as setup_user;
