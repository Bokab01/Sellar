-- =============================================
-- FIX AUTO-REFRESH DASHBOARD DISPLAY ISSUE
-- =============================================
-- This script fixes the issue where Pro users' listings show as "disabled" 
-- in the auto-refresh dashboard even though they have auto-refresh benefits

-- =============================================
-- 1. CREATE FUNCTION TO AUTO-SETUP REFRESH FOR PRO LISTINGS
-- =============================================

CREATE OR REPLACE FUNCTION setup_pro_listing_auto_refresh(
    p_user_id UUID,
    p_listing_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
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

    IF NOT is_business_user THEN
        RETURN false;
    END IF;

    -- Insert auto-refresh record for Pro user listing
    INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at)
    VALUES (p_user_id, p_listing_id, true, NOW() + INTERVAL '2 hours')
    ON CONFLICT (user_id, listing_id) 
    DO UPDATE SET 
        is_active = true,
        next_refresh_at = NOW() + INTERVAL '2 hours',
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. CREATE TRIGGER TO AUTO-SETUP REFRESH ON LISTING CREATION
-- =============================================

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_setup_pro_auto_refresh()
RETURNS TRIGGER AS $$
BEGIN
    -- Only setup auto-refresh for Pro users
    IF EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = NEW.user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Pro'
        AND us.current_period_end > NOW()
    ) THEN
        -- Setup auto-refresh for the new listing
        PERFORM setup_pro_listing_auto_refresh(NEW.user_id, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS setup_pro_auto_refresh_trigger ON listings;
CREATE TRIGGER setup_pro_auto_refresh_trigger
    AFTER INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_setup_pro_auto_refresh();

-- =============================================
-- 3. BACKFILL EXISTING PRO LISTINGS
-- =============================================

-- Setup auto-refresh for existing Pro user listings that don't have it
INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at)
SELECT DISTINCT 
    l.user_id,
    l.id,
    true,
    NOW() + INTERVAL '2 hours'
FROM listings l
JOIN user_subscriptions us ON l.user_id = us.user_id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
AND sp.name = 'Sellar Pro'
AND us.current_period_end > NOW()
AND l.status = 'active'
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

-- =============================================
-- 4. UPDATE AUTO-REFRESH PROCESSING LOGIC
-- =============================================

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS process_business_auto_refresh();

-- Update the auto-refresh processing to handle Pro listings without boosts
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
    is_pro_user BOOLEAN;
BEGIN
    -- Process all due auto-refreshes
    FOR refresh_record IN 
        SELECT bar.id, bar.user_id, bar.listing_id, bar.refresh_interval_hours
        FROM business_auto_refresh bar
        JOIN listings l ON bar.listing_id = l.id
        WHERE bar.is_active = true 
        AND bar.next_refresh_at <= NOW()
        AND l.status = 'active'
    LOOP
        BEGIN
            -- Check if user is Pro user
            SELECT EXISTS(
                SELECT 1 FROM user_subscriptions us
                JOIN subscription_plans sp ON us.plan_id = sp.id
                WHERE us.user_id = refresh_record.user_id 
                AND us.status = 'active'
                AND sp.name = 'Sellar Pro'
                AND us.current_period_end > NOW()
            ) INTO is_pro_user;

            -- Check if listing has any active boost features
            SELECT EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = refresh_record.listing_id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) INTO has_active_boost;

            -- Refresh if user is Pro OR listing has active boost
            IF is_pro_user OR has_active_boost THEN
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
                RAISE NOTICE 'Auto-refreshed listing % for user % (Pro: %, Boost: %)', 
                    refresh_record.listing_id, refresh_record.user_id, is_pro_user, has_active_boost;
            ELSE
                -- Deactivate auto-refresh for listings without active boosts and non-Pro users
                UPDATE business_auto_refresh
                SET 
                    is_active = false,
                    updated_at = NOW()
                WHERE id = refresh_record.id;
                
                -- Log deactivation
                RAISE NOTICE 'Deactivated auto-refresh for listing % (not Pro user, no active boost)', refresh_record.listing_id;
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
-- 5. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION setup_pro_listing_auto_refresh(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_setup_pro_auto_refresh() TO service_role;
GRANT EXECUTE ON FUNCTION process_business_auto_refresh() TO service_role;

-- =============================================
-- 6. VERIFICATION
-- =============================================

DO $$
DECLARE
    pro_listings_count INTEGER;
    auto_refresh_count INTEGER;
BEGIN
    -- Count Pro user listings
    SELECT COUNT(*) INTO pro_listings_count
    FROM listings l
    JOIN user_subscriptions us ON l.user_id = us.user_id
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status = 'active'
    AND sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW()
    AND l.status = 'active';

    -- Count auto-refresh records
    SELECT COUNT(*) INTO auto_refresh_count
    FROM business_auto_refresh bar
    JOIN user_subscriptions us ON bar.user_id = us.user_id
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.status = 'active'
    AND sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW()
    AND bar.is_active = true;

    RAISE NOTICE '';
    RAISE NOTICE '=== AUTO-REFRESH DASHBOARD FIX VERIFICATION ===';
    RAISE NOTICE 'Pro user active listings: %', pro_listings_count;
    RAISE NOTICE 'Auto-refresh records: %', auto_refresh_count;
    
    IF pro_listings_count = auto_refresh_count THEN
        RAISE NOTICE '✅ All Pro listings have auto-refresh records';
    ELSE
        RAISE NOTICE '⚠️  Mismatch: % listings vs % auto-refresh records', pro_listings_count, auto_refresh_count;
    END IF;
    
    RAISE NOTICE '================================';
    RAISE NOTICE '';
END $$;

-- =============================================
-- 7. SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 AUTO-REFRESH DASHBOARD FIX COMPLETED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Created auto-setup function for Pro listings';
    RAISE NOTICE '✅ Added trigger for new Pro listings';
    RAISE NOTICE '✅ Backfilled existing Pro listings';
    RAISE NOTICE '✅ Updated auto-refresh processing logic';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Pro users will now see correct auto-refresh status';
    RAISE NOTICE '📊 New Pro listings will automatically get auto-refresh';
    RAISE NOTICE '📊 Auto-refresh works for all Pro listings (with or without boosts)';
    RAISE NOTICE '';
END $$;
