-- =============================================
-- AUTO-RECOVER RESERVATIONS CRON JOB SETUP
-- =============================================
-- This migration sets up automatic recovery of expired reservations
-- Runs hourly to recover both partial quantity and full listing reservations
-- 
-- Uses pg_cron for reliable database-level scheduling
-- Replaces Edge Function + cron-job.org approach

-- =============================================
-- 1. VERIFY REQUIRED EXTENSION
-- =============================================

-- Ensure pg_cron is enabled (should already be enabled from migration 34)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================
-- 2. VERIFY AUTO-RECOVER FUNCTIONS EXIST
-- =============================================

-- Check if the required functions exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'auto_recover_expired_reservations'
    ) THEN
        RAISE EXCEPTION 'auto_recover_expired_reservations() function not found. Please apply reservation system migrations first.';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'notify_expired_reservations'
    ) THEN
        RAISE WARNING 'notify_expired_reservations() function not found. Notifications will be skipped.';
    END IF;
    
    RAISE NOTICE '✅ Auto-recover functions exist';
END $$;

-- =============================================
-- 3. REMOVE ANY EXISTING AUTO-RECOVER CRON JOBS
-- =============================================

-- Clean up any previous versions of the cron job
DO $$
DECLARE
    job_name TEXT;
BEGIN
    -- List of possible job names to remove (in case of naming changes)
    FOR job_name IN 
        SELECT unnest(ARRAY[
            'auto-recover-reservations',
            'recover-reservations',
            'reservation-recovery',
            'expire-reservations'
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
-- 4. SCHEDULE AUTO-RECOVER CRON JOB
-- =============================================

-- Run every hour at minute 0
-- This ensures reservations don't stay expired for too long
-- Cron format: minute hour day month day-of-week
-- 0 * * * * = Every hour at minute 0

SELECT cron.schedule(
    'auto-recover-reservations',         -- Job name
    '0 * * * *',                         -- Every hour
    $$
    DO $$
    DECLARE
        recovered_count INTEGER := 0;
    BEGIN
        -- Call auto-recovery function
        SELECT auto_recover_expired_reservations() INTO recovered_count;
        
        -- Call notification function (if it exists)
        BEGIN
            PERFORM notify_expired_reservations();
        EXCEPTION WHEN OTHERS THEN
            -- Ignore notification errors - not critical
            RAISE WARNING 'Notification function failed: %', SQLERRM;
        END;
        
        RAISE NOTICE 'Auto-recovered % expired reservations', recovered_count;
    END $$;
    $$
);

-- =============================================
-- 5. VERIFY CRON JOB SETUP
-- =============================================

-- Display the scheduled job
SELECT 
    '✅ Auto-Recover Cron Scheduled' as status,
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname = 'auto-recover-reservations';

-- =============================================
-- 6. CREATE MONITORING FUNCTION
-- =============================================

-- Function to check auto-recover cron status and recent runs
CREATE OR REPLACE FUNCTION check_auto_recover_status()
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
        -- Next run is at the top of the next hour
        DATE_TRUNC('hour', NOW() + INTERVAL '1 hour')::TIMESTAMP WITH TIME ZONE as next_scheduled_run
    FROM cron.job j
    LEFT JOIN cron.job_run_details jr ON j.jobid = jr.jobid
    WHERE j.jobname = 'auto-recover-reservations'
    GROUP BY j.jobid, j.jobname, j.schedule, j.active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for monitoring dashboard)
GRANT EXECUTE ON FUNCTION check_auto_recover_status() TO authenticated;

-- =============================================
-- 7. CREATE MANUAL TRIGGER FUNCTION (FOR TESTING)
-- =============================================

-- Function to manually trigger auto-recovery (useful for testing)
CREATE OR REPLACE FUNCTION trigger_auto_recover_now()
RETURNS TABLE (
    recovered_count INTEGER,
    notifications_sent BOOLEAN,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    recovered INTEGER := 0;
    notify_success BOOLEAN := FALSE;
BEGIN
    start_time := clock_timestamp();
    
    -- Call the auto-recovery function
    SELECT auto_recover_expired_reservations() INTO recovered;
    
    -- Try to send notifications
    BEGIN
        PERFORM notify_expired_reservations();
        notify_success := TRUE;
    EXCEPTION WHEN OTHERS THEN
        notify_success := FALSE;
        RAISE WARNING 'Notification function failed: %', SQLERRM;
    END;
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        recovered,
        notify_success,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_auto_recover_now() TO authenticated;

-- =============================================
-- 8. CREATE RESERVATION SYSTEM HEALTH CHECK
-- =============================================

-- Function to get overview of reservation system health
CREATE OR REPLACE FUNCTION check_reservation_system_health()
RETURNS TABLE (
    metric TEXT,
    count BIGINT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Active reservations
    SELECT 
        'Active Reservations'::TEXT,
        COUNT(*)::BIGINT,
        CONCAT(
            COUNT(*) FILTER (WHERE reserved_until > NOW() + INTERVAL '1 hour'), 
            ' expiring in >1 hour, ',
            COUNT(*) FILTER (WHERE reserved_until <= NOW() + INTERVAL '1 hour' AND reserved_until > NOW()), 
            ' expiring soon'
        )::TEXT
    FROM listings
    WHERE status = 'reserved' AND reserved_until IS NOT NULL
    
    UNION ALL
    
    -- Overdue reservations (need recovery)
    SELECT 
        'Overdue Reservations (need recovery)'::TEXT,
        COUNT(*)::BIGINT,
        CASE 
            WHEN COUNT(*) > 0 THEN CONCAT('Oldest: ', MIN(reserved_until)::TEXT)
            ELSE 'None'
        END::TEXT
    FROM listings
    WHERE status = 'reserved' 
    AND reserved_until IS NOT NULL 
    AND reserved_until < NOW()
    
    UNION ALL
    
    -- Pending transactions
    SELECT 
        'Pending Transactions'::TEXT,
        COUNT(*)::BIGINT,
        CONCAT(
            COUNT(*) FILTER (WHERE status = 'pending'), 
            ' pending, ',
            COUNT(*) FILTER (WHERE status = 'confirmed'), 
            ' confirmed'
        )::TEXT
    FROM pending_transactions
    
    UNION ALL
    
    -- Listings with partial quantity reserved
    SELECT 
        'Partial Quantity Reservations'::TEXT,
        COUNT(*)::BIGINT,
        CONCAT('Total qty reserved: ', SUM(quantity_reserved)::TEXT)::TEXT
    FROM listings
    WHERE quantity_reserved > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_reservation_system_health() TO authenticated;

-- =============================================
-- 9. INITIAL SYSTEM HEALTH CHECK
-- =============================================

-- Check current state of reservation system
SELECT 
    '📊 Reservation System Health' as status,
    COUNT(*) FILTER (WHERE status = 'reserved' AND reserved_until > NOW()) as active_reservations,
    COUNT(*) FILTER (WHERE status = 'reserved' AND reserved_until < NOW()) as overdue_reservations,
    COUNT(*) FILTER (WHERE quantity_reserved > 0) as partial_quantity_reserved,
    SUM(quantity_reserved) as total_quantity_reserved
FROM listings;

-- Show pending transactions
SELECT 
    '💳 Pending Transactions' as status,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
FROM pending_transactions;

-- =============================================
-- SETUP COMPLETE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║  ✅ AUTO-RECOVER CRON JOB SUCCESSFULLY CONFIGURED         ║
    ║                                                            ║
    ║  📅 Schedule: Every hour (0 * * * *)                      ║
    ║  🎯 Target: Expired reservations                          ║
    ║  🔄 Recovery: Both full & partial quantity                ║
    ║                                                            ║
    ║  Monitoring:                                              ║
    ║  • SELECT * FROM check_auto_recover_status();            ║
    ║  • SELECT * FROM check_reservation_system_health();      ║
    ║                                                            ║
    ║  Manual Testing:                                          ║
    ║  • SELECT * FROM trigger_auto_recover_now();             ║
    ║                                                            ║
    ║  View Cron History:                                       ║
    ║  • SELECT * FROM cron.job_run_details                    ║
    ║    WHERE jobid = (SELECT jobid FROM cron.job             ║
    ║                   WHERE jobname = ''auto-recover-reservations''); ║
    ║                                                            ║
    ║  ⚠️  You can now remove this job from cron-job.org       ║
    ║  ⚠️  Optional: Delete Edge Function (no longer needed)   ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    ';
END $$;

-- =============================================
-- VERIFICATION QUERIES (For Documentation)
-- =============================================

-- View all active cron jobs (auto-refresh, trial expiration, and auto-recover)
SELECT 
    jobname,
    schedule,
    active,
    CASE 
        WHEN schedule = '*/15 * * * *' THEN 'Every 15 minutes'
        WHEN schedule = '0 * * * *' THEN 'Every hour'
        WHEN schedule = '0 0 * * *' THEN 'Daily at midnight'
        ELSE schedule
    END as frequency_description
FROM cron.job
WHERE jobname IN ('sellar-pro-auto-refresh', 'expire-sellar-pro-trials', 'auto-recover-reservations')
ORDER BY jobname;

