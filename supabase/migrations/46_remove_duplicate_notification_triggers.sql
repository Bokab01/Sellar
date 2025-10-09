-- =============================================
-- FIX DUPLICATE NOTIFICATION TRIGGERS (CRITICAL BUG)
-- =============================================
-- Issue: Notification triggers were created TWICE:
--   1. In 01_initial_schema.sql (lines 2123-2141)
--   2. In 09_notification_triggers.sql (lines 229-253)
-- 
-- Impact: Every notification was sent in DUPLICATE:
--   - Messages (2x duplicates)
--   - Follows (2x duplicates)
--   - Likes (2x duplicates)
--   - Comments (2x duplicates)
--   - Listings (2x duplicates)
-- 
-- Note: Other notification types (offers, reviews, payments, reservations, etc.)
-- are created via INSERT statements in functions/code, NOT triggers, so they
-- are not affected by this duplication issue.
-- 
-- Solution: Drop all duplicate triggers and recreate them ONCE
-- =============================================

-- Drop all existing notification triggers to clean slate
DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;
DROP TRIGGER IF EXISTS trigger_create_follow_notification ON follows;
DROP TRIGGER IF EXISTS trigger_create_like_notification ON likes;
DROP TRIGGER IF EXISTS trigger_create_comment_notification ON comments;
DROP TRIGGER IF EXISTS trigger_create_listing_notification ON listings;

-- Recreate triggers (ONCE) with proper deduplication
-- These will be the ONLY triggers for notifications

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

CREATE TRIGGER trigger_create_listing_notification
    AFTER INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION create_listing_notification();

-- Verify trigger counts (should be 1 per table)
DO $$
DECLARE
    message_trigger_count INTEGER;
    follow_trigger_count INTEGER;
    like_trigger_count INTEGER;
    comment_trigger_count INTEGER;
    listing_trigger_count INTEGER;
BEGIN
    -- Count triggers
    SELECT COUNT(*) INTO message_trigger_count 
    FROM pg_trigger 
    WHERE tgname LIKE '%notification%' AND tgrelid = 'messages'::regclass;
    
    SELECT COUNT(*) INTO follow_trigger_count 
    FROM pg_trigger 
    WHERE tgname LIKE '%notification%' AND tgrelid = 'follows'::regclass;
    
    SELECT COUNT(*) INTO like_trigger_count 
    FROM pg_trigger 
    WHERE tgname LIKE '%notification%' AND tgrelid = 'likes'::regclass;
    
    SELECT COUNT(*) INTO comment_trigger_count 
    FROM pg_trigger 
    WHERE tgname LIKE '%notification%' AND tgrelid = 'comments'::regclass;
    
    SELECT COUNT(*) INTO listing_trigger_count 
    FROM pg_trigger 
    WHERE tgname LIKE '%notification%' AND tgrelid = 'listings'::regclass;
    
    -- Report counts
    RAISE NOTICE 'Notification trigger counts after fix:';
    RAISE NOTICE '  messages: %', message_trigger_count;
    RAISE NOTICE '  follows: %', follow_trigger_count;
    RAISE NOTICE '  likes: %', like_trigger_count;
    RAISE NOTICE '  comments: %', comment_trigger_count;
    RAISE NOTICE '  listings: %', listing_trigger_count;
    
    -- Warn if any duplicates remain
    IF message_trigger_count > 1 OR follow_trigger_count > 1 OR 
       like_trigger_count > 1 OR comment_trigger_count > 1 OR 
       listing_trigger_count > 1 THEN
        RAISE WARNING 'Duplicate triggers still exist! Manual intervention required.';
    ELSE
        RAISE NOTICE '✅ All notification triggers are now deduplicated!';
    END IF;
END $$;

-- Success message
COMMENT ON TRIGGER trigger_create_message_notification ON messages IS 
'Creates notification when a new message is sent. Fixed duplicate trigger issue in migration 46.';

COMMENT ON TRIGGER trigger_create_follow_notification ON follows IS 
'Creates notification when someone follows a user. Fixed duplicate trigger issue in migration 46.';

COMMENT ON TRIGGER trigger_create_like_notification ON likes IS 
'Creates notification when someone likes a post. Fixed duplicate trigger issue in migration 46.';

COMMENT ON TRIGGER trigger_create_comment_notification ON comments IS 
'Creates notification when someone comments on a post. Fixed duplicate trigger issue in migration 46.';

COMMENT ON TRIGGER trigger_create_listing_notification ON listings IS 
'Creates notification when a listing is created or updated. Fixed duplicate trigger issue in migration 46.';

