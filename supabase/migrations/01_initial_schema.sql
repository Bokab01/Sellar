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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'expired', 'suspended', 'pending', 'reserved', 'hidden')),
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

-- Add comment to document the listings status column
COMMENT ON COLUMN listings.status IS 'Listing status: active (available), sold (completed), draft (not published), expired (time expired), suspended (moderated), pending (awaiting approval), reserved (temporarily held during offer process), hidden (hidden by moderation)';

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
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn', 'countered')),
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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to document the posts status column
COMMENT ON COLUMN posts.status IS 'Post status: active (visible), hidden (hidden by moderation), suspended (temporarily hidden), deleted (soft deleted)';

-- Comments on posts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to document the comments status column
COMMENT ON COLUMN comments.status IS 'Comment status: active (visible), hidden (hidden by moderation), suspended (temporarily hidden), deleted (soft deleted)';

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
    transaction_id UUID, -- Will reference meetup_transactions table
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    review_type VARCHAR(20) CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer')),
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged')),
    is_verified_purchase BOOLEAN DEFAULT false,
    is_transaction_confirmed BOOLEAN DEFAULT false,
    verification_level VARCHAR(20) DEFAULT 'unconfirmed' CHECK (verification_level IN ('unconfirmed', 'single_confirmed', 'mutual_confirmed')),
    reviewer_verification_score INTEGER DEFAULT 0,
    transaction_value DECIMAL(10,2),
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reviewer_id, reviewed_user_id, listing_id),
    CONSTRAINT reviews_reviewer_fkey FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT reviews_reviewed_user_fkey FOREIGN KEY (reviewed_user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    CONSTRAINT reviews_meetup_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES meetup_transactions(id) ON DELETE SET NULL
);

-- Add comments to document the reviews table columns
COMMENT ON COLUMN reviews.review_type IS 'Type of review: buyer_to_seller (buyer reviewing seller) or seller_to_buyer (seller reviewing buyer)';
COMMENT ON COLUMN reviews.status IS 'Review status: draft (not published), published (visible), hidden (moderated), flagged (reported)';
COMMENT ON COLUMN reviews.is_transaction_confirmed IS 'Whether the underlying transaction was confirmed by both parties';
COMMENT ON COLUMN reviews.verification_level IS 'Verification level of the transaction: unconfirmed, single_confirmed, mutual_confirmed';
COMMENT ON COLUMN reviews.reviewer_verification_score IS 'Verification score of the reviewer at time of review';
COMMENT ON COLUMN reviews.transaction_value IS 'Value of the transaction being reviewed';
COMMENT ON COLUMN reviews.not_helpful_count IS 'Number of users who marked this review as not helpful';

-- Review helpful votes table for community feedback
CREATE TABLE review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate votes from same user on same review
    UNIQUE(review_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);
CREATE INDEX idx_review_helpful_votes_created_at ON review_helpful_votes(created_at DESC);

-- Add trigger to update review helpful_count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update helpful_count in reviews table
    UPDATE reviews 
    SET helpful_count = (
        SELECT COUNT(*) 
        FROM review_helpful_votes 
        WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
        AND is_helpful = true
    )
    WHERE id = COALESCE(NEW.review_id, OLD.review_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for helpful count updates
CREATE TRIGGER trigger_update_review_helpful_count
    AFTER INSERT OR UPDATE OR DELETE ON review_helpful_votes
    FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- Add comments for review_helpful_votes table
COMMENT ON TABLE review_helpful_votes IS 'Tracks helpful votes on reviews by community members';
COMMENT ON COLUMN review_helpful_votes.review_id IS 'Reference to the review being voted on';
COMMENT ON COLUMN review_helpful_votes.user_id IS 'User who cast the vote';
COMMENT ON COLUMN review_helpful_votes.is_helpful IS 'Whether the vote is helpful (true) or not helpful (false)';

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
    body TEXT,
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
    category VARCHAR(50) DEFAULT 'other',
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    evidence_urls JSONB DEFAULT '[]',
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (reported_user_id IS NOT NULL) OR 
        (listing_id IS NOT NULL) OR 
        (post_id IS NOT NULL) OR 
        (comment_id IS NOT NULL) OR 
        (message_id IS NOT NULL)
    )
);

