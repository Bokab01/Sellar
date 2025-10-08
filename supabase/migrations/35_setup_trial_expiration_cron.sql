-- =============================================
-- TRIAL EXPIRATION CRON JOB SETUP
-- =============================================
-- This migration sets up automatic trial expiration for Sellar Pro
-- Runs daily at midnight (00:00 UTC) to expire trials past their end date
-- 
-- Uses pg_cron for reliable database-level scheduling

-- =============================================
-- 1. VERIFY REQUIRED EXTENSION
-- =============================================

-- Ensure pg_cron is enabled (should already be enabled from migration 34)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================
-- 2. VERIFY TRIAL EXPIRATION FUNCTION EXISTS
-- =============================================

-- Check if the expire_trials function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'expire_trials'
    ) THEN
        RAISE EXCEPTION 'expire_trials() function not found. Please apply migration 31 (trial system) first.';
    END IF;
    
    RAISE NOTICE '✅ Trial expiration function exists';
END $$;

-- =============================================
-- 3. REMOVE ANY EXISTING TRIAL EXPIRATION CRON JOBS
-- =============================================

-- Clean up any previous versions of the cron job
DO $$
DECLARE
    job_name TEXT;
BEGIN
    -- List of possible job names to remove (in case of naming changes)
    FOR job_name IN 
        SELECT unnest(ARRAY[
            'expire-sellar-pro-trials',
            'expire-trials',
            'trial-expiration',
            'sellar-pro-trial-expiration'
        ])
    LOOP
        BEGIN
            PERFORM cron.unschedule(job_name);
            RAISE NOTICE '✅ Removed existing cron job: %', job_name;
        EXCEPTION 
            WHEN OTHERS THEN
                -- Job doesn't exist, continue
                RAISE NOTICE '⚠️  No existing job named: %', job_name;
        END;
    END LOOP;
END $$;

-- =============================================
-- 4. SCHEDULE TRIAL EXPIRATION CRON JOB
-- =============================================

-- Run daily at midnight UTC
-- This ensures trials expire promptly after their 14-day period
-- Cron format: minute hour day month day-of-week
-- 0 0 * * * = Every day at 00:00 (midnight)

SELECT cron.schedule(
    'expire-sellar-pro-trials',          -- Job name
    '0 0 * * *',                         -- Daily at midnight UTC
    $$ SELECT expire_trials(); $$
);

-- =============================================
-- 5. VERIFY CRON JOB SETUP
-- =============================================

-- Display the scheduled job
SELECT 
    '✅ Trial Expiration Cron Scheduled' as status,
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
WHERE jobname = 'expire-sellar-pro-trials';

-- =============================================
-- 6. CREATE MONITORING FUNCTION
-- =============================================

