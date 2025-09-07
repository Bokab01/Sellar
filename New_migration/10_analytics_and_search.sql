-- =============================================
-- SELLAR MOBILE APP - ANALYTICS AND SEARCH
-- Migration 10: Search analytics and tracking
-- =============================================

-- =============================================
-- SEARCH ANALYTICS TABLE
-- =============================================

CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Search Information
    search_query TEXT NOT NULL,
    search_type TEXT DEFAULT 'general' CHECK (search_type IN ('general', 'category', 'location', 'user', 'advanced')),
    
    -- Search Context
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    location TEXT,
    filters_applied JSONB DEFAULT '{}',
    
    -- Results
    results_count INTEGER DEFAULT 0,
    clicked_result_id UUID,
    clicked_result_position INTEGER,
    
    -- User Context
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    
    -- Timestamps
    searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SEARCH SUGGESTIONS TABLE
-- =============================================

CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Suggestion Information
    suggestion TEXT NOT NULL UNIQUE,
    category TEXT,
    
    -- Popularity Metrics
    search_count INTEGER DEFAULT 1,
    click_count INTEGER DEFAULT 0,
    last_searched_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_trending BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER ACTIVITY LOG TABLE
-- =============================================

CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Activity Information
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'search', 'view_listing', 'create_listing',
        'edit_listing', 'delete_listing', 'favorite', 'unfavorite',
        'send_message', 'make_offer', 'review', 'follow', 'unfollow',
        'purchase_credits', 'boost_listing', 'verify_account'
    )),
    
    -- Activity Context
    target_type TEXT CHECK (target_type IN ('listing', 'user', 'category', 'search')),
    target_id UUID,
    
    -- Additional Data
    metadata JSONB DEFAULT '{}',
    
    -- Session Information
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    
    -- Location (if available)
    country TEXT,
    city TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POPULAR SEARCHES TABLE
-- =============================================

CREATE TABLE popular_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Search Information
    search_term TEXT NOT NULL,
    normalized_term TEXT NOT NULL,
    
    -- Metrics
    search_count INTEGER DEFAULT 1,
    unique_users_count INTEGER DEFAULT 1,
    
    -- Time Period
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(normalized_term, period_type, period_start)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Search analytics indexes
CREATE INDEX idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_search_query ON search_analytics(search_query);
CREATE INDEX idx_search_analytics_search_type ON search_analytics(search_type);
CREATE INDEX idx_search_analytics_category_id ON search_analytics(category_id);
CREATE INDEX idx_search_analytics_location ON search_analytics(location);
CREATE INDEX idx_search_analytics_searched_at ON search_analytics(searched_at);
CREATE INDEX idx_search_analytics_results_count ON search_analytics(results_count);

-- Full-text search on search queries
CREATE INDEX idx_search_analytics_query_fulltext ON search_analytics USING gin(to_tsvector('english', search_query));

-- Search suggestions indexes
CREATE INDEX idx_search_suggestions_suggestion ON search_suggestions(suggestion);
CREATE INDEX idx_search_suggestions_category ON search_suggestions(category);
CREATE INDEX idx_search_suggestions_search_count ON search_suggestions(search_count DESC);
CREATE INDEX idx_search_suggestions_is_trending ON search_suggestions(is_trending);
CREATE INDEX idx_search_suggestions_last_searched_at ON search_suggestions(last_searched_at);

-- User activity log indexes
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_activity_type ON user_activity_log(activity_type);
CREATE INDEX idx_user_activity_log_target ON user_activity_log(target_type, target_id);
CREATE INDEX idx_user_activity_log_session_id ON user_activity_log(session_id);
CREATE INDEX idx_user_activity_log_created_at ON user_activity_log(created_at);

-- Popular searches indexes
CREATE INDEX idx_popular_searches_search_term ON popular_searches(search_term);
CREATE INDEX idx_popular_searches_normalized_term ON popular_searches(normalized_term);
CREATE INDEX idx_popular_searches_period ON popular_searches(period_type, period_start);
CREATE INDEX idx_popular_searches_search_count ON popular_searches(search_count DESC);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on search_suggestions
CREATE TRIGGER update_search_suggestions_updated_at
    BEFORE UPDATE ON search_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on popular_searches
CREATE TRIGGER update_popular_searches_updated_at
    BEFORE UPDATE ON popular_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to log search activity