-- Moderation categories
CREATE TABLE moderation_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    auto_action VARCHAR(50), -- 'none', 'hide', 'suspend', 'ban'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reputation system
CREATE TABLE user_reputation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reputation_score INTEGER DEFAULT 0,
    positive_reports INTEGER DEFAULT 0,
    negative_reports INTEGER DEFAULT 0,
    violations_count INTEGER DEFAULT 0,
    last_violation_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'good' CHECK (status IN ('good', 'warning', 'suspended', 'banned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Content moderation actions
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('hide', 'unhide', 'suspend', 'unsuspend', 'ban', 'unban', 'warn', 'dismiss')),
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('listing', 'post', 'comment', 'message', 'user')),
    target_id UUID NOT NULL,
    reason TEXT,
    duration_hours INTEGER, -- For temporary actions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Reports and moderation indexes
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_priority ON reports(priority);
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_category ON reports(category);

-- User reputation indexes
CREATE INDEX idx_user_reputation_score ON user_reputation(reputation_score);
CREATE INDEX idx_user_reputation_status ON user_reputation(status);

-- Moderation actions indexes
CREATE INDEX idx_moderation_actions_report_id ON moderation_actions(report_id);
CREATE INDEX idx_moderation_actions_moderator_id ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id);

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
-- SEED DATA FOR MODERATION CATEGORIES
-- =============================================

INSERT INTO moderation_categories (name, display_name, description, priority, auto_action) VALUES
('spam', 'Spam', 'Repetitive, unwanted, or promotional content', 'high', 'hide'),
('harassment', 'Harassment', 'Bullying, threats, or abusive behavior', 'urgent', 'suspend'),
('inappropriate', 'Inappropriate Content', 'Offensive, explicit, or inappropriate material', 'high', 'hide'),
('fraud', 'Fraud/Scam', 'Deceptive practices, fake listings, or scams', 'urgent', 'ban'),
('copyright', 'Copyright Violation', 'Unauthorized use of copyrighted material', 'medium', 'hide'),
('violence', 'Violence/Threats', 'Content promoting violence or making threats', 'urgent', 'ban'),
('hate_speech', 'Hate Speech', 'Content promoting hatred or discrimination', 'urgent', 'ban'),
('fake_listing', 'Fake Listing', 'Misleading or fraudulent product listings', 'high', 'hide'),
('price_manipulation', 'Price Manipulation', 'Artificially inflated or misleading prices', 'medium', 'hide'),
('other', 'Other', 'Other violations not covered above', 'low', 'none')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- REPORTING SYSTEM FUNCTIONS
-- =============================================

