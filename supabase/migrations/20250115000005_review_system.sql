-- =============================================
-- REVIEW SYSTEM MIGRATION
-- Complete review and rating functionality
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- REVIEWS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT CHECK (char_length(comment) <= 1000),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent self-reviews and duplicate reviews per listing
    CONSTRAINT no_self_review CHECK (reviewer_id != reviewed_id),
    CONSTRAINT unique_review_per_listing UNIQUE (reviewer_id, reviewed_id, listing_id)
);

-- =============================================
-- FAVORITES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, listing_id)
);

-- =============================================
-- LISTING VIEWS TABLE (Analytics)
-- =============================================

CREATE TABLE IF NOT EXISTS listing_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- REVIEW HELPFUL VOTES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(review_id, user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Listing views indexes
CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id ON listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_user_id ON listing_views(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_created_at ON listing_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_views_ip_address ON listing_views(ip_address);

-- Review helpful votes indexes
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_id ON review_helpful_votes(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - REVIEWS
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (true);

-- Users can create reviews (but not for themselves)
CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND 
        auth.uid() != reviewed_id
    );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id)
    WITH CHECK (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- =============================================
-- RLS POLICIES - FAVORITES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view favorites" ON favorites;
DROP POLICY IF EXISTS "Users can view all favorites" ON favorites;
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;

-- Users can view all favorites (for public favorite counts)
CREATE POLICY "Anyone can view favorites" ON favorites
    FOR SELECT USING (true);

-- Users can manage their own favorites
CREATE POLICY "Users can manage own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - LISTING VIEWS
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create listing views" ON listing_views;
DROP POLICY IF EXISTS "Anyone can view listing views" ON listing_views;
DROP POLICY IF EXISTS "Users can view listing views" ON listing_views;

-- Anyone can create listing views (for analytics)
CREATE POLICY "Anyone can create listing views" ON listing_views
    FOR INSERT WITH CHECK (true);

-- Anyone can view listing views (for analytics)
CREATE POLICY "Anyone can view listing views" ON listing_views
    FOR SELECT USING (true);

-- =============================================
-- RLS POLICIES - REVIEW HELPFUL VOTES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view helpful votes" ON review_helpful_votes;
DROP POLICY IF EXISTS "Users can manage own helpful votes" ON review_helpful_votes;

-- Anyone can view helpful votes
CREATE POLICY "Anyone can view helpful votes" ON review_helpful_votes
    FOR SELECT USING (true);

-- Users can manage their own helpful votes
CREATE POLICY "Users can manage own helpful votes" ON review_helpful_votes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Create trigger for reviews updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;

-- Create the trigger
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPFUL FUNCTIONS FOR REVIEW STATISTICS
-- =============================================

-- Function to get average rating for a user
CREATE OR REPLACE FUNCTION get_user_average_rating(user_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(AVG(rating::DECIMAL), 0)
        FROM reviews
        WHERE reviewed_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total review count for a user
CREATE OR REPLACE FUNCTION get_user_review_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM reviews
        WHERE reviewed_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get helpful votes count for a review
CREATE OR REPLACE FUNCTION get_review_helpful_count(review_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM review_helpful_votes
        WHERE review_id = review_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify all tables were created successfully
SELECT 
    'reviews' as table_name,
    COUNT(*) as row_count
FROM reviews
UNION ALL
SELECT 
    'favorites' as table_name,
    COUNT(*) as row_count
FROM favorites
UNION ALL
SELECT 
    'listing_views' as table_name,
    COUNT(*) as row_count
FROM listing_views
UNION ALL
SELECT 
    'review_helpful_votes' as table_name,
    COUNT(*) as row_count
FROM review_helpful_votes;

-- Show created indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE tablename IN ('reviews', 'favorites', 'listing_views', 'review_helpful_votes')
ORDER BY tablename, indexname;
