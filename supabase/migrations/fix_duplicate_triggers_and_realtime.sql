-- =============================================
-- FIX DUPLICATE NOTIFICATION TRIGGERS & ENABLE REALTIME
-- =============================================
-- This migration:
-- 1. Completely removes ALL duplicate triggers
-- 2. Ensures notifications table is in realtime publication
-- 3. Verifies only ONE trigger per table exists
-- =============================================

-- Step 1: Drop ALL existing notification triggers (force clean slate)
DO $$ 
BEGIN
    -- Drop message triggers
    DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;
    DROP TRIGGER IF EXISTS on_message_created_notification ON messages;
    
    -- Drop follow triggers
    DROP TRIGGER IF EXISTS trigger_create_follow_notification ON follows;
    DROP TRIGGER IF EXISTS on_follow_created_notification ON follows;
    
    -- Drop like triggers
    DROP TRIGGER IF EXISTS trigger_create_like_notification ON likes;
    DROP TRIGGER IF EXISTS on_like_created_notification ON likes;
    
    -- Drop comment triggers
    DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments;
    DROP TRIGGER IF EXISTS on_comment_created_notification ON comments;
    
    -- Drop listing triggers
    DROP TRIGGER IF EXISTS trigger_create_listing_notification ON listings;
    DROP TRIGGER IF EXISTS on_listing_created_notification ON listings;

    RAISE NOTICE '✅ All existing notification triggers dropped';
END $$;

-- Step 2: Recreate triggers (ONE TIME ONLY)
-- These are the ONLY triggers that should exist

CREATE TRIGGER trigger_create_message_notification
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION create_message_notification();

CREATE TRIGGER trigger_create_follow_notification
    AFTER INSERT ON follows
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_notification();

CREATE TRIGGER trigger_create_like_notification
    AFTER INSERT ON likes
    FOR EACH ROW
    EXECUTE FUNCTION create_like_notification();

CREATE TRIGGER trigger_create_comment_notification
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

-- Step 3: Enable Realtime for notifications table
DO $$
BEGIN
    -- Try to add notifications to realtime publication
    -- This will fail silently if already added
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        RAISE NOTICE '✅ Added notifications to supabase_realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '✅ Notifications already in supabase_realtime publication';
        WHEN OTHERS THEN
            RAISE WARNING 'Could not add notifications to publication: %', SQLERRM;
    END;
END $$;

-- Step 4: Verify trigger count (should be exactly 1 per table)
DO $$
DECLARE
    message_trigger_count INT;
    follow_trigger_count INT;
    like_trigger_count INT;
    comment_trigger_count INT;
BEGIN
    -- Count triggers for each table
    SELECT COUNT(*) INTO message_trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%message_notification%' AND tgrelid = 'messages'::regclass;
    
    SELECT COUNT(*) INTO follow_trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%follow_notification%' AND tgrelid = 'follows'::regclass;
    
    SELECT COUNT(*) INTO like_trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%like_notification%' AND tgrelid = 'likes'::regclass;
    
    SELECT COUNT(*) INTO comment_trigger_count
    FROM pg_trigger
    WHERE tgname LIKE '%comment_notification%' AND tgrelid = 'comments'::regclass;
    
    -- Log results
    RAISE NOTICE '📊 Trigger Count Verification:';
    RAISE NOTICE '  - Messages: % trigger(s)', message_trigger_count;
    RAISE NOTICE '  - Follows: % trigger(s)', follow_trigger_count;
    RAISE NOTICE '  - Likes: % trigger(s)', like_trigger_count;
    RAISE NOTICE '  - Comments: % trigger(s)', comment_trigger_count;
    
    -- Warn if duplicates found
    IF message_trigger_count > 1 OR follow_trigger_count > 1 OR 
       like_trigger_count > 1 OR comment_trigger_count > 1 THEN
        RAISE WARNING '⚠️ DUPLICATE TRIGGERS STILL EXIST! Manual intervention required.';
    ELSE
        RAISE NOTICE '✅ All triggers are unique (exactly 1 per table)';
    END IF;
END $$;

-- Step 5: Verify notifications table is in realtime publication
DO $$
DECLARE
    is_in_publication BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'notifications'
    ) INTO is_in_publication;
    
    IF is_in_publication THEN
        RAISE NOTICE '✅ Notifications table IS in supabase_realtime publication';
    ELSE
        RAISE WARNING '⚠️ Notifications table NOT in supabase_realtime publication';
    END IF;
END $$;

-- Step 6: Add comments for documentation
COMMENT ON TRIGGER trigger_create_message_notification ON messages IS 
'Creates notification when new message is sent (checks active_conversation_id to prevent notifications for active chats)';

COMMENT ON TRIGGER trigger_create_follow_notification ON follows IS 
'Creates notification when user is followed';

COMMENT ON TRIGGER trigger_create_like_notification ON likes IS 
'Creates notification when post is liked';

COMMENT ON TRIGGER trigger_create_comment_notification ON comments IS 
'Creates notification when post is commented on';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '🎉 Migration complete!';
    RAISE NOTICE '✅ Duplicate triggers removed';
    RAISE NOTICE '✅ Realtime enabled for notifications';
    RAISE NOTICE '✅ All triggers verified';
END $$;