-- Function to check trial expiration cron status and recent runs
CREATE OR REPLACE FUNCTION check_trial_expiration_status()
RETURNS TABLE (
    job_name TEXT,
    is_scheduled BOOLEAN,
    schedule TEXT,
    is_active BOOLEAN,
    last_run_started TIMESTAMP WITH TIME ZONE,
    last_run_finished TIMESTAMP WITH TIME ZONE,
    last_run_status TEXT,
    total_runs BIGINT,
    failed_runs BIGINT,
    avg_duration_seconds NUMERIC,
    next_scheduled_run TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.jobname::TEXT as job_name,
        TRUE as is_scheduled,
        j.schedule::TEXT,
        j.active as is_active,
        MAX(jr.start_time) as last_run_started,
        MAX(jr.end_time) as last_run_finished,
        (SELECT status FROM cron.job_run_details 
         WHERE jobid = j.jobid 
         ORDER BY start_time DESC 
         LIMIT 1)::TEXT as last_run_status,
        COUNT(jr.jobid) as total_runs,
        COUNT(CASE WHEN jr.status = 'failed' THEN 1 END) as failed_runs,
        ROUND(AVG(EXTRACT(EPOCH FROM (jr.end_time - jr.start_time))), 2) as avg_duration_seconds,
        -- Next run is tomorrow at midnight
        (DATE_TRUNC('day', NOW()) + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE as next_scheduled_run
    FROM cron.job j
    LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
    WHERE j.jobname = 'expire-sellar-pro-trials'
    GROUP BY j.jobid, j.jobname, j.schedule, j.active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for monitoring dashboard)
GRANT EXECUTE ON FUNCTION check_trial_expiration_status() TO authenticated;

-- =============================================
-- 7. CREATE MANUAL TRIGGER FUNCTION (FOR TESTING)
-- =============================================

-- Function to manually trigger trial expiration (useful for testing)
CREATE OR REPLACE FUNCTION trigger_trial_expiration_now()
RETURNS TABLE (
    trials_checked INTEGER,
    trials_expired INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    result RECORD;
    trials_before INTEGER;
    trials_after INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    -- Count active trials before
    SELECT COUNT(*) INTO trials_before
    FROM subscription_trials
    WHERE status = 'active';
    
    -- Call the trial expiration function
    PERFORM expire_trials();
    
    -- Count active trials after
    SELECT COUNT(*) INTO trials_after
    FROM subscription_trials
    WHERE status = 'active';
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        trials_before as trials_checked,
        (trials_before - trials_after) as trials_expired,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER as execution_time_ms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_trial_expiration_now() TO authenticated;

-- =============================================
-- 8. CREATE TRIAL SYSTEM HEALTH CHECK
-- =============================================

-- Function to get overview of trial system health
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
        CONCAT('Oldest: ', MIN(ends_at)::TEXT)::TEXT
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_trial_system_health() TO authenticated;

-- =============================================
-- 9. INITIAL SYSTEM HEALTH CHECK
-- =============================================

-- Check current state of trial system
SELECT 
    '📊 Trial System Health' as status,
    COUNT(*) FILTER (WHERE status = 'active') as active_trials,
    COUNT(*) FILTER (WHERE status = 'active' AND ends_at < NOW()) as overdue_trials,
    COUNT(*) FILTER (WHERE status = 'converted') as converted_trials,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_trials,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trials
FROM subscription_trials;

-- Show Sellar Pro users currently on trial
SELECT 
    '👥 Users on Trial' as status,
    COUNT(DISTINCT us.user_id) as trial_users,
    MIN(us.trial_ends_at) as earliest_trial_end,
    MAX(us.trial_ends_at) as latest_trial_end
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
AND us.is_trial = true
AND sp.name = 'Sellar Pro'
AND us.trial_ends_at > NOW();

-- =============================================
-- 10. CREATE ALERTS FOR MONITORING
-- =============================================

-- Function to get trials expiring soon (useful for alerts/notifications)
CREATE OR REPLACE FUNCTION get_trials_expiring_soon(days_ahead INTEGER DEFAULT 3)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    days_remaining NUMERIC,
    has_payment_method BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.user_id,
        u.email,
        st.started_at as trial_started_at,
        st.ends_at as trial_ends_at,
        ROUND(EXTRACT(EPOCH FROM (st.ends_at - NOW())) / 86400, 1) as days_remaining,
        -- Check if user has payment method (you can customize this logic)
        FALSE as has_payment_method  -- Placeholder - update based on your payment setup
    FROM subscription_trials st
    JOIN auth.users u ON u.id = st.user_id
    WHERE st.status = 'active'
    AND st.ends_at BETWEEN NOW() AND NOW() + (days_ahead || ' days')::INTERVAL
    ORDER BY st.ends_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_trials_expiring_soon(INTEGER) TO authenticated;

-- =============================================
-- SETUP COMPLETE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║  ✅ TRIAL EXPIRATION CRON JOB SUCCESSFULLY CONFIGURED     ║
    ║                                                            ║
    ║  📅 Schedule: Daily at midnight (00:00 UTC)               ║
    ║  🎯 Target: Trials past their end date                    ║
    ║  ⏱️  Trial Duration: 14 days                              ║
    ║                                                            ║
    ║  Monitoring:                                              ║
    ║  • SELECT * FROM check_trial_expiration_status();        ║
    ║  • SELECT * FROM check_trial_system_health();            ║
    ║  • SELECT * FROM get_trials_expiring_soon(3);            ║
    ║                                                            ║
    ║  Manual Testing:                                          ║
    ║  • SELECT * FROM trigger_trial_expiration_now();         ║
    ║                                                            ║
    ║  View Cron History:                                       ║
    ║  • SELECT * FROM cron.job_run_details                    ║
    ║    WHERE jobid = (SELECT jobid FROM cron.job             ║
    ║                   WHERE jobname = ''expire-sellar-pro-trials'');  ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    ';
END $$;

-- =============================================
-- VERIFICATION QUERIES (For Documentation)
-- =============================================

-- View all active cron jobs (both auto-refresh and trial expiration)
SELECT 
    jobname,
    schedule,
    active,
    CASE 
        WHEN schedule = '*/15 * * * *' THEN 'Every 15 minutes'
        WHEN schedule = '0 0 * * *' THEN 'Daily at midnight'
        ELSE schedule
    END as frequency_description
FROM cron.job
WHERE jobname IN ('sellar-pro-auto-refresh', 'expire-sellar-pro-trials')
ORDER BY jobname;

