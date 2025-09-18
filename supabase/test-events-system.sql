-- =============================================
-- COMMUNITY EVENTS SYSTEM TEST SCRIPT
-- =============================================
-- Run this after applying the events system migration
-- to verify everything is working correctly

-- =============================================
-- TEST 1: Check if tables exist
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '🔍 CHECKING TABLES...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        RAISE NOTICE '✅ events table exists';
    ELSE
        RAISE NOTICE '❌ events table MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_attendees') THEN
        RAISE NOTICE '✅ event_attendees table exists';
    ELSE
        RAISE NOTICE '❌ event_attendees table MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_comments') THEN
        RAISE NOTICE '✅ event_comments table exists';
    ELSE
        RAISE NOTICE '❌ event_comments table MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_likes') THEN
        RAISE NOTICE '✅ event_likes table exists';
    ELSE
        RAISE NOTICE '❌ event_likes table MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_shares') THEN
        RAISE NOTICE '✅ event_shares table exists';
    ELSE
        RAISE NOTICE '❌ event_shares table MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_notifications') THEN
        RAISE NOTICE '✅ event_notifications table exists';
    ELSE
        RAISE NOTICE '❌ event_notifications table MISSING - Run the events system migration!';
    END IF;
END $$;

-- =============================================
-- TEST 2: Check if functions exist
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING FUNCTIONS...';
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_events') THEN
        RAISE NOTICE '✅ get_events function exists';
    ELSE
        RAISE NOTICE '❌ get_events function MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_events') THEN
        RAISE NOTICE '✅ get_user_events function exists';
    ELSE
        RAISE NOTICE '❌ get_user_events function MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'register_for_event') THEN
        RAISE NOTICE '✅ register_for_event function exists';
    ELSE
        RAISE NOTICE '❌ register_for_event function MISSING - Run the events system migration!';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'cancel_event_registration') THEN
        RAISE NOTICE '✅ cancel_event_registration function exists';
    ELSE
        RAISE NOTICE '❌ cancel_event_registration function MISSING - Run the events system migration!';
    END IF;
END $$;

-- =============================================
-- TEST 3: Check sample data
-- =============================================
DO $$
DECLARE
    event_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING SAMPLE DATA...';
    
    SELECT COUNT(*) INTO event_count FROM events;
    
    IF event_count > 0 THEN
        RAISE NOTICE '✅ Sample events found: % events', event_count;
    ELSE
        RAISE NOTICE '❌ No sample events found - Run the events system migration!';
    END IF;
END $$;

-- =============================================
-- TEST 4: Test functions
-- =============================================
DO $$
DECLARE
    events_count INTEGER;
    user_events_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 TESTING FUNCTIONS...';
    
    -- Test get_events function
    BEGIN
        SELECT COUNT(*) INTO events_count FROM get_events(10, 0);
        RAISE NOTICE '✅ get_events function works: % results', events_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ get_events function failed: %', SQLERRM;
    END;
    
    -- Test get_user_events function (if we have a user)
    BEGIN
        SELECT COUNT(*) INTO user_events_count FROM get_user_events(
            (SELECT id FROM profiles LIMIT 1), 'all'
        );
        RAISE NOTICE '✅ get_user_events function works: % results', user_events_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ get_user_events function failed: %', SQLERRM;
    END;
END $$;

-- =============================================
-- TEST 5: Test event registration (if we have events and users)
-- =============================================
DO $$
DECLARE
    test_event_id UUID;
    test_user_id UUID;
    registration_result JSON;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 TESTING EVENT REGISTRATION...';
    
    -- Get a test event and user
    SELECT id INTO test_event_id FROM events LIMIT 1;
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_event_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Test registration
        BEGIN
            SELECT register_for_event(test_event_id, test_user_id) INTO registration_result;
            RAISE NOTICE '✅ Event registration test: %', registration_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Event registration test failed: %', SQLERRM;
        END;
        
        -- Test cancellation
        BEGIN
            SELECT cancel_event_registration(test_event_id, test_user_id) INTO registration_result;
            RAISE NOTICE '✅ Event cancellation test: %', registration_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Event cancellation test failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ Cannot test registration - no events or users found';
    END IF;
END $$;

-- =============================================
-- TEST 6: Check triggers
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING TRIGGERS...';
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_event_attendee_count') THEN
        RAISE NOTICE '✅ trigger_update_event_attendee_count exists';
    ELSE
        RAISE NOTICE '❌ trigger_update_event_attendee_count MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_event_likes_count') THEN
        RAISE NOTICE '✅ trigger_update_event_likes_count exists';
    ELSE
        RAISE NOTICE '❌ trigger_update_event_likes_count MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_update_event_comment_counts') THEN
        RAISE NOTICE '✅ trigger_update_event_comment_counts exists';
    ELSE
        RAISE NOTICE '❌ trigger_update_event_comment_counts MISSING';
    END IF;
END $$;

-- =============================================
-- TEST 7: Check RLS policies
-- =============================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING RLS POLICIES...';
    
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename IN ('events', 'event_attendees', 'event_comments', 'event_likes', 'event_shares', 'event_notifications');
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ RLS policies found: % policies', policy_count;
    ELSE
        RAISE NOTICE '❌ No RLS policies found - Run the events system migration!';
    END IF;
END $$;

-- =============================================
-- TEST 8: Display current events
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CURRENT EVENTS...';
END $$;

-- Show current events
SELECT 
    'Current Events:' as data_type,
    title,
    event_type,
    category,
    city,
    start_date,
    current_attendees,
    is_free
FROM events 
ORDER BY start_date ASC 
LIMIT 5;

-- =============================================
-- RECOMMENDATIONS
-- =============================================
DO $$
DECLARE
    event_count INTEGER;
    function_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RECOMMENDATIONS:';
    
    -- Check if functions exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_events'
    ) INTO function_exists;
    
    -- Check event count
    SELECT COUNT(*) INTO event_count FROM events;
    
    -- Check policy count
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename IN ('events', 'event_attendees', 'event_comments', 'event_likes', 'event_shares', 'event_notifications');
    
    IF NOT function_exists THEN
        RAISE NOTICE '1. ❌ Run the events system migration first!';
        RAISE NOTICE '   Copy supabase/migrations/08_community_events.sql and run it';
    ELSIF event_count = 0 THEN
        RAISE NOTICE '1. ❌ No sample data found - Run the migration again';
    ELSIF policy_count = 0 THEN
        RAISE NOTICE '1. ❌ No RLS policies found - Run the migration again';
    ELSE
        RAISE NOTICE '1. ✅ Events system is set up correctly';
        RAISE NOTICE '2. 📱 Test the events screen in your app';
        RAISE NOTICE '3. 🎉 Create events and test registration functionality';
        RAISE NOTICE '4. 🔄 Test event filtering and search features';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your events system status:';
    RAISE NOTICE '   Functions exist: %', function_exists;
    RAISE NOTICE '   Sample events: %', event_count;
    RAISE NOTICE '   RLS policies: %', policy_count;
END $$;
