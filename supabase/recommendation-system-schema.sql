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
-- INDEXES FOR PERFORMANCE
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
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_user_interactions_updated_at BEFORE UPDATE ON user_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_popularity_updated_at BEFORE UPDATE ON listing_popularity FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listing_co_interactions_updated_at BEFORE UPDATE ON listing_co_interactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boosted_listings_updated_at BEFORE UPDATE ON boosted_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_popularity ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_co_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosted_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- User interactions policies
CREATE POLICY "Users can view their own interactions" ON user_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own interactions" ON user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own interactions" ON user_interactions FOR UPDATE USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Listing popularity policies (read-only for users)
CREATE POLICY "Anyone can view listing popularity" ON listing_popularity FOR SELECT USING (true);

-- Co-interactions policies (read-only for users)
CREATE POLICY "Anyone can view co-interactions" ON listing_co_interactions FOR SELECT USING (true);

-- Recently viewed policies
CREATE POLICY "Users can view their own recently viewed" ON recently_viewed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recently viewed" ON recently_viewed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recently viewed" ON recently_viewed FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recently viewed" ON recently_viewed FOR DELETE USING (auth.uid() = user_id);

-- Boosted listings policies (read-only for users)
CREATE POLICY "Anyone can view active boosted listings" ON boosted_listings FOR SELECT USING (is_active = true AND boost_until > NOW());

-- Search history policies
CREATE POLICY "Users can view their own search history" ON search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own search history" ON search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own search history" ON search_history FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE user_interactions IS 'Tracks all user interactions with listings for recommendation algorithms';
COMMENT ON TABLE user_preferences IS 'Stores calculated user preferences based on interaction patterns';
COMMENT ON TABLE listing_popularity IS 'Cached popularity and trending scores for listings';
COMMENT ON TABLE listing_co_interactions IS 'Collaborative filtering data - which listings are often viewed together';
COMMENT ON TABLE recently_viewed IS 'Quick access to recently viewed items for each user';
COMMENT ON TABLE boosted_listings IS 'Sponsored/boosted listings with enhanced visibility';
COMMENT ON TABLE search_history IS 'User search queries for personalization and analytics';
