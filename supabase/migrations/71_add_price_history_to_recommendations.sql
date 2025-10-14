-- Migration 71: Add previous_price and price_changed_at to recommendation functions
-- This ensures price drop indicators appear on all recommendation cards

-- =============================================
-- 1. UPDATE get_boosted_listings
-- =============================================

DROP FUNCTION IF EXISTS get_boosted_listings(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_boosted_listings(
    p_boost_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    previous_price DECIMAL(10,2),
    price_changed_at TIMESTAMP WITH TIME ZONE,
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
    boost_weight DECIMAL(5,2),
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.previous_price,
        l.price_changed_at,
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
        bl.boost_weight,
        CASE 
            WHEN us.status IN ('active', 'trialing', 'cancelled')
                AND sp.name = 'Sellar Pro'
                AND (us.current_period_end > NOW() OR us.current_period_end IS NULL)
            THEN TRUE
            ELSE FALSE
        END as is_sellar_pro,
        us.status as subscription_status,
        sp.name as subscription_plan_name,
        us.current_period_end as subscription_end
    FROM boosted_listings bl
    JOIN listings l ON bl.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE bl.is_active = true 
    AND bl.boost_until > NOW()
    AND l.status = 'active'
    AND (p_boost_type IS NULL OR bl.boost_type = p_boost_type)
    ORDER BY bl.boost_weight DESC, bl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. UPDATE get_recently_viewed
-- =============================================

DROP FUNCTION IF EXISTS get_recently_viewed(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_recently_viewed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    previous_price DECIMAL(10,2),
    price_changed_at TIMESTAMP WITH TIME ZONE,
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    user_id UUID,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    status VARCHAR(20),
    viewed_at TIMESTAMP WITH TIME ZONE,
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.previous_price,
        l.price_changed_at,
        l.currency,
        l.images,
        l.location,
        c.name::VARCHAR(100) as category_name,
        NULL::VARCHAR(100) as subcategory_name,
        l.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        l.status,
        lv.created_at as viewed_at,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        CASE 
            WHEN us.status IN ('active', 'trialing', 'cancelled')
                AND sp.name = 'Sellar Pro'
                AND (us.current_period_end > NOW() OR us.current_period_end IS NULL)
            THEN TRUE
            ELSE FALSE
        END as is_sellar_pro,
        us.status as subscription_status,
        sp.name as subscription_plan_name,
        us.current_period_end as subscription_end
    FROM listing_views lv
    JOIN listings l ON lv.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE lv.user_id = p_user_id
    AND l.status = 'active'
    ORDER BY lv.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. UPDATE get_trending_near_user
-- =============================================

DROP FUNCTION IF EXISTS get_trending_near_user(VARCHAR, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_trending_near_user(
    p_user_location VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    previous_price DECIMAL(10,2),
    price_changed_at TIMESTAMP WITH TIME ZONE,
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    user_id UUID,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    status VARCHAR(20),
    trending_score DECIMAL(10,2),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.previous_price,
        l.price_changed_at,
        l.currency,
        l.images,
        l.location,
        c.name::VARCHAR(100) as category_name,
        NULL::VARCHAR(100) as subcategory_name,
        l.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        l.status,
        (
            (COALESCE(l.views_count, 0) * 1.0) +
            (COALESCE(l.favorites_count, 0) * 2.0) +
            (CASE WHEN l.created_at > NOW() - INTERVAL '7 days' THEN 3.0 ELSE 0.0 END) +
            (CASE WHEN l.boost_until IS NOT NULL AND l.boost_until > NOW() THEN 2.0 ELSE 0.0 END)
        )::DECIMAL(10,2) as trending_score,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        CASE 
            WHEN us.status IN ('active', 'trialing', 'cancelled')
                AND sp.name = 'Sellar Pro'
                AND (us.current_period_end > NOW() OR us.current_period_end IS NULL)
            THEN TRUE
            ELSE FALSE
        END as is_sellar_pro,
        us.status as subscription_status,
        sp.name as subscription_plan_name,
        us.current_period_end as subscription_end
    FROM listings l
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE l.status = 'active'
    AND (p_user_location IS NULL OR l.location ILIKE '%' || p_user_location || '%')
    ORDER BY trending_score DESC, l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. UPDATE get_personalized_recommendations
-- =============================================

DROP FUNCTION IF EXISTS get_personalized_recommendations(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    previous_price DECIMAL(10,2),
    price_changed_at TIMESTAMP WITH TIME ZONE,
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    user_id UUID,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    status VARCHAR(20),
    recommendation_score DECIMAL(10,2),
    recommendation_reason VARCHAR(255),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.previous_price,
        l.price_changed_at,
        l.currency,
        l.images,
        l.location,
        c.name::VARCHAR(100) as category_name,
        NULL::VARCHAR(100) as subcategory_name,
        l.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        l.status,
        (
            (CASE WHEN l.category_id IN (
                SELECT DISTINCT l2.category_id FROM listing_views lv2 
                JOIN listings l2 ON lv2.listing_id = l2.id 
                WHERE lv2.user_id = p_user_id
            ) THEN 2.0 ELSE 0.0 END) +
            (CASE WHEN l.created_at > NOW() - INTERVAL '7 days' THEN 1.0 ELSE 0.0 END) +
            (CASE WHEN l.boost_until IS NOT NULL AND l.boost_until > NOW() THEN 1.0 ELSE 0.0 END)
        )::DECIMAL(10,2) as recommendation_score,
        'Based on your browsing history'::VARCHAR(255) as recommendation_reason,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        CASE 
            WHEN us.status IN ('active', 'trialing', 'cancelled')
                AND sp.name = 'Sellar Pro'
                AND (us.current_period_end > NOW() OR us.current_period_end IS NULL)
            THEN TRUE
            ELSE FALSE
        END as is_sellar_pro,
        us.status as subscription_status,
        sp.name as subscription_plan_name,
        us.current_period_end as subscription_end
    FROM listings l
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE l.status = 'active'
    AND l.user_id != p_user_id
    ORDER BY recommendation_score DESC, l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. UPDATE get_category_recommendations
-- =============================================

DROP FUNCTION IF EXISTS get_category_recommendations(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_category_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    previous_price DECIMAL(10,2),
    price_changed_at TIMESTAMP WITH TIME ZONE,
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    user_id UUID,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    status VARCHAR(20),
    similarity_score DECIMAL(10,2),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_category_id UUID;
BEGIN
    SELECT category_id INTO v_category_id
    FROM listings
    WHERE id = p_listing_id;

    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.previous_price,
        l.price_changed_at,
        l.currency,
        l.images,
        l.location,
        c.name::VARCHAR(100) as category_name,
        NULL::VARCHAR(100) as subcategory_name,
        l.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        l.status,
        (
            (CASE WHEN l.category_id = v_category_id THEN 2.0 ELSE 0.0 END)
        )::DECIMAL(10,2) as similarity_score,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        CASE 
            WHEN us.status IN ('active', 'trialing', 'cancelled')
                AND sp.name = 'Sellar Pro'
                AND (us.current_period_end > NOW() OR us.current_period_end IS NULL)
            THEN TRUE
            ELSE FALSE
        END as is_sellar_pro,
        us.status as subscription_status,
        sp.name as subscription_plan_name,
        us.current_period_end as subscription_end
    FROM listings l
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE l.status = 'active'
    AND l.id != p_listing_id
    AND l.category_id = v_category_id
    ORDER BY similarity_score DESC, l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. UPDATE get_collaborative_recommendations
-- =============================================

DROP FUNCTION IF EXISTS get_collaborative_recommendations(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(10,2),
    previous_price DECIMAL(10,2),
    price_changed_at TIMESTAMP WITH TIME ZONE,
    currency VARCHAR(3),
    images JSONB,
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    user_id UUID,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    status VARCHAR(20),
    co_interaction_score DECIMAL(10,2),
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.previous_price,
        l.price_changed_at,
        l.currency,
        l.images,
        l.location,
        c.name::VARCHAR(100) as category_name,
        NULL::VARCHAR(100) as subcategory_name,
        l.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        l.status,
        COUNT(DISTINCT lv.user_id)::DECIMAL(10,2) as co_interaction_score,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        CASE 
            WHEN us.status IN ('active', 'trialing', 'cancelled')
                AND sp.name = 'Sellar Pro'
                AND (us.current_period_end > NOW() OR us.current_period_end IS NULL)
            THEN TRUE
            ELSE FALSE
        END as is_sellar_pro,
        us.status as subscription_status,
        sp.name as subscription_plan_name,
        us.current_period_end as subscription_end
    FROM listing_views lv
    JOIN listings l ON lv.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE lv.user_id IN (
        SELECT DISTINCT lv2.user_id FROM listing_views lv2 WHERE lv2.listing_id = p_listing_id
    )
    AND l.id != p_listing_id
    AND l.status = 'active'
    GROUP BY l.id, l.title, l.price, l.previous_price, l.price_changed_at, l.currency, l.images, 
             l.location, c.name, l.user_id, p.first_name, p.last_name, p.avatar_url, 
             l.status, l.boost_until, l.spotlight_until, l.urgent_until, l.highlight_until,
             us.status, sp.name, us.current_period_end
    ORDER BY co_interaction_score DESC, l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

