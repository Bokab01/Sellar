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
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT DEFAULT 'Accra, Greater Accra',
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    
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
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT false,
    verification_level verification_level DEFAULT 'none',
    verification_documents JSONB DEFAULT '[]',
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMPTZ,
    business_verified BOOLEAN DEFAULT false,
    business_verified_at TIMESTAMPTZ,
    
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
    show_online_status BOOLEAN DEFAULT true,
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

-- Credit transactions table
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
ON CONFLICT (id) DO NOTHING;

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
BEGIN
    -- Create profile for new user
    INSERT INTO profiles (
        id,
        full_name,
        email,
        phone,
        location,
        is_business
    )
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(TRIM(CONCAT(
                COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
                ' ',
                COALESCE(NEW.raw_user_meta_data->>'lastName', '')
            )), ''),
            'User'
        ),
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
    WHERE reviewed_user_id = NEW.reviewed_user_id;
    
    -- Update user's rating (assuming we have these columns in profiles)
    -- UPDATE profiles 
    -- SET average_rating = v_avg_rating, total_reviews = v_total_reviews
    -- WHERE id = NEW.reviewed_user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- =============================================
-- FINAL SETUP VERIFICATION
-- =============================================

-- Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'profiles', 'user_settings', 'security_events', 'categories', 'category_attributes', 'listings',
        'conversations', 'messages', 'offers', 'user_credits', 'credit_transactions',
        'posts', 'post_likes', 'comments', 'shares', 'post_bookmarks',
        'support_tickets', 'support_ticket_messages', 'community_rewards', 'user_achievements',
        'subscription_plans', 'user_subscriptions', 'storage_usage',
        'moderation_categories', 'reports', 'user_verification', 'device_tokens',
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
