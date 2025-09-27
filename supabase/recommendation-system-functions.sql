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
BEGIN
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

    -- Check if interaction already exists today
    IF EXISTS (
        SELECT 1 FROM user_interactions 
        WHERE user_id = p_user_id 
        AND listing_id = p_listing_id 
        AND interaction_type = p_interaction_type 
        AND created_at::date = CURRENT_DATE
    ) THEN
        -- Update existing interaction with higher weight
        UPDATE user_interactions 
        SET 
            interaction_weight = GREATEST(interaction_weight, v_weight),
            metadata = p_metadata,
            updated_at = NOW()
        WHERE user_id = p_user_id 
        AND listing_id = p_listing_id 
        AND interaction_type = p_interaction_type 
        AND created_at::date = CURRENT_DATE;
    ELSE
        -- Insert new interaction
        INSERT INTO user_interactions (user_id, listing_id, interaction_type, interaction_weight, metadata)
        VALUES (p_user_id, p_listing_id, p_interaction_type, v_weight, p_metadata);
    END IF;

    -- Update recently viewed if it's a view
    IF p_interaction_type = 'view' THEN
        INSERT INTO recently_viewed (user_id, listing_id, viewed_at)
        VALUES (p_user_id, p_listing_id, NOW())
        ON CONFLICT (user_id, listing_id)
        DO UPDATE SET viewed_at = NOW();
    END IF;

    -- Update user preferences
    PERFORM update_user_preferences(p_user_id, p_listing_id, p_interaction_type);
    
    -- Update listing popularity
    PERFORM update_listing_popularity(p_listing_id);
    
    -- Update co-interactions
    PERFORM update_co_interactions(p_user_id, p_listing_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
    p_user_id UUID,
    p_listing_id UUID,
    p_interaction_type VARCHAR(20)
) RETURNS VOID AS $$
DECLARE
    v_listing RECORD;
    v_weight DECIMAL(3,2);
BEGIN
    -- Get listing details
    SELECT category_id INTO v_listing
    FROM listings
    WHERE id = p_listing_id;

    -- Set preference weight
    v_weight := CASE p_interaction_type
        WHEN 'purchase' THEN 5.0
        WHEN 'offer' THEN 3.0
        WHEN 'favorite' THEN 2.0
        WHEN 'contact' THEN 2.0
        WHEN 'share' THEN 1.5
        WHEN 'view' THEN 1.0
        ELSE 1.0
    END;

    -- Update category preference
    IF v_listing.category_id IS NOT NULL THEN
        INSERT INTO user_preferences (user_id, category_id, preference_score, interaction_count, last_interaction)
        VALUES (p_user_id, v_listing.category_id, v_weight, 1, NOW())
        ON CONFLICT (user_id, category_id)
        DO UPDATE SET
            preference_score = user_preferences.preference_score + v_weight,
            interaction_count = user_preferences.interaction_count + 1,
            last_interaction = NOW(),
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update listing popularity
CREATE OR REPLACE FUNCTION update_listing_popularity(p_listing_id UUID) RETURNS VOID AS $$
DECLARE
    v_popularity_score DECIMAL(10,2);
    v_trending_score DECIMAL(10,2);
    v_counts RECORD;
