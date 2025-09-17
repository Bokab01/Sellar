-- Sellar Mobile App - Complete Database Schema
-- Generated from comprehensive frontend analysis
-- Compatible with Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE USER MANAGEMENT TABLES
-- =============================================

-- Categories table (referenced by listings)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(20),
    avatar_url TEXT,
    location VARCHAR(255) DEFAULT 'Accra, Greater Accra',
    bio TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_sales INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    credit_balance INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time VARCHAR(50) DEFAULT 'within_day',
    
    -- Professional fields
    professional_title VARCHAR(100),
    years_of_experience INTEGER,
    
    -- Contact preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'app' CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp')),
    response_time_expectation VARCHAR(20) DEFAULT 'within_day' CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week')),
    
    -- Privacy settings
    phone_visibility VARCHAR(20) DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private')),
    email_visibility VARCHAR(20) DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private')),
    show_online_status BOOLEAN DEFAULT true,
    show_last_seen BOOLEAN DEFAULT true,
    
    -- Business fields
    is_business BOOLEAN DEFAULT false,
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    business_description TEXT,
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    business_website VARCHAR(255),
    display_business_name BOOLEAN DEFAULT false,
    business_name_priority VARCHAR(20) DEFAULT 'secondary' CHECK (business_name_priority IN ('primary', 'secondary', 'hidden')),
    
    -- Additional fields
    account_type VARCHAR(50) DEFAULT 'individual',
    verification_status VARCHAR(50) DEFAULT 'unverified',
    
    -- Referral tracking
    referral_code VARCHAR(50), -- Code used when signing up (if any)
    referred_by UUID REFERENCES profiles(id), -- Who referred this user
    
    -- Onboarding tracking
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Account status for deletion management
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_deletion', 'deleted')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LISTINGS AND MARKETPLACE
-- =============================================

-- Listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'GHS',
    category_id UUID NOT NULL,
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    location VARCHAR(255) NOT NULL,
    images JSONB DEFAULT '[]',
    accept_offers BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'expired', 'suspended', 'pending')),
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    boost_until TIMESTAMP WITH TIME ZONE,
    boost_score INTEGER DEFAULT 0,
    highlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    spotlight_category_id UUID,
    
    -- SEO and search optimization
    seo_title VARCHAR(300),
    keywords TEXT[],
    attributes JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Listing views tracking
CREATE TABLE listing_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Favorites/Wishlist
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- =============================================
-- MESSAGING AND COMMUNICATION
-- =============================================

-- Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(listing_id, participant_1, participant_2)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'offer', 'system')),
    images JSONB DEFAULT '[]', -- Array of image URLs (frontend sends as JSON string, needs parsing)
    offer_data JSONB,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers system
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'GHS',
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    parent_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Callback requests
CREATE TABLE callback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    preferred_time VARCHAR(100) DEFAULT 'anytime',
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COMMUNITY AND SOCIAL FEATURES
-- =============================================

-- Posts (community feed)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    images JSONB DEFAULT '[]',
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    location VARCHAR(255),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    type VARCHAR(20) DEFAULT 'general' CHECK (type IN ('general', 'listing', 'review', 'announcement', 'showcase', 'question', 'tips', 'event', 'collaboration')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments on posts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes (for posts and comments)
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL)),
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, comment_id)
);

-- Shares
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Follow system
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- =============================================
-- REVIEWS AND RATINGS
-- =============================================

-- Reviews system
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL,
    reviewed_user_id UUID NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    transaction_id UUID, -- Will reference transactions table
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    is_verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reviewer_id, reviewed_user_id, listing_id),
    CONSTRAINT reviews_reviewer_fkey FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT reviews_reviewed_user_fkey FOREIGN KEY (reviewed_user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- =============================================
-- TRANSACTIONS AND PAYMENTS
-- =============================================

-- Financial transactions (credits, payments, etc.)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    payment_method VARCHAR(50),
    purchase_type VARCHAR(50) NOT NULL,
    purchase_id VARCHAR(100),
    customer_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    webhook_received BOOLEAN DEFAULT false,
    webhook_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paystack specific transactions
CREATE TABLE paystack_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GHS',
    payment_method VARCHAR(50),
    purchase_type VARCHAR(50) NOT NULL,
    purchase_id VARCHAR(100),
    customer_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: meetup_transactions table is defined later with complete schema

-- =============================================
-- CREDITS AND MONETIZATION
-- =============================================

-- User credits tracking
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Credit transactions log
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('earned', 'spent', 'refunded', 'bonus', 'penalty')),
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit packages
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    price_ghs DECIMAL(10,2) NOT NULL CHECK (price_ghs > 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit purchases
CREATE TABLE credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES credit_packages(id),
    credits INTEGER NOT NULL,
    amount_ghs DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_reference VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_ghs DECIMAL(10,2) NOT NULL CHECK (price_ghs >= 0),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community rewards system
CREATE TABLE community_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_validated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature purchases system
CREATE TABLE feature_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_name VARCHAR(200), -- Human-readable feature name
    credits_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100),
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VERIFICATION SYSTEM
-- =============================================

