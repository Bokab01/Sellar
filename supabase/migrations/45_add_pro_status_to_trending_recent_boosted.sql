-- Migration 45: Add Sellar Pro status to trending, recently viewed, and boosted listings functions
-- This ensures PRO badges appear on trending and recently viewed screens

-- =============================================
-- 0. DROP EXISTING FUNCTIONS TO ALLOW SIGNATURE CHANGES
-- =============================================

-- Drop all versions of these functions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname IN ('get_boosted_listings', 'get_recently_viewed', 'get_trending_near_user')
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- =============================================
-- 1. UPDATE get_boosted_listings WITH PRO STATUS
-- =============================================

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
    boost_weight DECIMAL(5,2),
    -- ✅ Add Sellar Pro fields
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
        -- ✅ Include Sellar Pro fields from listings_with_pro_status view
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
-- 2. UPDATE get_recently_viewed WITH PRO STATUS
-- =============================================

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
    view_duration INTEGER,
    -- ✅ Add Sellar Pro fields
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
        rv.view_duration,
        -- ✅ Include Sellar Pro fields
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
    FROM recently_viewed rv
    JOIN listings l ON rv.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE rv.user_id = p_user_id
    AND l.status = 'active'
    ORDER BY rv.viewed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. UPDATE get_trending_near_user WITH PRO STATUS
-- =============================================

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
    trending_score DECIMAL(10,2),
    -- ✅ Add Sellar Pro fields
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
        lp.popularity_score::DECIMAL(10,2),
        lp.trending_score::DECIMAL(10,2),
        -- ✅ Include Sellar Pro fields
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
    FROM listing_popularity lp
    JOIN listings l ON lp.listing_id = l.id
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN user_subscriptions us ON l.user_id = us.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE l.status = 'active'
    AND l.user_id != p_user_id
    AND (
        p_user_location IS NULL 
        OR l.location ILIKE '%' || p_user_location || '%'
    )
    AND lp.trending_score > 0
    ORDER BY lp.trending_score DESC, lp.popularity_score DESC, l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. ADD COMMENTS
-- =============================================

COMMENT ON FUNCTION get_boosted_listings IS 'Returns boosted listings including Sellar Pro status for PRO badge display.';
COMMENT ON FUNCTION get_recently_viewed IS 'Returns recently viewed listings including Sellar Pro status for PRO badge display.';
COMMENT ON FUNCTION get_trending_near_user IS 'Returns trending listings near user including Sellar Pro status for PRO badge display.';

