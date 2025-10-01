-- =============================================
-- FIX AUTO-REFRESH NOTIFICATION SPAM
-- =============================================
-- This migration fixes the issue where users get spammed with notifications
-- every time their listings are auto-refreshed (every 2 hours)

-- Update the listing notification function to exclude auto-refresh updates and handle DELETE operations
CREATE OR REPLACE FUNCTION create_listing_notification()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    listing_title TEXT;
    is_auto_refresh BOOLEAN := FALSE;
    user_id_to_use UUID;
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
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Handle different trigger operations
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD instead of NEW
        user_id_to_use := OLD.user_id;
        listing_title := OLD.title;
        
        -- Get seller details from OLD record
        SELECT username, avatar_url INTO seller_username, seller_avatar
        FROM profiles 
        WHERE id = OLD.user_id;
        
        -- Create notification for listing deletion
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            user_id_to_use,
            'listing',
            'Listing Deleted 🗑️',
            'Your listing "' || listing_title || '" has been deleted.',
            jsonb_build_object(
                'listing_id', OLD.id,
                'action', 'DELETE',
                'created_at', NOW()
            )
        );
        
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations, use NEW
        user_id_to_use := NEW.user_id;
        listing_title := NEW.title;
        
        -- Get seller details from NEW record
        SELECT username, avatar_url INTO seller_username, seller_avatar
        FROM profiles 
        WHERE id = NEW.user_id;
        
        -- Create notification for listing creation/update
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            user_id_to_use,
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
    END IF;
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

-- Update the trigger to handle DELETE operations
DROP TRIGGER IF EXISTS trigger_create_listing_notification ON listings;
CREATE TRIGGER trigger_create_listing_notification
    AFTER INSERT OR UPDATE OR DELETE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION create_listing_notification();

-- Add comments explaining the fixes
COMMENT ON FUNCTION create_listing_notification() IS 'Creates notifications for listing operations (INSERT, UPDATE, DELETE) with proper null handling and auto-refresh detection';
COMMENT ON TRIGGER trigger_create_listing_notification ON listings IS 'Triggers notification creation for all listing operations, properly handling DELETE operations and auto-refresh detection';

-- Verify the fix
SELECT 'Auto-refresh notification spam fix and DELETE operation fix applied successfully' as status;
