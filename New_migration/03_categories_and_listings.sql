-- =============================================
-- SELLAR MOBILE APP - CATEGORIES AND LISTINGS
-- Migration 03: Categories and listings system
-- =============================================

-- =============================================
-- CATEGORIES TABLE
-- =============================================

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

-- =============================================
-- CATEGORY ATTRIBUTES TABLE
-- =============================================

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

-- =============================================
-- LISTINGS TABLE
-- =============================================

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
-- LISTING VIEWS TABLE
-- =============================================

CREATE TABLE listing_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- View Information
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    -- Location (if available)
    country TEXT,
    city TEXT,
    
    -- Timestamps
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FAVORITES TABLE
-- =============================================

CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, listing_id)
);

-- =============================================
-- LISTING INQUIRIES TABLE
-- =============================================

CREATE TABLE listing_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    inquirer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Inquiry Details
    message TEXT NOT NULL,
    contact_method TEXT CHECK (contact_method IN ('app', 'phone', 'email', 'whatsapp')),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
    
    -- Response
    response TEXT,
    responded_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Categories indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_is_featured ON categories(is_featured);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

-- Category attributes indexes
CREATE INDEX idx_category_attributes_category_id ON category_attributes(category_id);
CREATE INDEX idx_category_attributes_type ON category_attributes(type);
CREATE INDEX idx_category_attributes_is_required ON category_attributes(is_required);

-- Listings indexes
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_category_id ON listings(category_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_moderation_status ON listings(moderation_status);
CREATE INDEX idx_listings_location ON listings(location);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_condition ON listings(condition);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_published_at ON listings(published_at DESC);
CREATE INDEX idx_listings_expires_at ON listings(expires_at);
CREATE INDEX idx_listings_is_featured ON listings(is_featured);
CREATE INDEX idx_listings_is_boosted ON listings(is_boosted);
CREATE INDEX idx_listings_view_count ON listings(view_count);
CREATE INDEX idx_listings_favorite_count ON listings(favorite_count);

-- Full-text search index
CREATE INDEX idx_listings_search_vector ON listings USING gin(search_vector);

-- Composite indexes for common queries
CREATE INDEX idx_listings_active_by_category ON listings(category_id, status, created_at DESC) 
WHERE status = 'active';
CREATE INDEX idx_listings_active_by_location ON listings(location, status, created_at DESC) 
WHERE status = 'active';
CREATE INDEX idx_listings_featured_active ON listings(is_featured, status, created_at DESC) 
WHERE status = 'active' AND is_featured = true;

-- Listing views indexes
CREATE INDEX idx_listing_views_listing_id ON listing_views(listing_id);
CREATE INDEX idx_listing_views_user_id ON listing_views(user_id);
CREATE INDEX idx_listing_views_viewed_at ON listing_views(viewed_at);
CREATE INDEX idx_listing_views_ip_address ON listing_views(ip_address);

-- Favorites indexes
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_listing_id ON favorites(listing_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at);

-- Listing inquiries indexes
CREATE INDEX idx_listing_inquiries_listing_id ON listing_inquiries(listing_id);
CREATE INDEX idx_listing_inquiries_inquirer_id ON listing_inquiries(inquirer_id);
CREATE INDEX idx_listing_inquiries_status ON listing_inquiries(status);
CREATE INDEX idx_listing_inquiries_created_at ON listing_inquiries(created_at);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on categories
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on category_attributes
CREATE TRIGGER update_category_attributes_updated_at
    BEFORE UPDATE ON category_attributes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on listings
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on listing_inquiries
CREATE TRIGGER update_listing_inquiries_updated_at
    BEFORE UPDATE ON listing_inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR LISTINGS
-- =============================================

-- Function to generate listing slug
CREATE OR REPLACE FUNCTION generate_listing_slug(title TEXT, listing_id UUID)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base slug from title
    base_slug := LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
    base_slug := TRIM(base_slug, '-');
    
    -- Ensure minimum length
    IF LENGTH(base_slug) < 3 THEN
        base_slug := 'listing-' || base_slug;
    END IF;
    
    -- Try the base slug first
    final_slug := base_slug;
    
    -- If it exists, add numbers until we find a unique one
    WHILE EXISTS (SELECT 1 FROM listings WHERE slug = final_slug AND id != listing_id) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.model, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search vector
CREATE TRIGGER update_listing_search_vector_trigger
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_search_vector();

-- Success message
SELECT 'Categories and listings tables created successfully!' as status;
