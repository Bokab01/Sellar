-- Fix trial impact analytics function to use correct column name
-- listing_views table has 'created_at' not 'viewed_at'

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
    -- Get average views per day before trial (FIXED: use created_at instead of viewed_at)
    SELECT COALESCE(COUNT(lv.id), 0) INTO v_baseline_views
    FROM listing_views lv
    JOIN listings l ON lv.listing_id = l.id
    WHERE l.user_id = p_user_id
    AND lv.created_at BETWEEN (v_trial_start - v_pre_trial_period) AND v_trial_start;

    -- Get messages received before trial (FIXED: join with listings to get owner)
    SELECT COALESCE(COUNT(DISTINCT c.id), 0) INTO v_baseline_messages
    FROM conversations c
    JOIN listings l ON c.listing_id = l.id
    WHERE l.user_id = p_user_id
    AND c.created_at BETWEEN (v_trial_start - v_pre_trial_period) AND v_trial_start;

    -- Calculate trial metrics and return
    RETURN QUERY
    SELECT
        -- Days into trial
        EXTRACT(DAY FROM (NOW() - v_trial_start))::INTEGER as trial_days_used,
        
        -- Total views during trial (FIXED: use created_at instead of viewed_at)
        COALESCE((
            SELECT COUNT(lv.id)
            FROM listing_views lv
            JOIN listings l ON lv.listing_id = l.id
            WHERE l.user_id = p_user_id
            AND lv.created_at >= v_trial_start
        ), 0)::INTEGER as total_views,
        
        -- Views increase percentage (FIXED: use created_at instead of viewed_at)
        CASE 
            WHEN v_baseline_views > 0 THEN
                ROUND(((
                    (SELECT COUNT(lv.id)
                    FROM listing_views lv
                    JOIN listings l ON lv.listing_id = l.id
                    WHERE l.user_id = p_user_id
                    AND lv.created_at >= v_trial_start)::NUMERIC - v_baseline_views::NUMERIC
                ) / v_baseline_views::NUMERIC * 100), 0)
            ELSE 0
        END as views_increase_percent,
        
        -- Messages received during trial (FIXED: join with listings to get owner)
        COALESCE((
            SELECT COUNT(DISTINCT c.id)
            FROM conversations c
            JOIN listings l ON c.listing_id = l.id
            WHERE l.user_id = p_user_id
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
        
        -- Estimated sales value (messages × 20% conversion × GHS 150 avg transaction)
        -- (FIXED: join with listings to get owner)
        ROUND(COALESCE((
            SELECT COUNT(DISTINCT c.id) * 0.20 * 150
            FROM conversations c
            JOIN listings l ON c.listing_id = l.id
            WHERE l.user_id = p_user_id
            AND c.created_at >= v_trial_start
        ), 0), 0) as estimated_sales_value,
        
        -- Listings created during trial
        COALESCE((
            SELECT COUNT(*)
            FROM listings l
            WHERE l.user_id = p_user_id
            AND l.created_at >= v_trial_start
        ), 0)::INTEGER as listings_created,
        
        -- Videos uploaded during trial (FIXED: use images column, not media)
        COALESCE((
            SELECT COUNT(*)
            FROM listings l
            WHERE l.user_id = p_user_id
            AND l.created_at >= v_trial_start
            AND jsonb_array_length(COALESCE(l.images, '[]'::jsonb)) > 0
            AND EXISTS (
                SELECT 1 
                FROM jsonb_array_elements(l.images) AS img
                WHERE img->>'type' = 'video'
            )
        ), 0)::INTEGER as videos_uploaded,
        
        -- Analytics accessed count (placeholder - can be tracked later)
        0::INTEGER as analytics_accessed_count,
        
        -- Whether we have baseline data
        (v_baseline_views > 0 OR v_baseline_messages > 0) as has_baseline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_trial_impact_metrics IS 'Calculates real-time ROI metrics for trial users. FIXED: Uses correct column names - created_at from listing_views, images from listings, and joins conversations with listings to get owner.';