-- User verification requests
CREATE TABLE user_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('phone', 'email', 'identity', 'business', 'address')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_id UUID REFERENCES profiles(id),
    review_notes TEXT,
    rejection_reason TEXT,
    documents JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATIONS AND SETTINGS
-- =============================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    push_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    phone_visibility VARCHAR(20) DEFAULT 'contacts',
    online_status_visibility BOOLEAN DEFAULT true,
    theme_preference VARCHAR(20) DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(3) DEFAULT 'GHS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Notification preferences (detailed)
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    messages_enabled BOOLEAN DEFAULT true,
    offers_enabled BOOLEAN DEFAULT true,
    community_enabled BOOLEAN DEFAULT true,
    system_enabled BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_start_time TIME DEFAULT '22:00',
    quiet_end_time TIME DEFAULT '08:00',
    instant_notifications BOOLEAN DEFAULT true,
    daily_digest BOOLEAN DEFAULT false,
    weekly_summary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Device tokens for push notifications
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_name VARCHAR(100),
    device_model VARCHAR(100),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform, token)
);

-- Push notification queue
CREATE TABLE push_notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_ids UUID[] NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- MODERATION AND SAFETY
-- =============================================

-- Reports system
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (reported_user_id IS NOT NULL) OR 
        (listing_id IS NOT NULL) OR 
        (post_id IS NOT NULL) OR 
        (comment_id IS NOT NULL) OR 
        (message_id IS NOT NULL)
    )
);

-- Blocked users
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

-- =============================================
-- SYSTEM AND CONFIGURATION
-- =============================================

-- App settings (system-wide configuration)
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support tickets system
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technical', 'billing', 'account', 'feature_request', 'bug_report', 'general')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    app_version VARCHAR(20),
    device_info JSONB DEFAULT '{}',
    ticket_number VARCHAR(20) UNIQUE,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Support ticket responses/messages
CREATE TABLE support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_staff_response BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base articles
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- FAQ items
CREATE TABLE faq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data deletion requests (GDPR compliance)
CREATE TABLE data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- VIEWS FOR SIMPLIFIED QUERIES
-- =============================================

-- View for listings with main category (resolves ambiguous relationship)
CREATE VIEW listings_with_category AS
SELECT 
    l.*,
    c.name as category_name,
    c.slug as category_slug,
    c.icon as category_icon
FROM listings l
LEFT JOIN categories c ON l.category_id = c.id;

-- View for listings with spotlight category
CREATE VIEW listings_with_spotlight_category AS
SELECT 
    l.*,
    c.name as spotlight_category_name,
    c.slug as spotlight_category_slug,
    c.icon as spotlight_category_icon
FROM listings l
LEFT JOIN categories c ON l.spotlight_category_id = c.id;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_is_business ON profiles(is_business);
CREATE INDEX idx_profiles_verification_status ON profiles(verification_status);

-- Listings indexes
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_category_id ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings(location);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_boost_until ON listings(boost_until);
CREATE INDEX idx_listings_boost_score ON listings(boost_score);
CREATE INDEX idx_listings_highlight_until ON listings(highlight_until);
CREATE INDEX idx_listings_urgent_until ON listings(urgent_until);
CREATE INDEX idx_listings_spotlight_until ON listings(spotlight_until);
CREATE INDEX idx_listings_search ON listings USING gin(to_tsvector('english', title || ' ' || description));

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_read_at ON messages(read_at);

-- Conversations indexes
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Offers indexes
CREATE INDEX idx_offers_listing_id ON offers(listing_id);
CREATE INDEX idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX idx_offers_seller_id ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_expires_at ON offers(expires_at);

-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_listing_id ON posts(listing_id);
CREATE INDEX idx_posts_type ON posts(type);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference);

-- Credit transactions indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Feature purchases indexes
CREATE INDEX idx_feature_purchases_user_id ON feature_purchases(user_id);
CREATE INDEX idx_feature_purchases_listing_id ON feature_purchases(listing_id);
CREATE INDEX idx_feature_purchases_feature_key ON feature_purchases(feature_key);
CREATE INDEX idx_feature_purchases_status ON feature_purchases(status);
CREATE INDEX idx_feature_purchases_expires_at ON feature_purchases(expires_at);
CREATE INDEX idx_feature_purchases_activated_at ON feature_purchases(activated_at);

-- Reviews indexes
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Verification indexes
CREATE INDEX idx_user_verification_user_id ON user_verification(user_id);
CREATE INDEX idx_user_verification_status ON user_verification(status);
CREATE INDEX idx_user_verification_type ON user_verification(verification_type);

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_purchases_updated_at BEFORE UPDATE ON feature_purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_verification_updated_at BEFORE UPDATE ON user_verification FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_device_tokens_updated_at BEFORE UPDATE ON device_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_notification_queue_updated_at BEFORE UPDATE ON push_notification_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MISSING TABLES FROM FRONTEND USAGE
-- =============================================