CREATE OR REPLACE FUNCTION log_search_activity(
    p_user_id UUID,
    p_search_query TEXT,
    p_search_type TEXT DEFAULT 'general',
    p_category_id UUID DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_filters_applied JSONB DEFAULT '{}',
    p_results_count INTEGER DEFAULT 0,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    search_id UUID;
    device_type TEXT;
    normalized_query TEXT;
BEGIN
    -- Determine device type from user agent
    device_type := CASE
        WHEN p_user_agent ~* 'Mobile|Android|iPhone|iPad' THEN 'mobile'
        WHEN p_user_agent ~* 'Tablet|iPad' THEN 'tablet'
        WHEN p_user_agent ~* 'Mozilla|Chrome|Safari|Firefox' THEN 'desktop'
        ELSE 'unknown'
    END;
    
    -- Insert search analytics record
    INSERT INTO search_analytics (
        user_id, search_query, search_type, category_id, location,
        filters_applied, results_count, ip_address, user_agent, device_type
    )
    VALUES (
        p_user_id, p_search_query, p_search_type, p_category_id, p_location,
        p_filters_applied, p_results_count, p_ip_address, p_user_agent, device_type
    )
    RETURNING id INTO search_id;
    
    -- Update search suggestions
    normalized_query := LOWER(TRIM(p_search_query));
    INSERT INTO search_suggestions (suggestion, search_count, last_searched_at)
    VALUES (normalized_query, 1, NOW())
    ON CONFLICT (suggestion) 
    DO UPDATE SET 
        search_count = search_suggestions.search_count + 1,
        last_searched_at = NOW();
    
    -- Log user activity
    IF p_user_id IS NOT NULL THEN
        INSERT INTO user_activity_log (
            user_id, activity_type, target_type, metadata, ip_address, user_agent, device_type
        )
        VALUES (
            p_user_id, 'search', 'search', 
            jsonb_build_object('query', p_search_query, 'results_count', p_results_count),
            p_ip_address, p_user_agent, device_type
        );
    END IF;
    
    RETURN search_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_session_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
    device_type TEXT;
BEGIN
    -- Determine device type from user agent
    device_type := CASE
        WHEN p_user_agent ~* 'Mobile|Android|iPhone|iPad' THEN 'mobile'
        WHEN p_user_agent ~* 'Tablet|iPad' THEN 'tablet'
        WHEN p_user_agent ~* 'Mozilla|Chrome|Safari|Firefox' THEN 'desktop'
        ELSE 'unknown'
    END;
    
    -- Insert activity log record
    INSERT INTO user_activity_log (
        user_id, activity_type, target_type, target_id, metadata,
        session_id, ip_address, user_agent, device_type
    )
    VALUES (
        p_user_id, p_activity_type, p_target_type, p_target_id, p_metadata,
        p_session_id, p_ip_address, p_user_agent, device_type
    )
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update popular searches
CREATE OR REPLACE FUNCTION update_popular_searches()
RETURNS VOID AS $$
DECLARE
    current_date DATE := CURRENT_DATE;
    week_start DATE := date_trunc('week', current_date)::DATE;
    month_start DATE := date_trunc('month', current_date)::DATE;
BEGIN
    -- Update daily popular searches
    INSERT INTO popular_searches (search_term, normalized_term, search_count, unique_users_count, period_type, period_start, period_end)
    SELECT 
        search_query,
        LOWER(TRIM(search_query)),
        COUNT(*) as search_count,
        COUNT(DISTINCT user_id) as unique_users_count,
        'daily',
        current_date::TIMESTAMPTZ,
        (current_date + INTERVAL '1 day')::TIMESTAMPTZ
    FROM search_analytics
    WHERE searched_at >= current_date::TIMESTAMPTZ
    AND searched_at < (current_date + INTERVAL '1 day')::TIMESTAMPTZ
    GROUP BY search_query
    HAVING COUNT(*) >= 2
    ON CONFLICT (normalized_term, period_type, period_start)
    DO UPDATE SET
        search_count = EXCLUDED.search_count,
        unique_users_count = EXCLUDED.unique_users_count,
        updated_at = NOW();
    
    -- Update weekly popular searches (only on Mondays)
    IF EXTRACT(DOW FROM current_date) = 1 THEN
        INSERT INTO popular_searches (search_term, normalized_term, search_count, unique_users_count, period_type, period_start, period_end)
        SELECT 
            search_query,
            LOWER(TRIM(search_query)),
            COUNT(*) as search_count,
            COUNT(DISTINCT user_id) as unique_users_count,
            'weekly',
            week_start::TIMESTAMPTZ,
            (week_start + INTERVAL '1 week')::TIMESTAMPTZ
        FROM search_analytics
        WHERE searched_at >= week_start::TIMESTAMPTZ
        AND searched_at < (week_start + INTERVAL '1 week')::TIMESTAMPTZ
        GROUP BY search_query
        HAVING COUNT(*) >= 5
        ON CONFLICT (normalized_term, period_type, period_start)
        DO UPDATE SET
            search_count = EXCLUDED.search_count,
            unique_users_count = EXCLUDED.unique_users_count,
            updated_at = NOW();
    END IF;
    
    -- Update monthly popular searches (only on 1st of month)
    IF EXTRACT(DAY FROM current_date) = 1 THEN
        INSERT INTO popular_searches (search_term, normalized_term, search_count, unique_users_count, period_type, period_start, period_end)
        SELECT 
            search_query,
            LOWER(TRIM(search_query)),
            COUNT(*) as search_count,
            COUNT(DISTINCT user_id) as unique_users_count,
            'monthly',
            month_start::TIMESTAMPTZ,
            (month_start + INTERVAL '1 month')::TIMESTAMPTZ
        FROM search_analytics
        WHERE searched_at >= month_start::TIMESTAMPTZ
        AND searched_at < (month_start + INTERVAL '1 month')::TIMESTAMPTZ
        GROUP BY search_query
        HAVING COUNT(*) >= 10
        ON CONFLICT (normalized_term, period_type, period_start)
        DO UPDATE SET
            search_count = EXCLUDED.search_count,
            unique_users_count = EXCLUDED.unique_users_count,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    search_term TEXT,
    search_count INTEGER,
    growth_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_searches AS (
        SELECT 
            s.suggestion,
            s.search_count,
            LAG(s.search_count, 1, 0) OVER (PARTITION BY s.suggestion ORDER BY s.last_searched_at) as prev_count
        FROM search_suggestions s
        WHERE s.is_active = true
        AND s.last_searched_at >= NOW() - INTERVAL '7 days'
    )
    SELECT 
        rs.suggestion,
        rs.search_count,
        CASE 
            WHEN rs.prev_count = 0 THEN 100.0
            ELSE ROUND(((rs.search_count - rs.prev_count)::DECIMAL / rs.prev_count * 100), 2)
        END as growth_rate
    FROM recent_searches rs
    WHERE rs.search_count > rs.prev_count
    ORDER BY growth_rate DESC, rs.search_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Analytics and search tables created successfully!' as status;
