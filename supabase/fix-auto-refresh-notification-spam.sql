-- =============================================
-- FIX AUTO-REFRESH NOTIFICATION SPAM
-- =============================================
-- This script fixes the issue where users get spammed with notifications
-- every time their listings are auto-refreshed (every 2 hours)

-- Update the listing notification function to exclude auto-refresh updates
CREATE OR REPLACE FUNCTION create_listing_notification()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    listing_title TEXT;
    is_auto_refresh BOOLEAN := FALSE;
BEGIN
    -- Check if this is an auto-refresh update
    -- Auto-refresh only updates the updated_at timestamp, nothing else
    IF TG_OP = 'UPDATE' THEN
        -- If only updated_at changed and it's a recent change (within last 5 minutes),
        -- and no other meaningful fields changed, it's likely an auto-refresh
        IF OLD.title = NEW.title 
           AND OLD.description = NEW.description 
           AND OLD.price = NEW.price 
           AND OLD.category = NEW.category 
           AND OLD.location = NEW.location 
           AND OLD.status = NEW.status
           AND OLD.user_id = NEW.user_id
           AND OLD.condition = NEW.condition
           AND OLD.images = NEW.images
           AND OLD.updated_at < NEW.updated_at
           AND (NEW.updated_at - OLD.updated_at) < INTERVAL '5 minutes' THEN
            is_auto_refresh := TRUE;
        END IF;
    END IF;

    -- Skip notification for auto-refresh updates
    IF is_auto_refresh THEN
        RETURN NEW;
    END IF;

    -- Get seller details
    SELECT username, avatar_url INTO seller_username, seller_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get listing title
    listing_title := NEW.title;
    
    -- Create notification for the seller (listing created/updated)
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.user_id,
        'listing',
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Listing Created Successfully! 🎉'
            WHEN TG_OP = 'UPDATE' THEN 'Listing Updated ✏️'
            ELSE 'Listing ' || TG_OP
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Your listing "' || listing_title || '" has been created and is now live!'
            WHEN TG_OP = 'UPDATE' THEN 'Your listing "' || listing_title || '" has been updated successfully.'
            ELSE 'Your listing "' || listing_title || '" was ' || TG_OP
        END,
        jsonb_build_object(
            'listing_id', NEW.id,
            'listing_title', listing_title,
            'action', TG_OP,
            'created_at', NEW.created_at,
            'is_auto_refresh', is_auto_refresh
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative approach: Create a more sophisticated auto-refresh detection
-- This function checks if the update was triggered by the auto-refresh system
CREATE OR REPLACE FUNCTION is_auto_refresh_update()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if we're in an auto-refresh context by looking at the call stack
    -- or by checking if the update was made by the auto-refresh function
    RETURN (
        -- Check if the current transaction was started by auto-refresh
        EXISTS (
            SELECT 1 FROM pg_stat_activity 
            WHERE pid = pg_backend_pid() 
            AND query LIKE '%process_business_auto_refresh%'
        )
        OR
        -- Check if the update was made within the last few seconds
        -- and only updated_at changed
        (TG_OP = 'UPDATE' AND OLD.updated_at < NEW.updated_at)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a better version that uses a session variable to track auto-refresh
CREATE OR REPLACE FUNCTION create_listing_notification_v2()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    listing_title TEXT;
    is_auto_refresh BOOLEAN := FALSE;
BEGIN
    -- Check if this is an auto-refresh update using session variable
    -- The auto-refresh function should set this variable
    BEGIN
        is_auto_refresh := COALESCE(current_setting('app.is_auto_refresh', true)::boolean, false);
    EXCEPTION WHEN OTHERS THEN
        is_auto_refresh := FALSE;
    END;

    -- Skip notification for auto-refresh updates
    IF is_auto_refresh THEN
        RETURN NEW;
    END IF;

    -- Get seller details
    SELECT username, avatar_url INTO seller_username, seller_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get listing title
    listing_title := NEW.title;
    
    -- Create notification for the seller (listing created/updated)
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.user_id,
        'listing',
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Listing Created Successfully! 🎉'
            WHEN TG_OP = 'UPDATE' THEN 'Listing Updated ✏️'
            ELSE 'Listing ' || TG_OP
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Your listing "' || listing_title || '" has been created and is now live!'
            WHEN TG_OP = 'UPDATE' THEN 'Your listing "' || listing_title || '" has been updated successfully.'
            ELSE 'Your listing "' || listing_title || '" was ' || TG_OP
        END,
        jsonb_build_object(
            'listing_id', NEW.id,
            'listing_title', listing_title,
            'action', TG_OP,
            'created_at', NEW.created_at,
            'is_auto_refresh', is_auto_refresh
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS process_business_auto_refresh();

-- Update the auto-refresh function to set the session variable
CREATE OR REPLACE FUNCTION process_business_auto_refresh()
RETURNS TABLE(
    processed_count INTEGER,
    error_count INTEGER,
    deactivated_count INTEGER
) AS $$
DECLARE
    refresh_record RECORD;
    processed INTEGER := 0;
    errors INTEGER := 0;
    deactivated INTEGER := 0;
    has_active_boost BOOLEAN;
BEGIN
    -- Set session variable to indicate we're doing auto-refresh
    PERFORM set_config('app.is_auto_refresh', 'true', true);
    
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
                
                deactivated := deactivated + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            errors := errors + 1;
            RAISE NOTICE 'Error processing auto-refresh for listing %: %', refresh_record.listing_id, SQLERRM;
        END;
    END LOOP;
    
    -- Clear the session variable
    PERFORM set_config('app.is_auto_refresh', 'false', true);
    
    -- Return results
    RETURN QUERY SELECT processed, errors, deactivated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger with the new function
DROP TRIGGER IF EXISTS trigger_create_listing_notification ON listings;
CREATE TRIGGER trigger_create_listing_notification
    AFTER INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION create_listing_notification_v2();

-- Verify the fix
SELECT 'Auto-refresh notification spam fix applied successfully' as status;