-- Function to submit a report
CREATE OR REPLACE FUNCTION submit_report(
    p_reporter_id UUID,
    p_target_type VARCHAR(20),
    p_target_id UUID,
    p_category VARCHAR(50),
    p_reason TEXT,
    p_description TEXT DEFAULT NULL,
    p_evidence_urls JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (success BOOLEAN, report_id UUID, error TEXT) AS $$
DECLARE
    v_report_id UUID;
    v_reported_user_id UUID;
    v_priority VARCHAR(20);
    v_auto_action VARCHAR(50);
    v_category_id UUID;
BEGIN
    -- Validate target type
    IF p_target_type NOT IN ('listing', 'post', 'comment', 'message', 'user') THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid target type'::TEXT;
        RETURN;
    END IF;

    -- Get category information
    SELECT id, priority, auto_action INTO v_category_id, v_priority, v_auto_action
    FROM moderation_categories 
    WHERE name = p_category AND is_active = true;

    IF v_category_id IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid category'::TEXT;
        RETURN;
    END IF;

    -- Get reported user ID based on target type
    CASE p_target_type
        WHEN 'listing' THEN
            SELECT user_id INTO v_reported_user_id FROM listings WHERE id = p_target_id;
        WHEN 'post' THEN
            SELECT user_id INTO v_reported_user_id FROM posts WHERE id = p_target_id;
        WHEN 'comment' THEN
            SELECT user_id INTO v_reported_user_id FROM comments WHERE id = p_target_id;
        WHEN 'message' THEN
            SELECT sender_id INTO v_reported_user_id FROM messages WHERE id = p_target_id;
        WHEN 'user' THEN
            v_reported_user_id := p_target_id;
    END CASE;

    -- Prevent self-reporting
    IF v_reported_user_id = p_reporter_id THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Cannot report yourself'::TEXT;
        RETURN;
    END IF;

    -- Create the report
    INSERT INTO reports (
        reporter_id,
        reported_user_id,
        listing_id,
        post_id,
        comment_id,
        message_id,
        category,
        reason,
        description,
        evidence_urls,
        priority
    ) VALUES (
        p_reporter_id,
        v_reported_user_id,
        CASE WHEN p_target_type = 'listing' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'post' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'comment' THEN p_target_id ELSE NULL END,
        CASE WHEN p_target_type = 'message' THEN p_target_id ELSE NULL END,
        p_category,
        p_reason,
        p_description,
        p_evidence_urls,
        v_priority
    ) RETURNING id INTO v_report_id;

    -- Update user reputation
    UPDATE user_reputation 
    SET 
        negative_reports = negative_reports + 1,
        reputation_score = reputation_score - 1,
        updated_at = NOW()
    WHERE user_id = v_reported_user_id;

    -- Insert if user doesn't have reputation record
    INSERT INTO user_reputation (user_id, negative_reports, reputation_score)
    SELECT v_reported_user_id, 1, -1
    WHERE NOT EXISTS (SELECT 1 FROM user_reputation WHERE user_id = v_reported_user_id);

    -- Handle automatic actions
    IF v_auto_action != 'none' THEN
        PERFORM handle_automatic_moderation(v_report_id, v_auto_action, p_target_type, p_target_id);
    END IF;

    RETURN QUERY SELECT true, v_report_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle automatic moderation
CREATE OR REPLACE FUNCTION handle_automatic_moderation(
    p_report_id UUID,
    p_action VARCHAR(50),
    p_target_type VARCHAR(20),
    p_target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_reported_user_id UUID;
BEGIN
    -- Get reported user ID
    SELECT reported_user_id INTO v_reported_user_id FROM reports WHERE id = p_report_id;

    -- Apply automatic action
    CASE p_action
        WHEN 'hide' THEN
            CASE p_target_type
                WHEN 'listing' THEN
                    UPDATE listings SET status = 'hidden' WHERE id = p_target_id;
                WHEN 'post' THEN
                    UPDATE posts SET status = 'hidden' WHERE id = p_target_id;
                WHEN 'comment' THEN
                    UPDATE comments SET status = 'hidden' WHERE id = p_target_id;
            END CASE;
        WHEN 'suspend' THEN
            UPDATE user_reputation 
            SET status = 'suspended', updated_at = NOW() 
            WHERE user_id = v_reported_user_id;
        WHEN 'ban' THEN
            UPDATE user_reputation 
            SET status = 'banned', updated_at = NOW() 
            WHERE user_id = v_reported_user_id;
    END CASE;

    -- Record the action
    INSERT INTO moderation_actions (
        report_id,
        moderator_id,
        action_type,
        target_type,
        target_id,
        reason
    ) VALUES (
        p_report_id,
        NULL, -- System action
        p_action,
        p_target_type,
        p_target_id,
        'Automatic action based on report category'
    );

    -- Update report status
    UPDATE reports 
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_report_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update reports updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reports_updated_at ON reports;
CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

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

-- =============================================
-- RECOMMENDATION SYSTEM SCHEMA
-- =============================================

-- User interactions tracking
CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'offer', 'purchase', 'share', 'contact')),
    interaction_weight DECIMAL(3,2) DEFAULT 1.0, -- Weight for different interaction types
    metadata JSONB DEFAULT '{}', -- Additional context (search query, time spent, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Note: One interaction per user-listing-type per day is enforced by application logic
);

