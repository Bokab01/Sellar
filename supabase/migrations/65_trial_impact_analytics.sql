-- =============================================
-- TRIAL IMPACT ANALYTICS FUNCTION
-- =============================================
-- Calculate real-time ROI metrics for trial users to show value

-- Function to calculate trial impact metrics
CREATE OR REPLACE FUNCTION get_trial_impact_metrics(p_user_id UUID)
RETURNS TABLE (
    trial_days_used INTEGER,
    total_views INTEGER,
    views_increase_percent NUMERIC,
    messages_received INTEGER,
    auto_refresh_count INTEGER,
    time_saved_hours NUMERIC,
    estimated_sales_value NUMERIC,
    listings_created INTEGER,
    videos_uploaded INTEGER,
    analytics_accessed_count INTEGER,
    has_baseline BOOLEAN
) AS $$
DECLARE
    v_trial_start TIMESTAMP WITH TIME ZONE;
    v_baseline_views INTEGER := 0;
    v_baseline_messages INTEGER := 0;
    v_pre_trial_period INTERVAL := INTERVAL '14 days';
BEGIN
    -- Get trial start date
    SELECT trial_started_at INTO v_trial_start
    FROM user_subscriptions
    WHERE user_id = p_user_id 
    AND is_trial = true
    AND status = 'active'
    ORDER BY trial_started_at DESC
    LIMIT 1;

    -- If no active trial found, return zeros
    IF v_trial_start IS NULL THEN
        RETURN QUERY SELECT 
            0, 0, 0::NUMERIC, 0, 0, 0::NUMERIC, 0::NUMERIC, 0, 0, 0, false;
        RETURN;
    END IF;

    -- Calculate baseline metrics (14 days before trial)
    -- Get average views per day before trial
    SELECT COALESCE(COUNT(lv.id), 0) INTO v_baseline_views
    FROM listing_views lv
    JOIN listings l ON lv.listing_id = l.id
    WHERE l.user_id = p_user_id
    AND lv.viewed_at BETWEEN (v_trial_start - v_pre_trial_period) AND v_trial_start;

    -- Get messages received before trial
    SELECT COALESCE(COUNT(c.id), 0) INTO v_baseline_messages
    FROM conversations c
    WHERE c.listing_user_id = p_user_id
    AND c.created_at BETWEEN (v_trial_start - v_pre_trial_period) AND v_trial_start;

    -- Calculate trial metrics and return
    RETURN QUERY
    SELECT
        -- Days into trial
        EXTRACT(DAY FROM (NOW() - v_trial_start))::INTEGER as trial_days_used,
        
        -- Total views during trial
        COALESCE((
            SELECT COUNT(lv.id)
            FROM listing_views lv
            JOIN listings l ON lv.listing_id = l.id
            WHERE l.user_id = p_user_id
            AND lv.viewed_at >= v_trial_start
        ), 0)::INTEGER as total_views,
        
        -- Views increase percentage
        CASE 
            WHEN v_baseline_views > 0 THEN
                ROUND(((
                    (SELECT COUNT(lv.id)
                    FROM listing_views lv
                    JOIN listings l ON lv.listing_id = l.id
                    WHERE l.user_id = p_user_id
                    AND lv.viewed_at >= v_trial_start)::NUMERIC - v_baseline_views::NUMERIC
                ) / v_baseline_views::NUMERIC * 100), 0)
            ELSE 0
        END as views_increase_percent,
        
        -- Messages received during trial
        COALESCE((
            SELECT COUNT(c.id)
            FROM conversations c
            WHERE c.listing_user_id = p_user_id
            AND c.created_at >= v_trial_start
        ), 0)::INTEGER as messages_received,
        
        -- Auto-refresh count
        COALESCE((
            SELECT COUNT(*)
            FROM business_auto_refresh bar
            WHERE bar.user_id = p_user_id
            AND bar.last_refresh_at >= v_trial_start
            AND bar.is_active = true
        ), 0)::INTEGER as auto_refresh_count,
        
        -- Time saved (each auto-refresh saves ~2 minutes)
        ROUND(COALESCE((
            SELECT COUNT(*) * 2.0 / 60.0  -- 2 minutes per refresh, convert to hours
            FROM business_auto_refresh bar
            WHERE bar.user_id = p_user_id
            AND bar.last_refresh_at >= v_trial_start
            AND bar.is_active = true
        ), 0), 1) as time_saved_hours,
        
        -- Estimated sales value (based on messages × average conversion rate × avg item value)
        -- Assume 20% conversion rate and GHS 150 average item value
        ROUND(COALESCE((
            SELECT COUNT(c.id) * 0.20 * 150
            FROM conversations c
            WHERE c.listing_user_id = p_user_id
            AND c.created_at >= v_trial_start
        ), 0), 0) as estimated_sales_value,
        
        -- Listings created during trial
        COALESCE((
            SELECT COUNT(l.id)
            FROM listings l
            WHERE l.user_id = p_user_id
            AND l.created_at >= v_trial_start
        ), 0)::INTEGER as listings_created,
        
        -- Videos uploaded (count listings with videos)
        COALESCE((
            SELECT COUNT(DISTINCT l.id)
            FROM listings l,
            LATERAL (
                SELECT jsonb_array_elements(l.media) as media_item
            ) media_items
            WHERE l.user_id = p_user_id
            AND l.created_at >= v_trial_start
            AND media_items.media_item->>'type' = 'video'
        ), 0)::INTEGER as videos_uploaded,
        
        -- Analytics accessed count (placeholder - can be tracked via analytics events)
        0::INTEGER as analytics_accessed_count,
        
        -- Has baseline data
        (v_baseline_views > 0 OR v_baseline_messages > 0) as has_baseline;
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_trial_impact_metrics(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_trial_impact_metrics IS 'Calculates real-time ROI metrics for trial users to demonstrate value during trial period';

-- Create view for easy access to trial impact
CREATE OR REPLACE VIEW trial_impact_summary AS
SELECT 
    us.user_id,
    us.id as subscription_id,
    us.trial_started_at,
    us.trial_ends_at,
    EXTRACT(DAY FROM (us.trial_ends_at - NOW()))::INTEGER as days_remaining,
    tim.*
FROM user_subscriptions us
CROSS JOIN LATERAL get_trial_impact_metrics(us.user_id) tim
WHERE us.is_trial = true 
AND us.status = 'active';

-- Grant access to view
GRANT SELECT ON trial_impact_summary TO authenticated;

COMMENT ON VIEW trial_impact_summary IS 'Real-time view of trial impact metrics for all active trial users';

