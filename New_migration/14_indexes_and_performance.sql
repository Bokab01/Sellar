-- =============================================
-- SELLAR MOBILE APP - INDEXES AND PERFORMANCE
-- Migration 14: Performance optimizations and additional indexes
-- =============================================

-- =============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- =============================================

-- Listings performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_featured 
ON listings(status, is_featured, created_at DESC) 
WHERE status = 'active' AND moderation_status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_user_status 
ON listings(user_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_category_location 
ON listings(category_id, location, status, created_at DESC) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_price_range 
ON listings(price, status, created_at DESC) 
WHERE status = 'active';

-- Messages performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread 
ON messages(conversation_id, read_at) 
WHERE read_at IS NULL;

-- Notifications performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_type 
ON notifications(user_id, type, created_at DESC);

-- Reviews performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user_published 
ON reviews(reviewed_user_id, status, created_at DESC) 
WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_listing_published 
ON reviews(listing_id, status, created_at DESC) 
WHERE status = 'published';

-- Search analytics performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_analytics_query_date 
ON search_analytics(search_query, searched_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_analytics_user_date 
ON search_analytics(user_id, searched_at DESC) 
WHERE user_id IS NOT NULL;

-- =============================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- =============================================

-- Active users index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_active_users 
ON profiles(last_seen_at DESC, is_active) 
WHERE is_active = true;

-- Verified users index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_verified_users 
ON profiles(verification_level, is_verified, created_at) 
WHERE is_verified = true;

-- Business profiles index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_business 
ON profiles(is_business, business_verified, created_at) 
WHERE is_business = true;

-- Pending verifications index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_verification_pending 
ON user_verification(verification_type, submitted_at) 
WHERE status = 'pending';

-- Active conversations index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_active 
ON conversations(last_message_at DESC, status) 
WHERE status = 'active';

-- Unread messages count index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_unread 
ON conversations(participant_1_id, participant_1_unread_count) 
WHERE participant_1_unread_count > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_unread_2 
ON conversations(participant_2_id, participant_2_unread_count) 
WHERE participant_2_unread_count > 0;

-- =============================================
-- EXPRESSION INDEXES
-- =============================================

-- Normalized search terms
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_suggestions_normalized 
ON search_suggestions(LOWER(suggestion), search_count DESC);

-- Email domain index for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_domain 
ON profiles((split_part(email, '@', 2))) 
WHERE email IS NOT NULL;

-- Phone country code index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_phone_country 
ON profiles((substring(phone from 1 for 4))) 
WHERE phone IS NOT NULL;

-- =============================================
-- COVERING INDEXES
-- =============================================

-- Listings with user info (covering index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_with_user_info 
ON listings(status, created_at DESC) 
INCLUDE (id, title, price, currency, location, user_id, view_count, favorite_count) 
WHERE status = 'active';

-- Messages with conversation info (covering index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_with_conversation 
ON messages(conversation_id, created_at DESC) 
INCLUDE (id, sender_id, content, message_type, read_at);

-- =============================================
-- STATISTICS AND MAINTENANCE
-- =============================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE listings;
ANALYZE messages;
ANALYZE conversations;
ANALYZE notifications;
ANALYZE reviews;
ANALYZE search_analytics;
ANALYZE user_activity_log;

-- =============================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================

-- View for slow queries monitoring
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100 -- queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- View for table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for index usage
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- =============================================
-- PERFORMANCE FUNCTIONS
-- =============================================

-- Function to get database performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS JSONB AS $$
DECLARE
    metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'database_size', pg_size_pretty(pg_database_size(current_database())),
        'active_connections', (
            SELECT count(*) FROM pg_stat_activity 
            WHERE state = 'active' AND datname = current_database()
        ),
        'cache_hit_ratio', (
            SELECT round(
                100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2
            ) FROM pg_stat_database WHERE datname = current_database()
        ),
        'total_queries', (
            SELECT sum(calls) FROM pg_stat_statements
        ),
        'slow_queries_count', (
            SELECT count(*) FROM pg_stat_statements WHERE mean_time > 100
        ),
        'largest_tables', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'table', tablename,
                    'size', pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
                )
            ) FROM (
                SELECT schemaname, tablename
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 5
            ) t
        ),
        'index_usage_stats', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'index', indexname,
                    'scans', idx_scan,
                    'size', pg_size_pretty(pg_relation_size(indexname::regclass))
                )
            ) FROM (
                SELECT indexname, idx_scan
                FROM pg_stat_user_indexes 
                ORDER BY idx_scan DESC
                LIMIT 10
            ) i
        )
    ) INTO metrics;
    
    RETURN metrics;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize database performance