-- User preferences and behavior patterns
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    preference_score DECIMAL(5,2) DEFAULT 0.0, -- Calculated preference score
    interaction_count INTEGER DEFAULT 0,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, category_id)
);

-- Listing popularity and trending scores
CREATE TABLE listing_popularity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    popularity_score DECIMAL(10,2) DEFAULT 0.0,
    trending_score DECIMAL(10,2) DEFAULT 0.0,
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    offer_count INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(listing_id)
);

-- Collaborative filtering - co-interaction patterns
CREATE TABLE listing_co_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    related_listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    co_interaction_count INTEGER DEFAULT 0,
    co_interaction_score DECIMAL(10,2) DEFAULT 0.0,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(primary_listing_id, related_listing_id),
    CHECK (primary_listing_id != related_listing_id)
);

-- Recently viewed items (for quick access)
CREATE TABLE recently_viewed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration INTEGER DEFAULT 0, -- Time spent viewing in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, listing_id)
);

-- Boosted/sponsored listings
CREATE TABLE boosted_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    boost_type VARCHAR(20) NOT NULL CHECK (boost_type IN ('featured', 'trending', 'category_spotlight', 'search_boost')),
    boost_weight DECIMAL(5,2) DEFAULT 1.0, -- Multiplier for ranking
    boost_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(listing_id, boost_type)
);

-- Search history for personalization
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    search_filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_listings JSONB DEFAULT '[]', -- Array of listing IDs that were clicked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- RECOMMENDATION SYSTEM INDEXES
-- =============================================

-- User interactions indexes
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_listing_id ON user_interactions(listing_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);
CREATE INDEX idx_user_interactions_user_listing ON user_interactions(user_id, listing_id);

-- User preferences indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON user_preferences(category_id);
CREATE INDEX idx_user_preferences_score ON user_preferences(preference_score DESC);

-- Listing popularity indexes
CREATE INDEX idx_listing_popularity_score ON listing_popularity(popularity_score DESC);
CREATE INDEX idx_listing_popularity_trending ON listing_popularity(trending_score DESC);
CREATE INDEX idx_listing_popularity_listing_id ON listing_popularity(listing_id);

-- Co-interactions indexes
CREATE INDEX idx_co_interactions_primary ON listing_co_interactions(primary_listing_id);
CREATE INDEX idx_co_interactions_related ON listing_co_interactions(related_listing_id);
CREATE INDEX idx_co_interactions_score ON listing_co_interactions(co_interaction_score DESC);

-- Recently viewed indexes
CREATE INDEX idx_recently_viewed_user_id ON recently_viewed(user_id);
CREATE INDEX idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);
CREATE INDEX idx_recently_viewed_user_viewed ON recently_viewed(user_id, viewed_at DESC);

-- Boosted listings indexes
CREATE INDEX idx_boosted_listings_active ON boosted_listings(is_active, boost_until);
CREATE INDEX idx_boosted_listings_type ON boosted_listings(boost_type);
CREATE INDEX idx_boosted_listings_weight ON boosted_listings(boost_weight DESC);

-- Search history indexes
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);

-- =============================================
-- RECOMMENDATION SYSTEM TRIGGERS
-- =============================================

CREATE TRIGGER update_user_interactions_updated_at BEFORE UPDATE ON user_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_popularity_updated_at BEFORE UPDATE ON listing_popularity FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_co_interactions_updated_at BEFORE UPDATE ON listing_co_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boosted_listings_updated_at BEFORE UPDATE ON boosted_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RECOMMENDATION SYSTEM RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_popularity ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_co_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosted_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- User interactions policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own interactions" ON user_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interactions" ON user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own interactions" ON user_interactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all interactions" ON user_interactions FOR ALL USING (true);

-- User preferences policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all preferences" ON user_preferences FOR ALL USING (true);