BEGIN
    -- Get interaction counts
    SELECT 
        COUNT(CASE WHEN interaction_type = 'view' THEN 1 END) as view_count,
        COUNT(CASE WHEN interaction_type = 'favorite' THEN 1 END) as favorite_count,
        COUNT(CASE WHEN interaction_type = 'offer' THEN 1 END) as offer_count,
        COUNT(CASE WHEN interaction_type = 'purchase' THEN 1 END) as purchase_count,
        COUNT(CASE WHEN interaction_type = 'share' THEN 1 END) as share_count,
        COUNT(CASE WHEN interaction_type = 'contact' THEN 1 END) as contact_count
    INTO v_counts
    FROM user_interactions
    WHERE listing_id = p_listing_id;

    -- Calculate popularity score (weighted sum)
    v_popularity_score := 
        (v_counts.view_count * 1.0) +
        (v_counts.favorite_count * 2.0) +
        (v_counts.offer_count * 3.0) +
        (v_counts.purchase_count * 5.0) +
        (v_counts.share_count * 1.5) +
        (v_counts.contact_count * 2.0);

    -- Calculate trending score (recent activity weighted)
    SELECT 
        SUM(
            CASE 
                WHEN created_at > NOW() - INTERVAL '24 hours' THEN interaction_weight * 3.0
                WHEN created_at > NOW() - INTERVAL '7 days' THEN interaction_weight * 2.0
                WHEN created_at > NOW() - INTERVAL '30 days' THEN interaction_weight * 1.0
                ELSE interaction_weight * 0.5
            END
        )
    INTO v_trending_score
    FROM user_interactions
    WHERE listing_id = p_listing_id;

    -- Insert or update popularity record
    INSERT INTO listing_popularity (
        listing_id, popularity_score, trending_score,
        view_count, favorite_count, offer_count, purchase_count, share_count, contact_count
    )
    VALUES (
        p_listing_id, v_popularity_score, COALESCE(v_trending_score, 0),
        v_counts.view_count, v_counts.favorite_count, v_counts.offer_count,
        v_counts.purchase_count, v_counts.share_count, v_counts.contact_count
    )
    ON CONFLICT (listing_id)
    DO UPDATE SET
        popularity_score = v_popularity_score,
        trending_score = COALESCE(v_trending_score, 0),
        view_count = v_counts.view_count,
        favorite_count = v_counts.favorite_count,
        offer_count = v_counts.offer_count,
        purchase_count = v_counts.purchase_count,
        share_count = v_counts.share_count,
        contact_count = v_counts.contact_count,
        last_calculated = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update co-interactions
