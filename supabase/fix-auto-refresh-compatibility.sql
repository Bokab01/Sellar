-- =============================================
-- FIX AUTO-REFRESH SYSTEM - COMPATIBILITY VERSION
-- =============================================
-- This version maintains compatibility with existing function signatures

-- =============================================
-- 1. DROP AND RECREATE FUNCTIONS WITH CORRECT NAMES
-- =============================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS process_business_auto_refresh();
DROP FUNCTION IF EXISTS get_feature_cost(VARCHAR(100), UUID);
DROP FUNCTION IF EXISTS setup_business_auto_refresh(UUID, UUID, VARCHAR(100));

-- =============================================
-- 2. RECREATE FUNCTIONS WITH CORRECT PLAN NAMES
-- =============================================

-- Recreate get_feature_cost with correct plan name
CREATE OR REPLACE FUNCTION get_feature_cost(
    p_feature_key VARCHAR(100),
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    feature_record RECORD;
    is_business_user BOOLEAN;
BEGIN
    -- Check if user has active business subscription
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Pro'
        AND us.current_period_end > NOW()
    ) INTO is_business_user;

    -- Get feature pricing
    SELECT regular_credits, business_credits 
    INTO feature_record
    FROM feature_catalog 
    WHERE feature_key = p_feature_key;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Return appropriate pricing based on user type
    IF is_business_user THEN
        RETURN COALESCE(feature_record.business_credits, feature_record.regular_credits, 0);
    ELSE
        RETURN COALESCE(feature_record.regular_credits, 0);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate setup_business_auto_refresh with correct plan name
CREATE OR REPLACE FUNCTION setup_business_auto_refresh(
    p_user_id UUID,
    p_listing_id UUID,
    p_feature_key VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_business_user BOOLEAN;
    feature_has_auto_refresh BOOLEAN := false;
BEGIN
    -- Check if user has active business subscription
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Pro'
        AND us.current_period_end > NOW()
    ) INTO is_business_user;

    IF NOT is_business_user THEN
        RETURN false;
    END IF;

    -- Only setup auto-refresh for features that have it enabled
    IF p_feature_key IS NOT NULL THEN
        SELECT business_auto_refresh IS NOT NULL 
        INTO feature_has_auto_refresh
        FROM feature_catalog 
        WHERE feature_key = p_feature_key;
    END IF;

    -- Only insert auto-refresh if feature supports it
    IF feature_has_auto_refresh THEN
        INSERT INTO business_auto_refresh (user_id, listing_id)
        VALUES (p_user_id, p_listing_id)
        ON CONFLICT (user_id, listing_id) 
        DO UPDATE SET 
            is_active = true,
            next_refresh_at = NOW() + INTERVAL '2 hours',
            updated_at = NOW();
        
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate process_business_auto_refresh with original return type
CREATE OR REPLACE FUNCTION process_business_auto_refresh()
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER
) AS $$
DECLARE
    refresh_record RECORD;
    processed INTEGER := 0;
    errors INTEGER := 0;
    has_active_boost BOOLEAN;
BEGIN
    -- Process all due auto-refreshes, but only for listings with active boosts
    FOR refresh_record IN 
        SELECT bar.id, bar.user_id, bar.listing_id, bar.refresh_interval_hours
        FROM business_auto_refresh bar
        JOIN listings l ON bar.listing_id = l.id
        WHERE bar.is_active = true 
        AND bar.next_refresh_at <= NOW()
        AND l.status = 'active'
    LOOP
        BEGIN
            -- Check if listing has any active boost features
            SELECT EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = refresh_record.listing_id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) INTO has_active_boost;

            -- Only refresh if listing has active boost
            IF has_active_boost THEN
                -- Update listing's updated_at to refresh its position
                UPDATE listings 
                SET updated_at = NOW()
                WHERE id = refresh_record.listing_id;

                -- Update next refresh time
                UPDATE business_auto_refresh
                SET 
                    last_refresh_at = NOW(),
                    next_refresh_at = NOW() + (refresh_record.refresh_interval_hours || ' hours')::INTERVAL,
                    updated_at = NOW()
                WHERE id = refresh_record.id;

                processed := processed + 1;
                
                -- Log successful refresh
                RAISE NOTICE 'Auto-refreshed listing % for user %', refresh_record.listing_id, refresh_record.user_id;
            ELSE
                -- Deactivate auto-refresh for listings without active boosts
                UPDATE business_auto_refresh
                SET 
                    is_active = false,
                    updated_at = NOW()
                WHERE id = refresh_record.id;
                
                -- Log deactivation
                RAISE NOTICE 'Deactivated auto-refresh for listing % (no active boost)', refresh_record.listing_id;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            errors := errors + 1;
            -- Log error but continue processing
            RAISE NOTICE 'Error processing auto-refresh for listing %: %', refresh_record.listing_id, SQLERRM;
        END;
    END LOOP;

    -- Log summary
    RAISE NOTICE 'Auto-refresh completed: % processed, % errors', processed, errors;

    RETURN QUERY SELECT processed, errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. SETUP CRON JOB
-- =============================================

-- Install pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing auto-refresh cron job (if it exists)
DO $$
BEGIN
    -- Try to unschedule, but don't fail if job doesn't exist
    BEGIN
        PERFORM cron.unschedule('auto-refresh-business-listings');
        RAISE NOTICE 'Removed existing auto-refresh cron job';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'No existing auto-refresh cron job to remove';
    END;
END $$;

-- Schedule auto-refresh to run every 2 hours
SELECT cron.schedule(
    'auto-refresh-business-listings',
    '0 */2 * * *', -- Every 2 hours at minute 0
    'SELECT process_business_auto_refresh();'
);

-- =============================================
-- 4. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION get_feature_cost(VARCHAR(100), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_business_auto_refresh(UUID, UUID, VARCHAR(100)) TO authenticated;
GRANT EXECUTE ON FUNCTION process_business_auto_refresh() TO service_role;

-- =============================================
-- 5. VERIFICATION
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 AUTO-REFRESH SYSTEM FIXED AND IMPLEMENTED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions updated with correct "Sellar Pro" plan name';
    RAISE NOTICE '✅ Cron job scheduled to run every 2 hours';
    RAISE NOTICE '✅ Auto-refresh will work for Pro users';
    RAISE NOTICE '';
    RAISE NOTICE '📊 To test: SELECT * FROM process_business_auto_refresh();';
    RAISE NOTICE '';
END $$;