-- Listing popularity policies (read-only for users, full access for functions)
CREATE POLICY "Anyone can view listing popularity" ON listing_popularity FOR SELECT USING (true);
CREATE POLICY "Functions can manage listing popularity" ON listing_popularity FOR ALL USING (true);

-- Co-interactions policies (read-only for users, full access for functions)
CREATE POLICY "Anyone can view co-interactions" ON listing_co_interactions FOR SELECT USING (true);
CREATE POLICY "Functions can manage co-interactions" ON listing_co_interactions FOR ALL USING (true);

-- Recently viewed policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own recently viewed" ON recently_viewed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recently viewed" ON recently_viewed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recently viewed" ON recently_viewed FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recently viewed" ON recently_viewed FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all recently viewed" ON recently_viewed FOR ALL USING (true);

-- Boosted listings policies (read-only for users, full access for functions)
CREATE POLICY "Anyone can view active boosted listings" ON boosted_listings FOR SELECT USING (is_active = true AND boost_until > NOW());
CREATE POLICY "Functions can manage boosted listings" ON boosted_listings FOR ALL USING (true);

-- Search history policies (users can manage their own, functions can manage all)
CREATE POLICY "Users can view their own search history" ON search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own search history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own search history" ON search_history FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Functions can manage all search history" ON search_history FOR ALL USING (true);

-- =============================================
-- RECOMMENDATION SYSTEM COMMENTS
-- =============================================

COMMENT ON TABLE user_interactions IS 'Tracks all user interactions with listings for recommendation algorithms';
COMMENT ON TABLE user_preferences IS 'Stores calculated user preferences based on interaction patterns';
COMMENT ON TABLE listing_popularity IS 'Cached popularity and trending scores for listings';
COMMENT ON TABLE listing_co_interactions IS 'Collaborative filtering data - which listings are often viewed together';
COMMENT ON TABLE recently_viewed IS 'Quick access to recently viewed items for each user';
COMMENT ON TABLE boosted_listings IS 'Sponsored/boosted listings with enhanced visibility';
COMMENT ON TABLE search_history IS 'User search queries for personalization and analytics';

-- =============================================
-- REVIEW COUNT FIXES AND AUTOMATIC UPDATES
-- =============================================

-- Create a function to update user review statistics
CREATE OR REPLACE FUNCTION update_user_review_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_reviews INTEGER;
    v_average_rating DECIMAL(3,1);
BEGIN
    -- Get count of published reviews
    SELECT COUNT(*) INTO v_total_reviews
    FROM reviews 
    WHERE reviewed_user_id = p_user_id 
    AND status = 'published';
    
    -- Get average rating of published reviews
    SELECT ROUND(AVG(rating)::numeric, 1) INTO v_average_rating
    FROM reviews 
    WHERE reviewed_user_id = p_user_id 
    AND status = 'published';
    
    -- Update profile with new stats
    UPDATE profiles 
    SET 
        total_reviews = v_total_reviews,
        rating = COALESCE(v_average_rating, 0)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically update review stats