-- Meetup transactions table (used in hooks/useTransactions.ts)
CREATE TABLE meetup_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'disputed')),
    confirmed_by TEXT[] DEFAULT '{}',
    agreed_price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GHS',
    meetup_location TEXT,
    meetup_time TIMESTAMPTZ,
    buyer_confirmed_at TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,
    verification_code TEXT,
    buyer_notes TEXT,
    seller_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger for meetup_transactions
CREATE TRIGGER update_meetup_transactions_updated_at BEFORE UPDATE ON meetup_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Transaction categories table (referenced in supabase-client.ts)
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction receipts table (referenced in supabase-client.ts)
CREATE TABLE transaction_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_url TEXT NOT NULL,
    receipt_type TEXT NOT NULL DEFAULT 'pdf',
    file_size INTEGER,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction notifications table (referenced in supabase-client.ts)
CREATE TABLE transaction_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search analytics table (used in smartSearchService.ts)
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    search_query TEXT NOT NULL,
    search_type TEXT NOT NULL DEFAULT 'general',
    filters_applied JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    search_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription change log table (used in subscriptionManagement.ts)
CREATE TABLE subscription_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'cancelled', 'renewed', 'expired')),
    old_plan_id UUID REFERENCES subscription_plans(id),
    new_plan_id UUID REFERENCES subscription_plans(id),
    old_status TEXT,
    new_status TEXT,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MISSING INDEXES FOR NEW TABLES
-- =============================================

-- Meetup transactions indexes
CREATE INDEX idx_meetup_transactions_buyer_id ON meetup_transactions(buyer_id);
CREATE INDEX idx_meetup_transactions_seller_id ON meetup_transactions(seller_id);
CREATE INDEX idx_meetup_transactions_listing_id ON meetup_transactions(listing_id);
CREATE INDEX idx_meetup_transactions_conversation_id ON meetup_transactions(conversation_id);
CREATE INDEX idx_meetup_transactions_status ON meetup_transactions(status);
CREATE INDEX idx_meetup_transactions_created_at ON meetup_transactions(created_at);

-- Transaction categories indexes
CREATE INDEX idx_transaction_categories_is_active ON transaction_categories(is_active);
CREATE INDEX idx_transaction_categories_sort_order ON transaction_categories(sort_order);

-- Transaction receipts indexes
CREATE INDEX idx_transaction_receipts_transaction_id ON transaction_receipts(transaction_id);
CREATE INDEX idx_transaction_receipts_expires_at ON transaction_receipts(expires_at);

-- Transaction notifications indexes
CREATE INDEX idx_transaction_notifications_transaction_id ON transaction_notifications(transaction_id);
CREATE INDEX idx_transaction_notifications_user_id ON transaction_notifications(user_id);
CREATE INDEX idx_transaction_notifications_is_read ON transaction_notifications(is_read);

-- Search analytics indexes
CREATE INDEX idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_search_type ON search_analytics(search_type);
CREATE INDEX idx_search_analytics_created_at ON search_analytics(created_at);
CREATE INDEX idx_search_analytics_clicked_listing_id ON search_analytics(clicked_listing_id);

-- Subscription change log indexes
CREATE INDEX idx_subscription_change_log_user_id ON subscription_change_log(user_id);
CREATE INDEX idx_subscription_change_log_subscription_id ON subscription_change_log(subscription_id);
CREATE INDEX idx_subscription_change_log_change_type ON subscription_change_log(change_type);
CREATE INDEX idx_subscription_change_log_created_at ON subscription_change_log(created_at);

-- Support tickets indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_app_version ON support_tickets(app_version);
CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_user_id ON support_ticket_messages(user_id);

-- Knowledge base indexes
CREATE INDEX idx_kb_articles_category ON kb_articles(category);
CREATE INDEX idx_kb_articles_is_published ON kb_articles(is_published);
CREATE INDEX idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX idx_kb_articles_search_vector ON kb_articles USING gin(search_vector);
CREATE INDEX idx_kb_articles_created_at ON kb_articles(created_at);
CREATE INDEX idx_kb_articles_author_id ON kb_articles(author_id);

-- FAQ indexes
CREATE INDEX idx_faq_items_category ON faq_items(category);
CREATE INDEX idx_faq_items_is_featured ON faq_items(is_featured);
CREATE INDEX idx_faq_items_order_index ON faq_items(order_index);

-- Data deletion requests indexes
CREATE INDEX idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX idx_data_deletion_requests_scheduled_for ON data_deletion_requests(scheduled_for);

-- =============================================
-- STORAGE BUCKETS SETUP
-- =============================================

-- Note: Storage buckets need to be created manually in Supabase Dashboard
-- Required buckets (from lib/storage.ts):
-- - listing-images (for listing photos)
-- - profile-images (for user avatars)  
-- - community-images (for community post images)
-- - chat-attachments (for chat images)
-- - verification-documents (for verification files)

-- Storage bucket policies will be created automatically by Supabase
-- Ensure the following buckets exist:
-- 1. listing-images: Public read, authenticated write
-- 2. profile-images: Public read, authenticated write  
-- 3. community-images: Public read, authenticated write
-- 4. chat-attachments: Private, only conversation participants can access
-- 5. verification-documents: Private, only user and admins can access
