-- =============================================
-- CRITICAL FIX: LISTINGS AND CATEGORIES - CORRECTED TO MATCH APP
-- This replaces 03_categories_and_listings.sql with exact app matches
-- =============================================

-- Categories table (corrected to match app)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Information (EXACT APP MATCH)
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Additional fields for completeness
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    image_url TEXT,
    level INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table (corrected to match app exactly)
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Basic Information (EXACT APP MATCH)
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    quantity INTEGER DEFAULT 1,
    location TEXT NOT NULL,
    images JSONB DEFAULT '[]', -- App expects this as JSONB array
    accept_offers BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'expired', 'suspended', 'deleted')),
    
    -- App expects these exact field names
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    boost_until TIMESTAMPTZ,
    
    -- Additional fields for functionality
    brand TEXT,
    model TEXT,
    year INTEGER,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    video_url TEXT,
    
    -- Category-specific attributes
    attributes JSONB DEFAULT '{}',
    
    -- Moderation
    moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged', 'under_review')),
    moderation_score INTEGER DEFAULT 0,
    flagged_reasons TEXT[],
    auto_moderated_at TIMESTAMPTZ,
    admin_reviewed_at TIMESTAMPTZ,
    admin_reviewed_by UUID REFERENCES profiles(id),
    
    -- Engagement Metrics (additional)
    inquiry_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- SEO and Search
    slug TEXT UNIQUE,
    tags TEXT[],
    search_vector tsvector,
    
    -- Expiry and Scheduling
    expires_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    
    -- Boost and Promotion
    is_featured BOOLEAN DEFAULT false,
    is_boosted BOOLEAN DEFAULT false,
    boost_expires_at TIMESTAMPTZ,
    boost_level INTEGER DEFAULT 0,
    is_urgent BOOLEAN DEFAULT false,
    is_negotiable BOOLEAN DEFAULT true,
    
    -- Contact Information
    contact_method TEXT DEFAULT 'app' CHECK (contact_method IN ('app', 'phone', 'email', 'whatsapp')),
    contact_phone TEXT,
    contact_email TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table (corrected to match app exactly)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Participants (EXACT APP MATCH - note the field names!)
    participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Related Listing
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

-- Messages table (corrected to match app exactly)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message Content (EXACT APP MATCH)
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'offer', 'system', 'location')),
    
    -- App expects these exact field names
    images JSONB DEFAULT '[]', -- App expects this field name
    offer_data JSONB, -- App expects this field name
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'deleted')),
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL, -- App expects this field name
    
    -- Read Status
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
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

-- Offers table (app expects this table name, not chat_offers)
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Offer Details (EXACT APP MATCH)
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Posts table (corrected to match app exactly)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Post Content (EXACT APP MATCH)
    content TEXT NOT NULL,
    images JSONB DEFAULT '[]', -- App expects this as JSONB array
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    location TEXT,
    
    -- App expects these exact field names
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    
    -- Post Type
    post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'question', 'tip', 'announcement')),
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'deleted')),
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table (corrected to match app exactly)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Comment Content (EXACT APP MATCH)
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- App expects this field name
    likes_count INTEGER DEFAULT 0, -- App expects this field name
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes table (app expects this table name)
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- App expects these exact field names
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one like per user per post/comment
    UNIQUE(user_id, post_id),
    UNIQUE(user_id, comment_id),
    
    -- Ensure either post_id or comment_id is set, but not both
    CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Follows table (unchanged)
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure user can't follow themselves
    CHECK (follower_id != following_id),
    
    UNIQUE(follower_id, following_id)
);

-- Reviews table (corrected to match app exactly)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- App expects these exact field names
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- App expects this field name
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    
    -- Review Content (EXACT APP MATCH)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    
    -- Review Context
    transaction_type TEXT CHECK (transaction_type IN ('purchase', 'sale', 'inquiry')),
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged')),
    
    -- Moderation
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    flagged_at TIMESTAMPTZ,
    
    -- Response
    response TEXT,
    response_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure reviewer can't review themselves
    CHECK (reviewer_id != reviewed_id),
    
    -- One review per listing per user
    UNIQUE(listing_id, reviewer_id)
);

-- Favorites table (unchanged)
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, listing_id)
);

-- Success message
SELECT 'CRITICAL FIX: Listings, conversations, messages, and related tables corrected to match app exactly!' as status;