CREATE OR REPLACE FUNCTION optimize_database_performance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Update all table statistics
    EXECUTE 'ANALYZE';
    result := result || 'Updated table statistics. ';
    
    -- Reindex if needed (only if fragmentation is high)
    -- This is commented out as it can be expensive
    -- REINDEX DATABASE current_database();
    
    -- Clean up expired data
    PERFORM cleanup_expired_data();
    result := result || 'Cleaned up expired data. ';
    
    -- Update search suggestions trending status
    UPDATE search_suggestions 
    SET is_trending = (
        search_count > (
            SELECT AVG(search_count) * 2 
            FROM search_suggestions 
            WHERE last_searched_at >= NOW() - INTERVAL '7 days'
        )
        AND last_searched_at >= NOW() - INTERVAL '7 days'
    );
    result := result || 'Updated trending search suggestions. ';
    
    -- Clean up storage usage calculations
    PERFORM calculate_user_storage_usage(id) 
    FROM profiles 
    WHERE last_seen_at >= NOW() - INTERVAL '30 days'
    LIMIT 100;
    result := result || 'Updated storage usage for active users. ';
    
    RETURN result || 'Database optimization completed.';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEDULED MAINTENANCE FUNCTIONS
-- =============================================

-- Function for daily maintenance
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    cleanup_count INTEGER;
BEGIN
    -- Update popular searches
    PERFORM update_popular_searches();
    result := result || 'Updated popular searches. ';
    
    -- Cleanup expired data
    SELECT cleanup_expired_data() INTO cleanup_count;
    result := result || 'Cleaned up ' || cleanup_count || ' expired records. ';
    
    -- Update table statistics for frequently updated tables
    ANALYZE listings;
    ANALYZE messages;
    ANALYZE notifications;
    result := result || 'Updated statistics for active tables. ';
    
    RETURN result || 'Daily maintenance completed.';
END;
$$ LANGUAGE plpgsql;

-- Function for weekly maintenance
CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    storage_cleaned INTEGER;
BEGIN
    -- Full database optimization
    SELECT optimize_database_performance() INTO result;
    
    -- Clean up orphaned storage files
    SELECT cleanup_orphaned_storage_files() INTO storage_cleaned;
    result := result || ' Cleaned up ' || storage_cleaned || ' orphaned files. ';
    
    -- Update all user reputation scores
    UPDATE user_reputation 
    SET trust_level = CASE
        WHEN trust_score >= 90 AND safety_score >= 90 THEN 'expert'
        WHEN trust_score >= 75 AND safety_score >= 75 THEN 'verified'
        WHEN trust_score >= 60 AND safety_score >= 60 THEN 'trusted'
        WHEN trust_score >= 40 AND safety_score >= 40 THEN 'basic'
        ELSE 'new'
    END,
    updated_at = NOW()
    WHERE updated_at < NOW() - INTERVAL '7 days';
    
    result := result || 'Updated user reputation levels. ';
    
    RETURN result || 'Weekly maintenance completed.';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFORMANCE MONITORING SETUP
-- =============================================

-- Enable pg_stat_statements if available
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Set up connection pooling recommendations
COMMENT ON DATABASE current_database() IS 'Recommended connection pool settings: max_connections=100, shared_buffers=256MB, effective_cache_size=1GB';

-- Success message
SELECT 'Performance optimizations and monitoring setup completed successfully!' as status;
