-- =============================================
-- SEARCH ANALYTICS SYSTEM
-- Track search queries, results, and user behavior
-- =============================================

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    results_count INTEGER DEFAULT 0,
    clicked_result_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    click_position INTEGER,
    filters JSONB DEFAULT '{}'::jsonb,
    search_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_clicked_result_id ON search_analytics(clicked_result_id);

-- Create search suggestions table for popular/trending searches
CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('query', 'category', 'location', 'brand')),
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMPTZ DEFAULT now(),
    is_trending BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for search suggestions
CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON search_suggestions(text);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type ON search_suggestions(type);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_search_count ON search_suggestions(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_is_trending ON search_suggestions(is_trending) WHERE is_trending = true;

-- Create user search history table (for personalized suggestions)
CREATE TABLE IF NOT EXISTS user_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    results_found INTEGER DEFAULT 0,
    clicked_result BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate recent searches
    UNIQUE(user_id, query)
);

-- Create indexes for user search history
CREATE INDEX IF NOT EXISTS idx_user_search_history_user_id ON user_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_history_created_at ON user_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_search_history_query ON user_search_history(query);

-- Function to update search suggestions automatically
CREATE OR REPLACE FUNCTION update_search_suggestions()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update search suggestion
    INSERT INTO search_suggestions (text, type, search_count, last_searched_at)
    VALUES (NEW.query, 'query', 1, NEW.created_at)
    ON CONFLICT (text) 
    DO UPDATE SET 
        search_count = search_suggestions.search_count + 1,
        last_searched_at = NEW.created_at,
        updated_at = NEW.created_at;
    
    -- Update user search history
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO user_search_history (user_id, query, filters, results_found, created_at)
        VALUES (NEW.user_id, NEW.query, NEW.filters, NEW.results_count, NEW.created_at)
        ON CONFLICT (user_id, query)
        DO UPDATE SET
            filters = NEW.filters,
            results_found = NEW.results_count,
            created_at = NEW.created_at;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search suggestions
DROP TRIGGER IF EXISTS trigger_update_search_suggestions ON search_analytics;
CREATE TRIGGER trigger_update_search_suggestions
    AFTER INSERT ON search_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_search_suggestions();

-- Function to mark trending searches (run periodically)
CREATE OR REPLACE FUNCTION update_trending_searches()
RETURNS void AS $$
BEGIN
    -- Reset all trending flags
    UPDATE search_suggestions SET is_trending = false;
    
    -- Mark top searches from last 7 days as trending
    UPDATE search_suggestions 
    SET is_trending = true
    WHERE id IN (
        SELECT s.id
        FROM search_suggestions s
        WHERE s.last_searched_at >= NOW() - INTERVAL '7 days'
        AND s.search_count >= 5
        ORDER BY s.search_count DESC
        LIMIT 20
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean old search analytics (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_search_analytics()
RETURNS void AS $$
BEGIN
    DELETE FROM search_analytics 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    DELETE FROM user_search_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for search analytics
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_history ENABLE ROW LEVEL SECURITY;

-- Search analytics policies (admin can view all, users can only insert)
CREATE POLICY "Users can insert search analytics" ON search_analytics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own search analytics" ON search_analytics
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

-- Search suggestions policies (public read, system write)
CREATE POLICY "Anyone can view search suggestions" ON search_suggestions
    FOR SELECT USING (true);

-- User search history policies (users can only see their own)
CREATE POLICY "Users can view own search history" ON user_search_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own search history" ON user_search_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search history" ON user_search_history
    FOR UPDATE USING (user_id = auth.uid());

-- Insert some initial popular search suggestions
INSERT INTO search_suggestions (text, type, search_count, is_trending) VALUES
    ('iPhone', 'query', 100, true),
    ('Samsung', 'query', 85, true),
    ('laptop', 'query', 75, true),
    ('furniture', 'query', 60, true),
    ('car', 'query', 90, true),
    ('phone', 'query', 120, true),
    ('clothes', 'query', 55, true),
    ('shoes', 'query', 65, true),
    ('electronics', 'query', 80, true),
    ('books', 'query', 40, false)
ON CONFLICT (text) DO NOTHING;

-- Create a view for search analytics dashboard
CREATE OR REPLACE VIEW search_analytics_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as search_date,
    COUNT(*) as total_searches,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(results_count) as avg_results,
    AVG(search_duration_ms) as avg_duration_ms,
    COUNT(clicked_result_id) as total_clicks,
    ROUND(COUNT(clicked_result_id)::numeric / COUNT(*)::numeric * 100, 2) as click_through_rate
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY search_date DESC;

-- Grant necessary permissions
GRANT SELECT ON search_analytics TO authenticated, anon;
GRANT INSERT ON search_analytics TO authenticated, anon;
GRANT SELECT ON search_suggestions TO authenticated, anon;
GRANT SELECT ON user_search_history TO authenticated;
GRANT INSERT, UPDATE ON user_search_history TO authenticated;
GRANT SELECT ON search_analytics_summary TO authenticated;
