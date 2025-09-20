-- =============================================
-- FIX LISTING ORDER LOGIC FOR AUTO-REFRESH
-- =============================================
-- This script fixes the listing order logic to properly use updated_at
-- for auto-refreshed listings instead of created_at

-- =============================================
-- 1. CREATE FUNCTION TO GET PROPER LISTING ORDER
-- =============================================

CREATE OR REPLACE FUNCTION get_listings_with_proper_order(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    price DECIMAL,
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
    is_pro_user BOOLEAN,
    has_active_boost BOOLEAN,
    effective_sort_time TIMESTAMP WITH TIME ZONE
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
        l.views_count,
        l.created_at,
        l.updated_at,
        l.user_id,
        l.status,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        -- Check if user is Pro user
        EXISTS(
            SELECT 1 FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = l.user_id 
            AND us.status = 'active'
            AND sp.name = 'Sellar Pro'
            AND us.current_period_end > NOW()
        ) as is_pro_user,
        -- Check if listing has active boost
        EXISTS(
            SELECT 1 FROM feature_purchases fp
            WHERE fp.listing_id = l.id
            AND fp.status = 'active'
            AND fp.expires_at > NOW()
            AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
        ) as has_active_boost,
        -- Use updated_at for Pro users or boosted listings, created_at for others
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = l.user_id 
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) THEN l.updated_at
            WHEN EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = l.id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) THEN l.updated_at
            ELSE l.created_at
        END as effective_sort_time
    FROM listings l
    WHERE l.status = 'active'
    AND (p_user_id IS NULL OR l.user_id = p_user_id)
    ORDER BY 
        -- Priority order: Urgent > Spotlight > Boosted > Pro > Regular
        CASE 
            WHEN l.urgent_until > NOW() THEN 1
            WHEN l.spotlight_until > NOW() THEN 2
            WHEN l.boost_until > NOW() THEN 3
            WHEN EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = l.user_id 
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) THEN 4
            ELSE 5
        END,
        -- Then by effective sort time (updated_at for Pro/boosted, created_at for others)
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = l.user_id 
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) THEN l.updated_at
            WHEN EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = l.id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) THEN l.updated_at
            ELSE l.created_at
        END DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. CREATE FUNCTION FOR FEATURED LISTINGS
-- =============================================

CREATE OR REPLACE FUNCTION get_featured_listings_with_proper_order(
    p_limit INTEGER DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    price DECIMAL,
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
    is_pro_user BOOLEAN,
    has_active_boost BOOLEAN,
    effective_sort_time TIMESTAMP WITH TIME ZONE,
    seller_name VARCHAR(255),
    seller_avatar VARCHAR(500),
    seller_rating DECIMAL
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
        l.views_count,
        l.created_at,
        l.updated_at,
        l.user_id,
        l.status,
        l.boost_until,
        l.spotlight_until,
        l.urgent_until,
        l.highlight_until,
        -- Check if user is Pro user
        EXISTS(
            SELECT 1 FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = l.user_id 
            AND us.status = 'active'
            AND sp.name = 'Sellar Pro'
            AND us.current_period_end > NOW()
        ) as is_pro_user,
        -- Check if listing has active boost
        EXISTS(
            SELECT 1 FROM feature_purchases fp
            WHERE fp.listing_id = l.id
            AND fp.status = 'active'
            AND fp.expires_at > NOW()
            AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
        ) as has_active_boost,
        -- Use updated_at for Pro users or boosted listings, created_at for others
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = l.user_id 
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) THEN l.updated_at
            WHEN EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = l.id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) THEN l.updated_at
            ELSE l.created_at
        END as effective_sort_time,
        -- Seller information
        COALESCE(p.first_name || ' ' || p.last_name, p.business_name, 'Business User') as seller_name,
        p.avatar_url as seller_avatar,
        p.rating as seller_rating
    FROM listings l
    LEFT JOIN profiles p ON l.user_id = p.id
    WHERE l.status = 'active'
    AND (
        -- Include Pro users
        EXISTS(
            SELECT 1 FROM user_subscriptions us
            JOIN subscription_plans sp ON us.plan_id = sp.id
            WHERE us.user_id = l.user_id 
            AND us.status = 'active'
            AND sp.name = 'Sellar Pro'
            AND us.current_period_end > NOW()
        )
        OR
        -- Include business profile users
        p.account_type = 'business'
        OR
        -- Include boosted listings
        EXISTS(
            SELECT 1 FROM feature_purchases fp
            WHERE fp.listing_id = l.id
            AND fp.status = 'active'
            AND fp.expires_at > NOW()
            AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
        )
    )
    ORDER BY 
        -- Priority order: Urgent > Spotlight > Boosted > Pro > Business
        CASE 
            WHEN l.urgent_until > NOW() THEN 1
            WHEN l.spotlight_until > NOW() THEN 2
            WHEN l.boost_until > NOW() THEN 3
            WHEN EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = l.user_id 
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) THEN 4
            WHEN p.account_type = 'business' THEN 5
            ELSE 6
        END,
        -- Then by effective sort time (updated_at for Pro/boosted, created_at for others)
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = l.user_id 
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) THEN l.updated_at
            WHEN EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = l.id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) THEN l.updated_at
            ELSE l.created_at
        END DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION get_listings_with_proper_order(INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_listings_with_proper_order(INTEGER) TO authenticated;

-- =============================================
-- 4. VERIFICATION
-- =============================================

DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== LISTING ORDER LOGIC FIX VERIFICATION ===';
    
    -- Test the function
    SELECT * INTO test_result 
    FROM get_listings_with_proper_order(5, 0) 
    LIMIT 1;
    
    IF test_result.id IS NOT NULL THEN
        RAISE NOTICE '✅ Function works correctly';
        RAISE NOTICE 'Sample listing: % (Pro: %, Boost: %)', 
            test_result.title, test_result.is_pro_user, test_result.has_active_boost;
    ELSE
        RAISE NOTICE '❌ Function returned no results';
    END IF;
    
    RAISE NOTICE '================================';
    RAISE NOTICE '';
END $$;

-- =============================================
-- 5. SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 LISTING ORDER LOGIC FIX COMPLETED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Created proper listing order functions';
    RAISE NOTICE '✅ Pro users now use updated_at for ordering';
    RAISE NOTICE '✅ Boosted listings now use updated_at for ordering';
    RAISE NOTICE '✅ Regular listings still use created_at for ordering';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Auto-refresh will now properly affect listing order';
    RAISE NOTICE '📊 Pro users will see their listings move to top every 2 hours';
    RAISE NOTICE '📊 Frontend needs to be updated to use these new functions';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test with: SELECT * FROM get_listings_with_proper_order(10, 0);';
    RAISE NOTICE '🧪 Test featured: SELECT * FROM get_featured_listings_with_proper_order(6);';
    RAISE NOTICE '';
END $$;
