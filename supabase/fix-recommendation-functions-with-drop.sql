-- =============================================
-- FIX RECOMMENDATION FUNCTIONS WITH PROPER DROP
-- =============================================

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS update_user_preferences(UUID, UUID, VARCHAR(20), DECIMAL(3,2));
DROP FUNCTION IF EXISTS update_listing_popularity(UUID, VARCHAR(20), DECIMAL(3,2));
DROP FUNCTION IF EXISTS update_listing_co_interactions(UUID, UUID, VARCHAR(20));
DROP FUNCTION IF EXISTS record_search_history(UUID, TEXT, JSONB, INTEGER, JSONB);
DROP FUNCTION IF EXISTS get_boosted_listings(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_recently_viewed(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_trending_near_user(UUID, VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_personalized_recommendations(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_collaborative_recommendations(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_category_recommendations(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_search_suggestions(UUID, TEXT, INTEGER);

-- Now recreate all functions with correct signatures

-- Function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
    p_user_id UUID,
    p_listing_id UUID,
    p_interaction_type VARCHAR(20),
    p_weight DECIMAL(3,2)
) RETURNS VOID AS $$
DECLARE
    v_category_id UUID;
    v_score_increment DECIMAL(5,2);
BEGIN
    -- Get category from listing
    SELECT category_id INTO v_category_id FROM listings WHERE id = p_listing_id;
    
    IF v_category_id IS NULL THEN
        RETURN;
    END IF;

    -- Calculate score increment based on interaction type
    v_score_increment := p_weight * 0.1;

    -- Update or insert user preference
    INSERT INTO user_preferences (user_id, category_id, preference_score, interaction_count, last_interaction)
    VALUES (p_user_id, v_category_id, v_score_increment, 1, NOW())
    ON CONFLICT (user_id, category_id) 
    DO UPDATE SET 
        preference_score = user_preferences.preference_score + v_score_increment,
        interaction_count = user_preferences.interaction_count + 1,
        last_interaction = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update listing popularity
CREATE OR REPLACE FUNCTION update_listing_popularity(
    p_listing_id UUID,
    p_interaction_type VARCHAR(20),
    p_weight DECIMAL(3,2)
) RETURNS VOID AS $$
DECLARE
    v_score_change DECIMAL(10,2);
BEGIN
    v_score_change := CASE p_interaction_type
        WHEN 'purchase' THEN 10.0
        WHEN 'offer' THEN 5.0
        WHEN 'favorite' THEN 3.0
        WHEN 'contact' THEN 3.0
        WHEN 'share' THEN 2.0
        WHEN 'view' THEN 1.0
        ELSE 0.0
    END * p_weight;

    INSERT INTO listing_popularity (listing_id, popularity_score, trending_score, view_count, favorite_count, offer_count, purchase_count, share_count, contact_count, last_calculated)
    VALUES (p_listing_id, v_score_change, v_score_change,
            CASE WHEN p_interaction_type = 'view' THEN 1 ELSE 0 END,
            CASE WHEN p_interaction_type = 'favorite' THEN 1 ELSE 0 END,
            CASE WHEN p_interaction_type = 'offer' THEN 1 ELSE 0 END,
            CASE WHEN p_interaction_type = 'purchase' THEN 1 ELSE 0 END,
            CASE WHEN p_interaction_type = 'share' THEN 1 ELSE 0 END,
            CASE WHEN p_interaction_type = 'contact' THEN 1 ELSE 0 END,
            NOW())
    ON CONFLICT (listing_id) DO UPDATE SET
        popularity_score = listing_popularity.popularity_score + EXCLUDED.popularity_score,
        trending_score = listing_popularity.trending_score + EXCLUDED.trending_score,
        view_count = listing_popularity.view_count + EXCLUDED.view_count,
        favorite_count = listing_popularity.favorite_count + EXCLUDED.favorite_count,
        offer_count = listing_popularity.offer_count + EXCLUDED.offer_count,
        purchase_count = listing_popularity.purchase_count + EXCLUDED.purchase_count,
        share_count = listing_popularity.share_count + EXCLUDED.share_count,
        contact_count = listing_popularity.contact_count + EXCLUDED.contact_count,
        last_calculated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update co-interaction patterns
CREATE OR REPLACE FUNCTION update_listing_co_interactions(
    p_user_id UUID,
    p_listing_id UUID,
    p_interaction_type VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
    -- Find other listings the user interacted with recently
    INSERT INTO listing_co_interactions (primary_listing_id, related_listing_id, co_interaction_count, co_interaction_score, last_calculated)
    SELECT
        p_listing_id,
        ui.listing_id,
        1,
        1.0,
        NOW()
    FROM user_interactions ui
    WHERE ui.user_id = p_user_id
      AND ui.listing_id != p_listing_id
      AND ui.created_at > NOW() - INTERVAL '1 hour' -- Consider recent interactions
    ON CONFLICT (primary_listing_id, related_listing_id) DO UPDATE SET
        co_interaction_count = listing_co_interactions.co_interaction_count + 1,
        co_interaction_score = listing_co_interactions.co_interaction_score + 1.0,
        last_calculated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to record search history
CREATE OR REPLACE FUNCTION record_search_history(
    p_user_id UUID,
    p_search_query TEXT,
    p_search_filters JSONB DEFAULT '{}',
    p_results_count INTEGER DEFAULT 0,
    p_clicked_listings JSONB DEFAULT '[]'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO search_history (user_id, search_query, search_filters, results_count, clicked_listings)
    VALUES (p_user_id, p_search_query, p_search_filters, p_results_count, p_clicked_listings);
END;
$$ LANGUAGE plpgsql;

-- Function to get boosted listings
CREATE OR REPLACE FUNCTION get_boosted_listings(
    p_boost_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    status VARCHAR(20),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100),
    boost_type VARCHAR(20),
    boost_weight DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        l.views_count,
        l.created_at,
        l.updated_at,
        l.user_id,
        l.status,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        c.name::VARCHAR(100) as category_name,
        bl.boost_type::VARCHAR(20),
        bl.boost_weight
    FROM boosted_listings bl
    JOIN listings l ON bl.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE bl.is_active = true 
      AND bl.boost_until > NOW()
      AND (p_boost_type IS NULL OR bl.boost_type = p_boost_type)
    ORDER BY bl.boost_weight DESC, l.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recently viewed items
CREATE OR REPLACE FUNCTION get_recently_viewed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    status VARCHAR(20),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100),
    viewed_at TIMESTAMP WITH TIME ZONE,
    view_duration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        l.views_count,
        l.created_at,
        l.updated_at,
        l.user_id,
        l.status,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        c.name::VARCHAR(100) as category_name,
        rv.viewed_at,
        rv.view_duration
    FROM recently_viewed rv
    JOIN listings l ON rv.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE rv.user_id = p_user_id
    ORDER BY rv.viewed_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending listings near user
CREATE OR REPLACE FUNCTION get_trending_near_user(
    p_user_id UUID,
    p_user_location VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    status VARCHAR(20),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100),
    trending_score DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        l.views_count,
        l.created_at,
        l.updated_at,
        l.user_id,
        l.status,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        c.name::VARCHAR(100) as category_name,
        lp.trending_score
    FROM listing_popularity lp
    JOIN listings l ON lp.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.status = 'active'
      AND l.user_id != p_user_id -- Exclude user's own listings
      AND (p_user_location IS NULL OR l.location ILIKE '%' || p_user_location || '%') -- Basic location filter
      AND lp.last_calculated > NOW() - INTERVAL '24 hours' -- Recently trending
    ORDER BY lp.trending_score DESC, lp.last_calculated DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get personalized recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    status VARCHAR(20),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100),
    recommendation_score DECIMAL(10,2),
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH UserCategoryScores AS (
        SELECT
            up.category_id,
            up.preference_score
        FROM user_preferences up
        WHERE up.user_id = p_user_id
    ),
    RankedListings AS (
        SELECT
            l.id as listing_id,
            l.title,
            l.price,
            l.currency,
            l.images,
            l.location,
            l.views_count,
            l.created_at,
            l.updated_at,
            l.user_id,
            l.status,
            l.boost_until,
            l.spotlight_until,
            l.urgent_until,
            l.highlight_until,
            COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
            p.avatar_url::TEXT as seller_avatar,
            c.name::VARCHAR(100) as category_name,
            (COALESCE(ucs.preference_score, 0) * 0.6 + COALESCE(lp.popularity_score, 0) * 0.4) AS score,
            CASE
                WHEN ucs.category_id IS NOT NULL THEN 'category_preference'
                ELSE 'general'
            END AS reason,
            ROW_NUMBER() OVER (PARTITION BY ucs.category_id ORDER BY (COALESCE(ucs.preference_score, 0) * 0.6 + COALESCE(lp.popularity_score, 0) * 0.4) DESC, l.created_at DESC) as rn
        FROM listings l
        LEFT JOIN UserCategoryScores ucs ON l.category_id = ucs.category_id
        LEFT JOIN listing_popularity lp ON l.id = lp.listing_id
        LEFT JOIN profiles p ON l.user_id = p.id
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.status = 'active'
          AND l.user_id != p_user_id -- Exclude user's own listings
          AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.user_id = p_user_id AND ui.listing_id = l.id AND ui.interaction_type IN ('purchase', 'favorite', 'view')) -- Exclude already interacted
    )
    SELECT
        rl.listing_id,
        rl.title,
        rl.price,
        rl.currency,
        rl.images,
        rl.location,
        rl.views_count,
        rl.created_at,
        rl.updated_at,
        rl.user_id,
        rl.status,
        rl.boost_until,
        rl.spotlight_until,
        rl.urgent_until,
        rl.highlight_until,
        rl.seller_name,
        rl.seller_avatar,
        rl.category_name,
        rl.score as recommendation_score,
        rl.reason as recommendation_reason
    FROM RankedListings rl
    WHERE rl.rn <= 5 -- Limit to top 5 per category for diversity
    ORDER BY rl.score DESC, rl.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaborative recommendations
CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
    p_user_id UUID,
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    status VARCHAR(20),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100),
    co_interaction_score DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id as listing_id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        l.views_count,
        l.created_at,
        l.updated_at,
        l.user_id,
        l.status,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        c.name::VARCHAR(100) as category_name,
        lci.co_interaction_score
    FROM listing_co_interactions lci
    JOIN listings l ON lci.related_listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE lci.primary_listing_id = p_listing_id
      AND l.status = 'active'
      AND l.user_id != p_user_id -- Exclude user's own listings
      AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.user_id = p_user_id AND ui.listing_id = l.id AND ui.interaction_type IN ('purchase', 'favorite', 'view')) -- Exclude already interacted
    ORDER BY lci.co_interaction_score DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get category-based recommendations
CREATE OR REPLACE FUNCTION get_category_recommendations(
    p_user_id UUID,
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    views_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    status VARCHAR(20),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100)
) AS $$
DECLARE
    v_category_id UUID;
BEGIN
    SELECT category_id INTO v_category_id FROM listings WHERE id = p_listing_id;

    IF v_category_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        l.id as listing_id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        l.views_count,
        l.created_at,
        l.updated_at,
        l.user_id,
        l.status,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        c.name::VARCHAR(100) as category_name
    FROM listings l
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.category_id = v_category_id
      AND l.id != p_listing_id -- Exclude the current listing
      AND l.status = 'active'
      AND l.user_id != p_user_id -- Exclude user's own listings
      AND NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.user_id = p_user_id AND ui.listing_id = l.id AND ui.interaction_type IN ('purchase', 'favorite', 'view')) -- Exclude already interacted
    ORDER BY l.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    suggestion TEXT,
    type VARCHAR(50),
    score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    -- Suggestions from recent search history
    SELECT
        sh.search_query AS suggestion,
        'history' AS type,
        1.0 AS score
    FROM search_history sh
    WHERE sh.user_id = p_user_id
      AND sh.search_query ILIKE p_query || '%'
    ORDER BY sh.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify functions were created
SELECT 'All recommendation functions created successfully' as status;
