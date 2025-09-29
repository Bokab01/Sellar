-- =============================================
-- RECOMMENDATION SYSTEM FUNCTIONS
-- =============================================

-- Function to track user interactions
CREATE OR REPLACE FUNCTION track_user_interaction(
    p_user_id UUID,
    p_listing_id UUID,
    p_interaction_type VARCHAR(20),
    p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
    v_weight DECIMAL(3,2);
    v_listing_owner_id UUID;
BEGIN
    -- Get the listing owner to check if user is viewing their own listing
    SELECT user_id INTO v_listing_owner_id FROM listings WHERE id = p_listing_id;
    
    -- Don't track interactions with user's own listings
    IF v_listing_owner_id = p_user_id THEN
        RETURN;
    END IF;

    -- Set interaction weights
    v_weight := CASE p_interaction_type
        WHEN 'purchase' THEN 5.0
        WHEN 'offer' THEN 3.0
        WHEN 'favorite' THEN 2.0
        WHEN 'contact' THEN 2.0
        WHEN 'share' THEN 1.5
        WHEN 'view' THEN 1.0
        ELSE 1.0
    END;

    -- Check if interaction already exists today and update or insert accordingly
    BEGIN
        -- Try to update existing interaction first
        UPDATE user_interactions 
        SET 
            interaction_weight = GREATEST(interaction_weight, v_weight),
            metadata = p_metadata,
            updated_at = NOW()
        WHERE user_id = p_user_id 
        AND listing_id = p_listing_id 
        AND interaction_type = p_interaction_type 
        AND created_at::date = CURRENT_DATE;
        
        -- If no rows were updated, insert new interaction
        IF NOT FOUND THEN
            INSERT INTO user_interactions (user_id, listing_id, interaction_type, interaction_weight, metadata)
            VALUES (p_user_id, p_listing_id, p_interaction_type, v_weight, p_metadata);
        END IF;
    EXCEPTION
        WHEN unique_violation THEN
            -- If there's still a unique violation, try to update again
            UPDATE user_interactions 
            SET 
                interaction_weight = GREATEST(interaction_weight, v_weight),
                metadata = p_metadata,
                updated_at = NOW()
            WHERE user_id = p_user_id 
            AND listing_id = p_listing_id 
            AND interaction_type = p_interaction_type 
            AND created_at::date = CURRENT_DATE;
    END;

    -- Update recently viewed if it's a view
    IF p_interaction_type = 'view' THEN
        INSERT INTO recently_viewed (user_id, listing_id, view_duration)
        VALUES (p_user_id, p_listing_id, COALESCE((p_metadata->>'timeSpent')::INTEGER, 0))
        ON CONFLICT (user_id, listing_id) 
        DO UPDATE SET 
            viewed_at = NOW(),
            view_duration = COALESCE((p_metadata->>'timeSpent')::INTEGER, recently_viewed.view_duration);
    END IF;

    -- Update user preferences
    PERFORM update_user_preferences(p_user_id, p_listing_id, p_interaction_type, v_weight);
    
    -- Update listing popularity
    PERFORM update_listing_popularity(p_listing_id, p_interaction_type, v_weight);
    
    -- Update co-interactions (temporarily disabled to prevent conflicts)
    -- PERFORM update_listing_co_interactions(p_user_id, p_listing_id, p_interaction_type);
END;
$$ LANGUAGE plpgsql;

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
    v_popularity_increment DECIMAL(10,2);
    v_trending_increment DECIMAL(10,2);
BEGIN
    -- Calculate increments
    v_popularity_increment := p_weight * 10.0;
    v_trending_increment := p_weight * 5.0;

    -- Update or insert listing popularity
    INSERT INTO listing_popularity (listing_id, popularity_score, trending_score, view_count, favorite_count, offer_count, purchase_count, share_count, contact_count)
    VALUES (
        p_listing_id, 
        v_popularity_increment, 
        v_trending_increment,
        CASE WHEN p_interaction_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'favorite' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'offer' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'purchase' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'share' THEN 1 ELSE 0 END,
        CASE WHEN p_interaction_type = 'contact' THEN 1 ELSE 0 END
    )
    ON CONFLICT (listing_id) 
    DO UPDATE SET 
        popularity_score = listing_popularity.popularity_score + v_popularity_increment,
        trending_score = listing_popularity.trending_score + v_trending_increment,
        view_count = listing_popularity.view_count + CASE WHEN p_interaction_type = 'view' THEN 1 ELSE 0 END,
        favorite_count = listing_popularity.favorite_count + CASE WHEN p_interaction_type = 'favorite' THEN 1 ELSE 0 END,
        offer_count = listing_popularity.offer_count + CASE WHEN p_interaction_type = 'offer' THEN 1 ELSE 0 END,
        purchase_count = listing_popularity.purchase_count + CASE WHEN p_interaction_type = 'purchase' THEN 1 ELSE 0 END,
        share_count = listing_popularity.share_count + CASE WHEN p_interaction_type = 'share' THEN 1 ELSE 0 END,
        contact_count = listing_popularity.contact_count + CASE WHEN p_interaction_type = 'contact' THEN 1 ELSE 0 END,
        last_calculated = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update co-interactions
CREATE OR REPLACE FUNCTION update_listing_co_interactions(
    p_user_id UUID,
    p_listing_id UUID,
    p_interaction_type VARCHAR(20)
) RETURNS VOID AS $$
DECLARE
    v_related_listing_id UUID;
    v_co_interaction_increment INTEGER;
BEGIN
    -- Only process for meaningful interactions
    IF p_interaction_type NOT IN ('view', 'favorite', 'offer', 'purchase') THEN
        RETURN;
    END IF;

    v_co_interaction_increment := CASE p_interaction_type
        WHEN 'purchase' THEN 3
        WHEN 'offer' THEN 2
        WHEN 'favorite' THEN 2
        WHEN 'view' THEN 1
        ELSE 1
    END;

    -- Find other listings this user has interacted with
    FOR v_related_listing_id IN 
        SELECT DISTINCT listing_id 
        FROM user_interactions 
        WHERE user_id = p_user_id 
        AND listing_id != p_listing_id
        AND interaction_type IN ('view', 'favorite', 'offer', 'purchase')
        AND created_at > NOW() - INTERVAL '30 days'
    LOOP
        -- Update co-interaction score
        INSERT INTO listing_co_interactions (primary_listing_id, related_listing_id, co_interaction_count, co_interaction_score)
        VALUES (p_listing_id, v_related_listing_id, v_co_interaction_increment, v_co_interaction_increment * 0.5)
        ON CONFLICT (primary_listing_id, related_listing_id) 
        DO UPDATE SET 
            co_interaction_count = listing_co_interactions.co_interaction_count + v_co_interaction_increment,
            co_interaction_score = listing_co_interactions.co_interaction_score + (v_co_interaction_increment * 0.5),
            last_calculated = NOW(),
            updated_at = NOW();
    END LOOP;
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

-- =============================================
-- RECOMMENDATION QUERY FUNCTIONS
-- =============================================

-- 1. get_boosted_listings function
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
    AND l.status = 'active'
    AND (p_boost_type IS NULL OR bl.boost_type = p_boost_type)
    ORDER BY bl.boost_weight DESC, bl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 2. get_recently_viewed function
CREATE OR REPLACE FUNCTION get_recently_viewed(
    p_user_id UUID,
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
    AND l.status = 'active'
    ORDER BY rv.viewed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 3. get_trending_near_user function
CREATE OR REPLACE FUNCTION get_trending_near_user(
    p_user_id UUID,
    p_user_location VARCHAR DEFAULT NULL,
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
    popularity_score DECIMAL(10,2),
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
        lp.popularity_score,
        lp.trending_score
    FROM listing_popularity lp
    JOIN listings l ON lp.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.status = 'active'
    AND l.user_id != p_user_id
    AND (p_user_location IS NULL OR l.location ILIKE '%' || p_user_location || '%')
    ORDER BY lp.trending_score DESC, lp.popularity_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 4. get_personalized_recommendations function
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
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
    recommendation_score DECIMAL(10,2),
    recommendation_reason VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    WITH user_preferences AS (
        SELECT 
            up.category_id,
            up.preference_score,
            ROW_NUMBER() OVER (ORDER BY up.preference_score DESC) as rank
        FROM user_preferences up
        WHERE up.user_id = p_user_id
        ORDER BY up.preference_score DESC
        LIMIT 5
    ),
    recommended_listings AS (
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
            CASE 
                WHEN up.preference_score IS NOT NULL THEN up.preference_score * 0.7
                ELSE 0.3
            END as recommendation_score,
            CASE 
                WHEN up.preference_score IS NOT NULL THEN 'category_preference'::VARCHAR(50)
                ELSE 'general'::VARCHAR(50)
            END as recommendation_reason
        FROM listings l
        LEFT JOIN profiles p ON l.user_id = p.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN user_preferences up ON l.category_id = up.category_id
        WHERE l.status = 'active'
        AND l.user_id != p_user_id
        AND NOT EXISTS (
            SELECT 1 FROM recently_viewed rv 
            WHERE rv.user_id = p_user_id 
            AND rv.listing_id = l.id
            AND rv.viewed_at > NOW() - INTERVAL '1 day'
        )
    )
    SELECT * FROM recommended_listings
    ORDER BY recommendation_score DESC, created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 5. get_collaborative_recommendations function
CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
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
    ORDER BY lci.co_interaction_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 6. get_category_recommendations function
CREATE OR REPLACE FUNCTION get_category_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
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
    category_name VARCHAR(100)
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
        c.name::VARCHAR(100) as category_name
    FROM listings l
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.category_id = (
        SELECT category_id FROM listings WHERE listings.id = p_listing_id
    )
    AND l.status = 'active'
    AND l.id != p_listing_id
    ORDER BY l.views_count DESC, l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 7. get_search_suggestions function
CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion_id UUID,
    suggestion_text TEXT,
    suggestion_type VARCHAR(20),
    relevance_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH search_suggestions AS (
        -- Recent searches
        SELECT 
            sh.id::UUID as suggestion_id,
            sh.search_query as suggestion_text,
            'recent_search'::VARCHAR(20) as suggestion_type,
            1.0::DECIMAL(5,2) as relevance_score
        FROM search_history sh
        WHERE sh.user_id = p_user_id
        AND sh.search_query ILIKE '%' || p_query || '%'
        AND sh.created_at > NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        -- Popular listings
        SELECT 
            l.id as suggestion_id,
            l.title as suggestion_text,
            'listing'::VARCHAR(20) as suggestion_type,
            (lp.popularity_score / 100.0)::DECIMAL(5,2) as relevance_score
        FROM listings l
        JOIN listing_popularity lp ON l.id = lp.listing_id
        WHERE l.title ILIKE '%' || p_query || '%'
        AND l.status = 'active'
        
        UNION ALL
        
        -- Categories
        SELECT 
            c.id as suggestion_id,
            c.name as suggestion_text,
            'category'::VARCHAR(20) as suggestion_type,
            0.8::DECIMAL(5,2) as relevance_score
        FROM categories c
        WHERE c.name ILIKE '%' || p_query || '%'
        AND c.is_active = true
    )
    SELECT * FROM search_suggestions
    ORDER BY relevance_score DESC, suggestion_text
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION track_user_interaction IS 'Tracks user interactions with listings for recommendation algorithms';
COMMENT ON FUNCTION update_user_preferences IS 'Updates user preferences based on interaction patterns';
COMMENT ON FUNCTION update_listing_popularity IS 'Updates listing popularity and trending scores';
COMMENT ON FUNCTION update_listing_co_interactions IS 'Updates collaborative filtering data';
COMMENT ON FUNCTION record_search_history IS 'Records user search queries for personalization';
COMMENT ON FUNCTION get_boosted_listings IS 'Returns boosted/sponsored listings with enhanced visibility';
COMMENT ON FUNCTION get_recently_viewed IS 'Returns recently viewed items for quick access';
COMMENT ON FUNCTION get_trending_near_user IS 'Returns trending listings near user location';
COMMENT ON FUNCTION get_personalized_recommendations IS 'Returns personalized recommendations based on user preferences';
COMMENT ON FUNCTION get_collaborative_recommendations IS 'Returns collaborative filtering recommendations';
COMMENT ON FUNCTION get_category_recommendations IS 'Returns category-based recommendations';
COMMENT ON FUNCTION get_search_suggestions IS 'Returns search suggestions based on user history and popular content';