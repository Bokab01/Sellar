-- Migration 44: Update recommendation functions to use listings_with_pro_status view
-- This improves performance by using the pre-computed Sellar Pro status

-- =============================================
-- 0. DROP EXISTING FUNCTIONS (all versions)
-- =============================================

-- Query and drop all versions of each function
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all versions of get_category_recommendations
    FOR func_record IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_category_recommendations'
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.oid::regprocedure;
    END LOOP;
    
    -- Drop all versions of get_collaborative_recommendations
    FOR func_record IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_collaborative_recommendations'
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.oid::regprocedure;
    END LOOP;
    
    -- Drop all versions of get_personalized_recommendations
    FOR func_record IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_personalized_recommendations'
    LOOP
        EXECUTE 'DROP FUNCTION ' || func_record.oid::regprocedure || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.oid::regprocedure;
    END LOOP;
END $$;

-- =============================================
-- 1. CREATE get_category_recommendations WITH NEW SIGNATURE
-- =============================================

CREATE FUNCTION get_category_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(12, 2),
    currency VARCHAR(3),
    images TEXT[],
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    views_count INTEGER,
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    user_id UUID,
    status VARCHAR(20),
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
        CASE 
            WHEN jsonb_typeof(l.images) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(l.images))
            ELSE ARRAY[]::TEXT[]
        END as images,
        l.location,
        l.created_at,
        l.views_count,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        c.name::VARCHAR(100) as category_name,
        NULL::VARCHAR(100) as subcategory_name,
        l.user_id,
        l.status,
        -- ✅ Include Sellar Pro fields from view
        l.is_sellar_pro,
        l.subscription_status,
        l.subscription_plan_name,
        l.subscription_end
    FROM listings_with_pro_status l  -- ✅ Use optimized view instead of listings table
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

-- =============================================
-- 2. CREATE get_collaborative_recommendations WITH NEW SIGNATURE
-- =============================================

CREATE FUNCTION get_collaborative_recommendations(
    p_listing_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(12, 2),
    currency VARCHAR(3),
    images TEXT[],
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    views_count INTEGER,
    co_interaction_score DECIMAL(5,2),
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    category_name VARCHAR(100),
    user_id UUID,
    status VARCHAR(20),
    -- ✅ Add boost feature fields
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    -- ✅ Add Sellar Pro fields
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH co_viewed_listings AS (
        SELECT 
            rv2.listing_id,
            COUNT(*) as co_view_count,
            AVG(EXTRACT(EPOCH FROM (NOW() - rv2.viewed_at)) / 3600)::DECIMAL(5,2) as avg_hours_since_view
        FROM recently_viewed rv1
        JOIN recently_viewed rv2 ON rv1.user_id = rv2.user_id
        WHERE rv1.listing_id = p_listing_id
        AND rv2.listing_id != p_listing_id
        AND rv2.viewed_at > NOW() - INTERVAL '7 days'
        GROUP BY rv2.listing_id
        HAVING COUNT(*) >= 2
    )
    SELECT 
        l.id as listing_id,
        l.title,
        l.price,
        l.currency,
        CASE 
            WHEN jsonb_typeof(l.images) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(l.images))
            ELSE ARRAY[]::TEXT[]
        END as images,
        l.location,
        l.created_at,
        l.views_count,
        (cv.co_view_count::DECIMAL / NULLIF(cv.avg_hours_since_view, 0))::DECIMAL(5,2) as co_interaction_score,
        COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
        p.avatar_url::TEXT as seller_avatar,
        c.name::VARCHAR(100) as category_name,
        l.user_id,
        l.status,
        -- ✅ Include boost feature fields
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        -- ✅ Include Sellar Pro fields from view
        l.is_sellar_pro,
        l.subscription_status,
        l.subscription_plan_name,
        l.subscription_end
    FROM co_viewed_listings cv
    JOIN listings_with_pro_status l ON cv.listing_id = l.id  -- ✅ Use optimized view
    LEFT JOIN profiles p ON l.user_id = p.id
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.status = 'active'
    ORDER BY co_interaction_score DESC, l.views_count DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. CREATE get_personalized_recommendations WITH NEW SIGNATURE
-- =============================================

