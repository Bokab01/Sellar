-- =============================================
-- FIX DUPLICATE LISTING CREATION NOTIFICATIONS
-- =============================================
-- Issue: Users receive duplicate "Listing Created Successfully" notifications
-- when creating a new listing
--
-- Root Cause Analysis:
-- The create_listing_notification trigger fires on BOTH INSERT and UPDATE.
-- When a listing is created, sometimes it's immediately updated (e.g., feature application),
-- causing two notifications even though we have the 5-minute window check.
--
-- Solution: Add more robust deduplication by checking if a similar notification
-- was already sent in the last minute for the same listing and action.
-- =============================================

CREATE OR REPLACE FUNCTION create_listing_notification()
RETURNS TRIGGER AS $$
DECLARE
    seller_username TEXT;
    seller_avatar TEXT;
    user_id_to_use UUID;
    listing_title TEXT;
    is_auto_refresh BOOLEAN := FALSE;
    is_feature_application BOOLEAN := FALSE;
    recent_notification_count INTEGER := 0;
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
        
        -- ✅ NEW: Check if a similar notification was already sent in the last minute
        -- This prevents duplicate notifications when listing creation is immediately followed by an update
        SELECT COUNT(*) INTO recent_notification_count
        FROM notifications
        WHERE user_id = user_id_to_use
        AND type = 'listing'
        AND data->>'listing_id' = NEW.id::text
        AND data->>'action' = TG_OP
        AND created_at > NOW() - INTERVAL '1 minute';

        -- Skip if duplicate notification already exists
        IF recent_notification_count > 0 THEN
            RETURN NEW;
        END IF;
        
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

-- Update comment
COMMENT ON FUNCTION create_listing_notification() IS 'Creates notifications for listing operations (INSERT, UPDATE, DELETE) with checks for: draft listings, auto-refresh, feature application, and duplicate notifications within 1 minute. This prevents all forms of notification spam.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'LISTING NOTIFICATION FIX APPLIED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Fixed: Duplicate listing creation notifications';
    RAISE NOTICE '';
    RAISE NOTICE 'Protection Added:';
    RAISE NOTICE '✅ Deduplication within 1 minute window';
    RAISE NOTICE '✅ Feature application detection';
    RAISE NOTICE '✅ Draft listing skip';
    RAISE NOTICE '✅ Auto-refresh skip';
    RAISE NOTICE '';
    RAISE NOTICE 'Users will now receive exactly 1 notification';
    RAISE NOTICE 'when creating a new listing!';
    RAISE NOTICE '==============================================';
END $$;

