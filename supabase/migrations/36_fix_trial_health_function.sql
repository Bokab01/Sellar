-- =============================================
-- FIX TRIAL HEALTH CHECK FUNCTION
-- =============================================
-- This migration fixes the check_trial_system_health() function
-- Issue: Referenced 'ended_at' column which doesn't exist
-- Fix: Use 'ends_at' for expired trials and 'cancelled_at' for cancelled trials

-- Drop and recreate the function with correct column names
CREATE OR REPLACE FUNCTION check_trial_system_health()
RETURNS TABLE (
    metric TEXT,
    count BIGINT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Active trials
    SELECT 
        'Active Trials'::TEXT,
        COUNT(*)::BIGINT,
        CONCAT(
            COUNT(*) FILTER (WHERE ends_at > NOW() + INTERVAL '3 days'), 
            ' ending in >3 days, ',
            COUNT(*) FILTER (WHERE ends_at <= NOW() + INTERVAL '3 days' AND ends_at > NOW()), 
            ' ending in ≤3 days'
        )::TEXT
    FROM subscription_trials
    WHERE status = 'active'
    
    UNION ALL
    
    -- Expired trials (should be processed by cron)
    SELECT 
        'Overdue Trials (need expiration)'::TEXT,
        COUNT(*)::BIGINT,
        CASE 
            WHEN COUNT(*) > 0 THEN CONCAT('Oldest: ', MIN(ends_at)::TEXT)
            ELSE 'None'
        END::TEXT
    FROM subscription_trials
    WHERE status = 'active' AND ends_at < NOW()
    
    UNION ALL
    
    -- Converted trials
    SELECT 
        'Converted to Paid'::TEXT,
        COUNT(*)::BIGINT,
        CONCAT(
            COUNT(*) FILTER (WHERE converted_at > NOW() - INTERVAL '7 days'), 
            ' in last 7 days'
        )::TEXT
    FROM subscription_trials
    WHERE status = 'converted'
    
    UNION ALL
    
    -- Expired trials (historical)
    SELECT 
        'Expired (historical)'::TEXT,
        COUNT(*)::BIGINT,
        CONCAT(
            COUNT(*) FILTER (WHERE ends_at > NOW() - INTERVAL '30 days'), 
            ' in last 30 days'
        )::TEXT
    FROM subscription_trials
    WHERE status = 'expired'
    
    UNION ALL
    
    -- Cancelled trials
    SELECT 
        'Cancelled'::TEXT,
        COUNT(*)::BIGINT,
        CONCAT(
            COUNT(*) FILTER (WHERE cancelled_at > NOW() - INTERVAL '30 days'), 
            ' in last 30 days'
        )::TEXT
    FROM subscription_trials
    WHERE status = 'cancelled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix
SELECT '✅ Function fixed' as status;

-- Test the function
SELECT * FROM check_trial_system_health();