CREATE OR REPLACE FUNCTION trigger_update_user_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stats for the reviewed user
    PERFORM update_user_review_stats(COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id));
    
    -- If this is an update that changes the status, also update the reviewer's stats
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM update_user_review_stats(COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update review stats when reviews change
CREATE TRIGGER trigger_reviews_update_user_stats
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_review_stats();

-- =============================================
-- AUTO-REFRESH NOTIFICATION SPAM FIX
-- =============================================

-- Update the listing notification function to exclude auto-refresh updates
CREATE OR REPLACE FUNCTION create_listing_notification()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    listing_title TEXT;
    is_auto_refresh BOOLEAN := FALSE;
BEGIN
    -- Check if this is an auto-refresh update using session variable
    -- The auto-refresh function should set this variable
    BEGIN
        is_auto_refresh := COALESCE(current_setting('app.is_auto_refresh', true)::boolean, false);
    EXCEPTION WHEN OTHERS THEN
        is_auto_refresh := FALSE;
    END;

    -- Skip notification for auto-refresh updates
    IF is_auto_refresh THEN
        RETURN NEW;
    END IF;

    -- Get seller details
    SELECT username, avatar_url INTO seller_username, seller_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get listing title
    listing_title := NEW.title;
    
    -- Create notification for the seller (listing created/updated)
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.user_id,
        'listing',
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Listing Created Successfully! 🎉'
            WHEN TG_OP = 'UPDATE' THEN 'Listing Updated ✏️'
            ELSE 'Listing ' || TG_OP
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Your listing "' || listing_title || '" has been created and is now live!'
            WHEN TG_OP = 'UPDATE' THEN 'Your listing "' || listing_title || '" has been updated successfully.'
            ELSE 'Your listing "' || listing_title || '" was ' || TG_OP
        END,
        jsonb_build_object(
            'listing_id', NEW.id,
            'listing_title', listing_title,
            'action', TG_OP,
            'created_at', NEW.created_at,
            'is_auto_refresh', is_auto_refresh
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS process_business_auto_refresh();

-- ✅ FIXED: Auto-refresh function now checks for Sellar Pro subscription
CREATE OR REPLACE FUNCTION process_business_auto_refresh()
RETURNS TABLE(
    processed_count INTEGER,
    error_count INTEGER,
    deactivated_count INTEGER
) AS $$
DECLARE
    refresh_record RECORD;
    processed INTEGER := 0;
    errors INTEGER := 0;
    deactivated INTEGER := 0;
    has_active_boost BOOLEAN;
    has_active_subscription BOOLEAN;
BEGIN
    -- Set session variable to indicate we're doing auto-refresh
    PERFORM set_config('app.is_auto_refresh', 'true', true);
    
    -- Process all due auto-refreshes
    FOR refresh_record IN 
        SELECT bar.id, bar.user_id, bar.listing_id, bar.refresh_interval_hours
        FROM business_auto_refresh bar
        JOIN listings l ON bar.listing_id = l.id
        WHERE bar.is_active = true 
        AND bar.next_refresh_at <= NOW()
        AND l.status = 'active'
    LOOP
        BEGIN
            -- ✅ CRITICAL FIX: Check if user has active Sellar Pro subscription
            SELECT EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = refresh_record.user_id
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) INTO has_active_subscription;

            -- Check if listing has any active boost features (for non-Sellar Pro users)
            SELECT EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = refresh_record.listing_id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) INTO has_active_boost;

            -- ✅ CRITICAL FIX: Refresh if user has Sellar Pro subscription OR active boost
            IF has_active_subscription OR has_active_boost THEN
                -- Update listing's updated_at to refresh its position
                UPDATE listings 
                SET updated_at = NOW()
                WHERE id = refresh_record.listing_id;

                -- Update next refresh time
                UPDATE business_auto_refresh
                SET 
                    last_refresh_at = NOW(),
                    next_refresh_at = NOW() + (refresh_record.refresh_interval_hours || ' hours')::INTERVAL,
                    updated_at = NOW()
                WHERE id = refresh_record.id;

                processed := processed + 1;
                
                -- Log successful refresh
                RAISE NOTICE 'Auto-refreshed listing % for user % (Subscription: %, Boost: %)', 
                    refresh_record.listing_id, 
                    refresh_record.user_id,
                    has_active_subscription,
                    has_active_boost;
            ELSE
                -- ✅ Only deactivate if user has NO subscription AND NO active boosts
                UPDATE business_auto_refresh
                SET 
                    is_active = false,
                    updated_at = NOW()
                WHERE id = refresh_record.id;
                
                deactivated := deactivated + 1;
                
                RAISE NOTICE 'Deactivated auto-refresh for listing % (no subscription or boost)', 
                    refresh_record.listing_id;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            errors := errors + 1;
            RAISE NOTICE 'Error processing auto-refresh for listing %: %', refresh_record.listing_id, SQLERRM;
        END;
    END LOOP;
    
    -- Clear the session variable
    PERFORM set_config('app.is_auto_refresh', 'false', true);
    
    -- Return results
    RETURN QUERY SELECT processed, errors, deactivated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- AUTO-ENABLE AUTO-REFRESH FOR NEW LISTINGS
