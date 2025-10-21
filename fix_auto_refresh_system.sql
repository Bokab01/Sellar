-- =============================================
-- FIX AUTO-REFRESH SYSTEM FOR SELLAR PRO USERS
-- =============================================
-- This script will diagnose and fix the auto-refresh system

-- STEP 1: Check if cron job exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM cron.job 
        WHERE jobname = 'auto-refresh-business-listings'
    ) THEN
        RAISE NOTICE '✅ Cron job exists';
    ELSE
        RAISE NOTICE '❌ Cron job MISSING - will be created';
    END IF;
END $$;

-- STEP 2: Re-create the cron job (in case it was deleted)
DO $$
BEGIN
    -- Unschedule if exists (ignore error if doesn't exist)
    BEGIN
        PERFORM cron.unschedule('auto-refresh-business-listings');
        RAISE NOTICE '✅ Removed existing cron job';
    EXCEPTION 
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️  No existing cron job to remove';
    END;
    
    -- Schedule the job
    PERFORM cron.schedule(
        'auto-refresh-business-listings',
        '*/5 * * * *', -- Every 5 minutes
        'SELECT process_business_auto_refresh();'
    );
    
    RAISE NOTICE '✅ Cron job scheduled: Every 5 minutes';
END $$;

-- STEP 3: Re-enable disabled auto-refresh entries for Sellar Pro users
WITH sellar_pro_users AS (
    SELECT DISTINCT us.user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status = 'active'
    AND sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW()
)
UPDATE business_auto_refresh
SET 
    is_active = true,
    next_refresh_at = NOW() + INTERVAL '2 hours',
    updated_at = NOW()
FROM sellar_pro_users spu, listings l
WHERE business_auto_refresh.user_id = spu.user_id
AND business_auto_refresh.listing_id = l.id
AND l.status = 'active'
AND business_auto_refresh.is_active = false;

-- STEP 4: Create missing auto-refresh entries for Sellar Pro users
INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at)
SELECT DISTINCT 
    l.user_id,
    l.id as listing_id,
    true as is_active,
    NOW() + INTERVAL '2 hours' as next_refresh_at
FROM listings l
JOIN user_subscriptions us ON l.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE l.status = 'active'
AND us.status = 'active'
AND sp.name = 'Sellar Pro'
AND us.current_period_end > NOW()
AND NOT EXISTS (
    SELECT 1 FROM business_auto_refresh bar
    WHERE bar.user_id = l.user_id
    AND bar.listing_id = l.id
)
ON CONFLICT (user_id, listing_id) 
DO UPDATE SET 
    is_active = true,
    next_refresh_at = NOW() + INTERVAL '2 hours',
    updated_at = NOW();

-- STEP 5: Verify indexes exist
CREATE INDEX IF NOT EXISTS idx_business_auto_refresh_next_refresh 
ON business_auto_refresh(next_refresh_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_business_auto_refresh_user_listing 
ON business_auto_refresh(user_id, listing_id);

CREATE INDEX IF NOT EXISTS idx_feature_purchases_listing_active 
ON feature_purchases(listing_id, status, expires_at) 
WHERE status = 'active';

-- STEP 6: Verify results and show status
DO $$
DECLARE
    pro_users_count INTEGER;
    active_listings_count INTEGER;
    auto_refresh_count INTEGER;
    active_auto_refresh_count INTEGER;
    due_for_refresh_count INTEGER;
    cron_exists BOOLEAN;
BEGIN
    -- Count Sellar Pro users
    SELECT COUNT(DISTINCT us.user_id) INTO pro_users_count
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status = 'active'
    AND sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW();

    -- Count active listings
    SELECT COUNT(DISTINCT l.id) INTO active_listings_count
    FROM listings l
    JOIN user_subscriptions us ON l.user_id = us.user_id
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE l.status = 'active'
    AND us.status = 'active'
    AND sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW();

    -- Count auto-refresh entries
    SELECT COUNT(*) INTO auto_refresh_count
    FROM business_auto_refresh;

    SELECT COUNT(*) INTO active_auto_refresh_count
    FROM business_auto_refresh
    WHERE is_active = true;

    SELECT COUNT(*) INTO due_for_refresh_count
    FROM business_auto_refresh
    WHERE is_active = true 
    AND next_refresh_at <= NOW();

    -- Check cron job
    SELECT EXISTS(
        SELECT 1 FROM cron.job 
        WHERE jobname = 'auto-refresh-business-listings'
    ) INTO cron_exists;

    -- Display results
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║     AUTO-REFRESH SYSTEM STATUS - DIAGNOSTIC REPORT      ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Sellar Pro Subscriptions:';
    RAISE NOTICE '   • Active Sellar Pro users: %', pro_users_count;
    RAISE NOTICE '   • Active listings: %', active_listings_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Auto-Refresh Status:';
    RAISE NOTICE '   • Total schedules: %', auto_refresh_count;
    RAISE NOTICE '   • Active schedules: %', active_auto_refresh_count;
    RAISE NOTICE '   • Due for refresh: %', due_for_refresh_count;
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  System Status:';
    IF cron_exists THEN
        RAISE NOTICE '   • Cron job: ✅ ACTIVE (runs every 5 minutes)';
    ELSE
        RAISE NOTICE '   • Cron job: ❌ NOT FOUND';
    END IF;
    RAISE NOTICE '';
    
    IF active_auto_refresh_count = active_listings_count THEN
        RAISE NOTICE '✅ ALL SELLAR PRO LISTINGS HAVE AUTO-REFRESH ENABLED!';
    ELSE
        RAISE NOTICE '⚠️  Some listings missing auto-refresh: % of %', 
            active_listings_count - active_auto_refresh_count, active_listings_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- STEP 7: Test the function (dry run)
SELECT 
    '=== FUNCTION TEST ===' as check_section,
    processed_count,
    error_count,
    deactivated_count
FROM process_business_auto_refresh();

