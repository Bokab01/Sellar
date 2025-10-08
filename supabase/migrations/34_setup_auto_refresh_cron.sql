-- =============================================
-- AUTO-REFRESH CRON JOB SETUP
-- =============================================
-- This migration sets up automatic listing refresh for Sellar Pro users
-- Runs every 15 minutes to ensure fair and timely refreshes for all users
-- 
-- Based on: https://medium.com/@samuelmpwanyi/how-to-set-up-cron-jobs-with-supabase-edge-functions-using-pg-cron-a0689da81362

-- =============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- =============================================

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: pg_net is not needed since we're calling the function directly
-- (We're not making HTTP requests to Edge Functions)

-- =============================================
-- 2. VERIFY AUTO-REFRESH FUNCTION EXISTS
-- =============================================

-- Check if the process_business_auto_refresh function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'process_business_auto_refresh'
    ) THEN
        RAISE EXCEPTION 'process_business_auto_refresh() function not found. Please apply initial schema migration first.';
    END IF;
    
    RAISE NOTICE '✅ Auto-refresh function exists';
END $$;

-- =============================================
-- 3. REMOVE ANY EXISTING AUTO-REFRESH CRON JOBS
-- =============================================

-- Clean up any previous versions of the cron job
DO $$
DECLARE
    job_name TEXT;
BEGIN
    -- List of possible job names to remove (in case of naming changes)
    FOR job_name IN 
        SELECT unnest(ARRAY[
            'auto-refresh-business-listings',
            'sellar-pro-auto-refresh',
            'business-auto-refresh'
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
-- 4. SCHEDULE AUTO-REFRESH CRON JOB
-- =============================================

-- Run every 15 minutes for fair distribution
-- This ensures all users get refreshed within 15 minutes of their 2-hour mark
-- Cron format: minute hour day month day-of-week
-- */15 * * * * = Every 15 minutes

SELECT cron.schedule(
    'sellar-pro-auto-refresh',           -- Job name
    '*/15 * * * *',                      -- Every 15 minutes
    $$ SELECT process_business_auto_refresh(); $$
);

-- =============================================
-- 5. VERIFY CRON JOB SETUP
-- =============================================

-- Display the scheduled job
SELECT 
    '✅ Cron Job Scheduled' as status,
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
WHERE jobname = 'sellar-pro-auto-refresh';

-- =============================================
-- 6. CREATE MONITORING FUNCTION
-- =============================================

-- Function to check cron job status and recent runs
CREATE OR REPLACE FUNCTION check_auto_refresh_cron_status()
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
    avg_duration_seconds NUMERIC
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
        ROUND(AVG(EXTRACT(EPOCH FROM (jr.end_time - jr.start_time))), 2) as avg_duration_seconds
    FROM cron.job j
    LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
    WHERE j.jobname = 'sellar-pro-auto-refresh'
    GROUP BY j.jobid, j.jobname, j.schedule, j.active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for monitoring dashboard)
GRANT EXECUTE ON FUNCTION check_auto_refresh_cron_status() TO authenticated;

-- =============================================
-- 7. CREATE MANUAL TRIGGER FUNCTION (FOR TESTING)
-- =============================================

-- Function to manually trigger auto-refresh (useful for testing)
CREATE OR REPLACE FUNCTION trigger_auto_refresh_now()
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER,
    deactivated_count INTEGER,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    result RECORD;
BEGIN
    start_time := clock_timestamp();
    
    -- Call the auto-refresh function
    SELECT * INTO result FROM process_business_auto_refresh();
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        result.processed_count,
        result.error_count,
        result.deactivated_count,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_auto_refresh_now() TO authenticated;

-- =============================================
-- 8. INITIAL SYSTEM HEALTH CHECK
-- =============================================

-- Check current state of auto-refresh system
SELECT 
    '📊 System Health' as status,
    COUNT(*) as total_auto_refresh_entries,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_entries,
    COUNT(CASE WHEN is_active = true AND next_refresh_at <= NOW() THEN 1 END) as due_for_refresh
FROM business_auto_refresh;

-- Show Sellar Pro users with active subscriptions
SELECT 
    '👥 Eligible Users' as status,
    COUNT(DISTINCT us.user_id) as sellar_pro_users,
    COUNT(DISTINCT us.user_id) FILTER (WHERE us.is_trial = true) as on_trial
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
AND sp.name = 'Sellar Pro'
AND us.current_period_end > NOW();

-- =============================================
-- SETUP COMPLETE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║  ✅ AUTO-REFRESH CRON JOB SUCCESSFULLY CONFIGURED         ║
    ║                                                            ║
    ║  📅 Schedule: Every 15 minutes                            ║
    ║  🎯 Target: Sellar Pro listings with active boosts        ║
    ║  ⏱️  Refresh Interval: 2 hours                            ║
    ║                                                            ║
    ║  Monitoring:                                              ║
    ║  • SELECT * FROM check_auto_refresh_cron_status();       ║
    ║  • SELECT * FROM cron.job_run_details                    ║
    ║    WHERE jobid = (SELECT jobid FROM cron.job             ║
    ║                   WHERE jobname = ''sellar-pro-auto-refresh'');  ║
    ║                                                            ║
    ║  Manual Testing:                                          ║
    ║  • SELECT * FROM trigger_auto_refresh_now();             ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    ';
END $$;