-- =============================================

-- ✅ Function to automatically enable auto-refresh when Sellar Pro user creates a listing
CREATE OR REPLACE FUNCTION auto_enable_sellar_pro_auto_refresh()
RETURNS TRIGGER AS $$
DECLARE
    has_active_subscription BOOLEAN;
BEGIN
    -- Only process for new active listings
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        -- Check if user has active Sellar Pro subscription
        SELECT EXISTS(
            SELECT 1 FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = NEW.user_id
            AND us.status = 'active'
            AND sp.name = 'Sellar Pro'
            AND us.current_period_end > NOW()
        ) INTO has_active_subscription;

        -- ✅ Auto-enable auto-refresh for Sellar Pro users
        IF has_active_subscription THEN
            INSERT INTO business_auto_refresh (user_id, listing_id)
            VALUES (NEW.user_id, NEW.id)
            ON CONFLICT (user_id, listing_id) 
            DO UPDATE SET 
                is_active = true,
                next_refresh_at = NOW() + INTERVAL '2 hours',
                last_refresh_at = NOW(),
                updated_at = NOW();
            
            RAISE NOTICE 'Auto-enabled auto-refresh for Sellar Pro user % listing %', NEW.user_id, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Create trigger to auto-enable auto-refresh for new listings
DROP TRIGGER IF EXISTS trigger_auto_enable_sellar_pro_auto_refresh ON listings;
CREATE TRIGGER trigger_auto_enable_sellar_pro_auto_refresh
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION auto_enable_sellar_pro_auto_refresh();

-- =============================================
-- AUTO-REFRESH CLEANUP AND SAFE FUNCTIONS
-- =============================================

-- Clean up duplicate auto-refresh entries
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, listing_id 
      ORDER BY created_at DESC
    ) as rn
  FROM business_auto_refresh
)
DELETE FROM business_auto_refresh 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Reset all auto-refresh settings to disabled state
UPDATE business_auto_refresh 
SET 
  is_active = false,
  updated_at = NOW()
WHERE is_active = true;

-- Clean up any orphaned auto-refresh entries for deleted listings
DELETE FROM business_auto_refresh 
WHERE listing_id NOT IN (
  SELECT id FROM listings
);

-- Clean up any auto-refresh entries for users who no longer have active subscriptions
DELETE FROM business_auto_refresh 
WHERE user_id NOT IN (
  SELECT user_id FROM user_subscriptions 
  WHERE status = 'active' 
  AND current_period_end > NOW()
);