CREATE OR REPLACE FUNCTION update_co_interactions(
    p_user_id UUID,
    p_listing_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Find other listings this user has interacted with
    INSERT INTO listing_co_interactions (primary_listing_id, related_listing_id, co_interaction_count, co_interaction_score)
    SELECT 
        p_listing_id,
        ui2.listing_id,
        1,
        1.0
    FROM user_interactions ui2
    WHERE ui2.user_id = p_user_id 
    AND ui2.listing_id != p_listing_id
    AND ui2.created_at > NOW() - INTERVAL '30 days'
    ON CONFLICT (primary_listing_id, related_listing_id)
    DO UPDATE SET
        co_interaction_count = listing_co_interactions.co_interaction_count + 1,
        co_interaction_score = listing_co_interactions.co_interaction_score + 1.0,
        last_calculated = NOW(),
        updated_at = NOW();
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
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    recommendation_score DECIMAL(10,2),
    recommendation_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_prefs AS (
        SELECT category_id, preference_score
        FROM user_preferences
        WHERE user_id = p_user_id
        ORDER BY preference_score DESC
        LIMIT 10
    ),
    user_interactions_listings AS (
        SELECT DISTINCT listing_id
        FROM user_interactions
        WHERE user_id = p_user_id
    ),
    boosted_listings AS (
        SELECT listing_id, boost_weight
        FROM boosted_listings
        WHERE is_active = true AND boost_until > NOW()
    )
    SELECT 
        l.id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        c.name as category_name,
        sc.name as subcategory_name,
        (
            COALESCE(up.preference_score, 0) * 0.4 +
            COALESCE(lp.popularity_score, 0) * 0.3 +
            COALESCE(lp.trending_score, 0) * 0.2 +
            COALESCE(bl.boost_weight, 1.0) * 0.1
        ) as recommendation_score,
        CASE 
            WHEN up.preference_score > 0 THEN 'Based on your preferences'
            WHEN lp.trending_score > 0 THEN 'Trending in your area'
            WHEN bl.boost_weight > 1.0 THEN 'Featured listing'
            ELSE 'Popular in your area'
        END as recommendation_reason
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
    LEFT JOIN user_prefs up ON (l.category_id = up.category_id OR l.subcategory_id = up.subcategory_id)
    LEFT JOIN listing_popularity lp ON l.id = lp.listing_id
    LEFT JOIN boosted_listings bl ON l.id = bl.listing_id
    WHERE l.status = 'active'
    AND l.id NOT IN (SELECT listing_id FROM user_interactions_listings)
    AND l.user_id != p_user_id
    ORDER BY recommendation_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending listings near user
CREATE OR REPLACE FUNCTION get_trending_near_user(
    p_user_id UUID,
    p_user_location VARCHAR(255),
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    trending_score DECIMAL(10,2),
    distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH boosted_listings AS (
        SELECT listing_id, boost_weight
        FROM boosted_listings
        WHERE is_active = true AND boost_until > NOW()
    )
    SELECT 
        l.id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        c.name as category_name,
        sc.name as subcategory_name,
        (COALESCE(lp.trending_score, 0) * COALESCE(bl.boost_weight, 1.0)) as trending_score,
        -- Simple distance calculation (you might want to use PostGIS for more accuracy)
        CASE 
            WHEN l.location = p_user_location THEN 0.0
            ELSE 5.0 -- Placeholder distance
        END as distance_km
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
    LEFT JOIN listing_popularity lp ON l.id = lp.listing_id
    LEFT JOIN boosted_listings bl ON l.id = bl.listing_id
    WHERE l.status = 'active'
    AND l.user_id != p_user_id
    AND (p_user_location IS NULL OR l.location ILIKE '%' || p_user_location || '%')
    ORDER BY trending_score DESC, distance_km ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get category-based recommendations
CREATE OR REPLACE FUNCTION get_category_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    similarity_score DECIMAL(10,2)
) AS $$
DECLARE
    v_listing RECORD;
BEGIN
    -- Get the source listing details
    SELECT category_id, subcategory_id INTO v_listing
    FROM listings
    WHERE id = p_listing_id;

    RETURN QUERY
    WITH boosted_listings AS (
        SELECT listing_id, boost_weight
        FROM boosted_listings
        WHERE is_active = true AND boost_until > NOW()
    )
    SELECT 
        l.id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        c.name as category_name,
        sc.name as subcategory_name,
        (
            CASE 
                WHEN l.subcategory_id = v_listing.subcategory_id THEN 3.0
                WHEN l.category_id = v_listing.category_id THEN 2.0
                ELSE 1.0
            END * COALESCE(bl.boost_weight, 1.0)
        ) as similarity_score
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
    LEFT JOIN boosted_listings bl ON l.id = bl.listing_id
    WHERE l.status = 'active'
    AND l.id != p_listing_id
    AND (l.category_id = v_listing.category_id OR l.subcategory_id = v_listing.subcategory_id)
    ORDER BY similarity_score DESC, l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
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
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    viewed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        c.name as category_name,
        sc.name as subcategory_name,
        rv.viewed_at
    FROM recently_viewed rv
    JOIN listings l ON rv.listing_id = l.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
    WHERE rv.user_id = p_user_id
    AND l.status = 'active'
    ORDER BY rv.viewed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaborative filtering recommendations
CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    co_interaction_score DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH boosted_listings AS (
        SELECT listing_id, boost_weight
        FROM boosted_listings
        WHERE is_active = true AND boost_until > NOW()
    )
    SELECT 
        l.id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        c.name as category_name,
        sc.name as subcategory_name,
        (lci.co_interaction_score * COALESCE(bl.boost_weight, 1.0)) as co_interaction_score
    FROM listing_co_interactions lci
    JOIN listings l ON lci.related_listing_id = l.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
    LEFT JOIN boosted_listings bl ON l.id = bl.listing_id
    WHERE lci.primary_listing_id = p_listing_id
    AND l.status = 'active'
    ORDER BY co_interaction_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get boosted listings
CREATE OR REPLACE FUNCTION get_boosted_listings(
    p_boost_type VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    boost_weight DECIMAL(5,2),
    boost_type VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.price,
        l.currency,
        l.images,
        l.location,
        c.name as category_name,
        sc.name as subcategory_name,
        bl.boost_weight,
        bl.boost_type
    FROM boosted_listings bl
    JOIN listings l ON bl.listing_id = l.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
    WHERE bl.is_active = true 
    AND bl.boost_until > NOW()
    AND (p_boost_type IS NULL OR bl.boost_type = p_boost_type)
    AND l.status = 'active'
    ORDER BY bl.boost_weight DESC, bl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get search suggestions based on history
CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_user_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    suggestion TEXT,
    frequency INTEGER,
    last_searched TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.search_query as suggestion,
        COUNT(*)::INTEGER as frequency,
        MAX(sh.created_at) as last_searched
    FROM search_history sh
    WHERE sh.user_id = p_user_id
    AND sh.search_query ILIKE '%' || p_query || '%'
    GROUP BY sh.search_query
    ORDER BY frequency DESC, last_searched DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
