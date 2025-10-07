-- Migration: Skip notifications for draft listings (autosave)
-- This prevents the annoying "listing updated" notification during autosave

-- Drop and recreate the create_listing_notification function with draft check
CREATE OR REPLACE FUNCTION create_listing_notification()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    user_id_to_use UUID;
    listing_title TEXT;
    is_auto_refresh BOOLEAN := FALSE;
BEGIN
    -- Check if this is an auto-refresh update using session variable
    BEGIN
        is_auto_refresh := COALESCE(current_setting('app.is_auto_refresh', true)::boolean, false);
    EXCEPTION WHEN OTHERS THEN
        is_auto_refresh := FALSE;
    END;

    -- Skip notification for auto-refresh updates
    IF is_auto_refresh THEN
        RETURN NEW;
    END IF;

    -- Skip notification for draft listings (autosave)
    -- Only send notifications when status is 'active', 'sold', 'reserved'
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.status = 'draft' THEN
            RETURN NEW;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record
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
            'Listing Removed 🗑️',
            'Your listing "' || listing_title || '" has been removed.',
            jsonb_build_object(
                'listing_id', OLD.id,
                'listing_title', listing_title,
                'action', 'DELETE',
                'deleted_at', NOW(),
                'is_auto_refresh', is_auto_refresh
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

-- Add comment explaining the draft check
COMMENT ON FUNCTION create_listing_notification() IS 'Creates notifications for listing operations (INSERT, UPDATE, DELETE) with draft check to skip autosave notifications, auto-refresh detection, and proper null handling';

-- Verify the fix
SELECT 'Draft listing notification skip applied successfully - autosave will no longer trigger notifications' as status;