CREATE FUNCTION get_personalized_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    listing_id UUID,
    title VARCHAR(255),
    price DECIMAL(12, 2),
    currency VARCHAR(3),
    images TEXT[],
    location VARCHAR(255),
    category_name VARCHAR(100),
    subcategory_name VARCHAR(100),
    user_id UUID,
    seller_name VARCHAR(255),
    seller_avatar TEXT,
    status VARCHAR(20),
    trending_score DECIMAL(5,2),
    recommendation_score DECIMAL(5,2),
    recommendation_reason VARCHAR(50),
    -- ✅ Add boost feature fields
    boost_until TIMESTAMP WITH TIME ZONE,
    spotlight_until TIMESTAMP WITH TIME ZONE,
    urgent_until TIMESTAMP WITH TIME ZONE,
    highlight_until TIMESTAMP WITH TIME ZONE,
    -- ✅ Add Sellar Pro fields
    is_sellar_pro BOOLEAN,
    subscription_status VARCHAR(20),
    subscription_plan_name VARCHAR(100),
    subscription_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH recommended_listings AS (
        SELECT 
            l.id as listing_id,
            l.title,
            l.price,
            l.currency,
            CASE 
                WHEN jsonb_typeof(l.images) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(l.images))
                ELSE ARRAY[]::TEXT[]
            END as images,
            l.location,
            c.name::VARCHAR(100) as category_name,
            NULL::VARCHAR(100) as subcategory_name,
            l.user_id,
            COALESCE(p.first_name || ' ' || p.last_name, p.first_name, 'Unknown')::VARCHAR(255) as seller_name,
            p.avatar_url::TEXT as seller_avatar,
            l.status,
            lp.trending_score::DECIMAL(5,2) as trending_score,
            CASE 
                WHEN up.preference_score IS NOT NULL THEN (up.preference_score * 1.5 + lp.trending_score * 0.5)::DECIMAL(5,2)
                ELSE lp.trending_score::DECIMAL(5,2)
            END as recommendation_score,
            CASE 
                WHEN up.preference_score IS NOT NULL THEN 'category_preference'::VARCHAR(50)
                ELSE 'general'::VARCHAR(50)
            END as recommendation_reason,
            -- ✅ Include boost feature fields
            l.boost_until,
            l.spotlight_until,
            l.urgent_until,
            l.highlight_until,
            -- ✅ Include Sellar Pro fields from view
            l.is_sellar_pro,
            l.subscription_status,
            l.subscription_plan_name,
            l.subscription_end,
            l.created_at  -- ✅ Add created_at for ORDER BY
        FROM listings_with_pro_status l  -- ✅ Use optimized view
        LEFT JOIN profiles p ON l.user_id = p.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN user_preferences up ON l.category_id = up.category_id AND up.user_id = p_user_id
        LEFT JOIN listing_popularity lp ON l.id = lp.listing_id
        WHERE l.status = 'active'
        AND l.user_id != p_user_id
        AND NOT EXISTS (
            SELECT 1 FROM recently_viewed rv 
            WHERE rv.user_id = p_user_id 
            AND rv.listing_id = l.id
            AND rv.viewed_at > NOW() - INTERVAL '1 day'
        )
    )
    SELECT 
        rl.listing_id,
        rl.title,
        rl.price,
        rl.currency,
        rl.images,
        rl.location,
        rl.category_name,
        rl.subcategory_name,
        rl.user_id,
        rl.seller_name,
        rl.seller_avatar,
        rl.status,
        rl.trending_score,
        rl.recommendation_score,
        rl.recommendation_reason,
        rl.boost_until,
        rl.spotlight_until,
        rl.urgent_until,
        rl.highlight_until,
        rl.is_sellar_pro,
        rl.subscription_status,
        rl.subscription_plan_name,
        rl.subscription_end
    FROM recommended_listings rl
    ORDER BY rl.recommendation_score DESC, rl.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. ADD COMMENTS
-- =============================================

COMMENT ON FUNCTION get_category_recommendations IS 'Returns category-based recommendations with pre-computed Sellar Pro status';
COMMENT ON FUNCTION get_collaborative_recommendations IS 'Returns collaborative filtering recommendations with pre-computed Sellar Pro status';
COMMENT ON FUNCTION get_personalized_recommendations IS 'Returns personalized recommendations with pre-computed Sellar Pro status';

-- =============================================
-- 5. VERIFICATION
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Recommendation functions updated to use listings_with_pro_status view';
  RAISE NOTICE '📊 This improves performance by eliminating redundant subscription joins';
END $$;
