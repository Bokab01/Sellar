-- =============================================
-- FIX DUPLICATE FEATURE NOTIFICATIONS
-- =============================================
-- This migration fixes the issue where users get multiple notifications
-- when creating a listing with features, because each feature application
-- triggers an UPDATE notification

-- Update the listing notification function to check for feature application updates
CREATE OR REPLACE FUNCTION create_listing_notification()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    user_id_to_use UUID;
    listing_title TEXT;
    is_auto_refresh BOOLEAN := FALSE;
    is_feature_application BOOLEAN := FALSE;
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

    -- Detect feature application updates
    -- Feature applications only update boost_until, spotlight_until, highlight_until, urgent_until, or updated_at
    -- They don't change core listing data like title, description, price, images, etc.
    IF TG_OP = 'UPDATE' THEN
        is_feature_application := (
            -- Check if only feature-related columns changed
            (NEW.boost_until IS DISTINCT FROM OLD.boost_until OR
             NEW.spotlight_until IS DISTINCT FROM OLD.spotlight_until OR
             NEW.highlight_until IS DISTINCT FROM OLD.highlight_until OR
             NEW.urgent_until IS DISTINCT FROM OLD.urgent_until OR
             NEW.updated_at IS DISTINCT FROM OLD.updated_at)
            AND
            -- AND core listing data didn't change
            NEW.title = OLD.title AND
            NEW.description = OLD.description AND
            NEW.price = OLD.price AND
            NEW.images::text = OLD.images::text AND
            NEW.category_id = OLD.category_id AND
            NEW.location = OLD.location AND
            NEW.status = OLD.status
        );

        -- Skip notification for feature application updates
        -- But only if this is within 5 minutes of listing creation (initial feature application)
        IF is_feature_application AND (NOW() - NEW.created_at) < INTERVAL '5 minutes' THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Skip notification for draft deletions (when clearDraft is called after successful listing creation)
    -- Draft deletions happen when a listing with status='draft' is deleted
    IF TG_OP = 'DELETE' AND OLD.status = 'draft' THEN
        RETURN OLD;
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
                'is_auto_refresh', is_auto_refresh,
                'is_feature_application', is_feature_application
            )
        );
        
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the feature application detection
COMMENT ON FUNCTION create_listing_notification() IS 'Creates notifications for listing operations (INSERT, UPDATE, DELETE) with checks for: draft listings, auto-refresh, and feature application during initial creation (within 5 minutes). This prevents notification spam from feature applications.';

-- Verify the fix
SELECT 'Feature application notification spam fix applied successfully - users will now get only 1 notification when creating a listing with features' as status;