-- Add a function to safely enable auto-refresh for a listing
CREATE OR REPLACE FUNCTION enable_auto_refresh_safely(
  p_user_id UUID,
  p_listing_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- First, remove any existing entries for this user/listing combination
  DELETE FROM business_auto_refresh 
  WHERE user_id = p_user_id AND listing_id = p_listing_id;
  
  -- Insert a new entry
  INSERT INTO business_auto_refresh (
    user_id,
    listing_id,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_listing_id,
    true,
    NOW(),
    NOW()
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's still a conflict, return false
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Add a function to safely disable auto-refresh for a listing
CREATE OR REPLACE FUNCTION disable_auto_refresh_safely(
  p_user_id UUID,
  p_listing_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Update existing entries to disabled
  UPDATE business_auto_refresh 
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE user_id = p_user_id AND listing_id = p_listing_id;
  
  -- If no rows were updated, the entry didn't exist, which is fine
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION enable_auto_refresh_safely(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_auto_refresh_safely(UUID, UUID) TO authenticated;

-- =============================================
-- NOTIFICATION TRIGGER FUNCTIONS
-- =============================================

-- Function to create notification for new messages
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_username TEXT;
    sender_avatar TEXT;
    recipient_id UUID;
    conversation_id UUID;
BEGIN
    -- Get sender details
    SELECT username, avatar_url INTO sender_username, sender_avatar
    FROM profiles 
    WHERE id = NEW.sender_id;
    
    -- Get conversation details to find recipient
    SELECT 
        CASE 
            WHEN participant_1 = NEW.sender_id THEN participant_2 
            ELSE participant_1 
        END,
        id
    INTO recipient_id, conversation_id
    FROM conversations 
    WHERE id = NEW.conversation_id;
    
    -- Don't notify if recipient is the same as sender (shouldn't happen)
    IF recipient_id = NEW.sender_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the recipient
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        recipient_id,
        'message',
        'New Message! 💬',
        COALESCE(sender_username, 'Someone') || ' sent you a message',
        jsonb_build_object(
            'sender_id', NEW.sender_id,
            'sender_username', COALESCE(sender_username, 'Unknown User'),
            'sender_avatar', sender_avatar,
            'conversation_id', conversation_id,
            'message_id', NEW.id,
            'message_content', LEFT(NEW.content, 100),
            'sent_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for new follows
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_username TEXT;
    follower_avatar TEXT;
BEGIN
    -- Get follower details
    SELECT username, avatar_url INTO follower_username, follower_avatar
    FROM profiles 
    WHERE id = NEW.follower_id;
    
    -- Don't notify if following yourself (shouldn't happen)
    IF NEW.follower_id = NEW.following_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the person being followed
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.following_id,
        'follow',
        'New Follower! 👥',
        COALESCE(follower_username, 'Someone') || ' started following you',
        jsonb_build_object(
            'follower_id', NEW.follower_id,
            'follower_username', COALESCE(follower_username, 'Unknown User'),
            'follower_avatar', follower_avatar,
            'followed_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for post likes
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    liker_username TEXT;
    liker_avatar TEXT;
    post_author_id UUID;
    post_content TEXT;
BEGIN
    -- Get liker details
    SELECT username, avatar_url INTO liker_username, liker_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, content INTO post_author_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if liking your own post
    IF NEW.user_id = post_author_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the post author
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_author_id,
        'like',
        'Post Liked! ❤️',
        COALESCE(liker_username, 'Someone') || ' liked your post',
        jsonb_build_object(
            'liker_id', NEW.user_id,
            'liker_username', COALESCE(liker_username, 'Unknown User'),
            'liker_avatar', liker_avatar,
            'post_id', NEW.post_id,
            'post_content', LEFT(post_content, 100),
            'liked_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for new comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    commenter_username TEXT;
    commenter_avatar TEXT;
    post_author_id UUID;
    post_content TEXT;
BEGIN
    -- Get commenter details
    SELECT username, avatar_url INTO commenter_username, commenter_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, content INTO post_author_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if commenting on your own post
    IF NEW.user_id = post_author_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for the post author
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_author_id,
        'comment',
        'New Comment! 💬',
        COALESCE(commenter_username, 'Someone') || ' commented on your post',
        jsonb_build_object(
            'commenter_id', NEW.user_id,
            'commenter_username', COALESCE(commenter_username, 'Unknown User'),
            'commenter_avatar', commenter_avatar,
            'post_id', NEW.post_id,
            'post_content', LEFT(post_content, 100),
            'comment_id', NEW.id,
            'comment_content', LEFT(NEW.content, 100),
            'commented_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for all notification types
CREATE TRIGGER trigger_create_message_notification
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER trigger_create_follow_notification
    AFTER INSERT ON follows
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_notification();

CREATE TRIGGER trigger_create_like_notification
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION create_like_notification();

CREATE TRIGGER trigger_create_comment_notification
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

-- NOTE: trigger_create_listing_notification is created in migration 09_notification_triggers.sql
-- and updated in 10_fix_auto_refresh_notification_spam.sql

-- Helpful vote functions to replace supabase.raw usage
-- These functions handle incrementing and decrementing helpful counts safely

-- Function to increment review helpful count
CREATE OR REPLACE FUNCTION increment_review_helpful_count(review_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE reviews 
    SET helpful_count = helpful_count + 1
    WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement review helpful count
CREATE OR REPLACE FUNCTION decrement_review_helpful_count(review_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE reviews 
    SET helpful_count = GREATEST(helpful_count - 1, 0)
    WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
