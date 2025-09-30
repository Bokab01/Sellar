-- Performance optimization indexes for faster queries
-- These indexes will significantly improve query performance for recommendations and business listings

-- Indexes for listings table
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_views_count ON listings(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_listings_spotlight_until ON listings(spotlight_until);

-- User Interactions table
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_listing_id ON user_interactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
-- Note: Unique index with date function removed to avoid syntax issues

-- Recently Viewed table
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_id ON recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);

-- Profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_is_business ON profiles(is_business);

-- Categories table
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- User Subscriptions table
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Favorites table
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);

-- Analyze tables to update statistics for the query planner
ANALYZE listings;
ANALYZE user_interactions;
ANALYZE recently_viewed;
ANALYZE profiles;
ANALYZE categories;
ANALYZE user_subscriptions;
ANALYZE favorites;