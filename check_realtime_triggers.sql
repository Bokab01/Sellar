-- =============================================
-- CHECK FOR TRIGGERS AND REALTIME SUBSCRIPTIONS
-- =============================================

-- 1. Check ALL triggers on business_auto_refresh table
SELECT 
    '=== ALL TRIGGERS ON business_auto_refresh ===' as section,
    tgname as trigger_name,
    tgtype,
    tgenabled as enabled,
    CASE tgtype::integer & 1 
        WHEN 1 THEN 'ROW' 
        ELSE 'STATEMENT' 
    END as level,
    CASE tgtype::integer & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE 
        WHEN tgtype::integer & 4 != 0 THEN 'INSERT'
        WHEN tgtype::integer & 8 != 0 THEN 'DELETE'
        WHEN tgtype::integer & 16 != 0 THEN 'UPDATE'
        ELSE 'OTHER'
    END as event,
    pg_get_triggerdef(oid) as full_definition
FROM pg_trigger
WHERE tgrelid = 'business_auto_refresh'::regclass
ORDER BY tgname;

-- 2. Check if there are any policies that might affect updates
SELECT 
    '=== RLS POLICIES (DETAILED) ===' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'business_auto_refresh';

-- 3. Check if RLS is enabled
SELECT 
    '=== RLS STATUS ===' as section,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'business_auto_refresh';

-- 4. Test actual INSERT/UPDATE/DELETE as authenticated user would
DO $$
DECLARE
    v_user_id UUID;
    v_listing_id UUID;
    test_result TEXT;
BEGIN
    -- Get test user and listing
    SELECT us.user_id INTO v_user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.status = 'active'
    LIMIT 1;
    
    SELECT l.id INTO v_listing_id
    FROM listings l
    WHERE l.user_id = v_user_id
    AND l.status = 'active'
    LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          DATABASE OPERATION TEST                          ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Listing ID: %', v_listing_id;
    RAISE NOTICE '';
    
    -- Test 1: UPSERT (what the UI does when toggling ON)
    BEGIN
        INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at, refresh_interval_hours)
        VALUES (v_user_id, v_listing_id, true, NOW() + INTERVAL '2 hours', 2)
        ON CONFLICT (user_id, listing_id)
        DO UPDATE SET
            is_active = true,
            next_refresh_at = NOW() + INTERVAL '2 hours',
            updated_at = NOW();
        
        RAISE NOTICE '✅ TEST 1 - UPSERT: SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TEST 1 - UPSERT: FAILED - %', SQLERRM;
    END;
    
    -- Wait a moment
    PERFORM pg_sleep(0.1);
    
    -- Check if it stayed enabled
    SELECT 
        CASE WHEN is_active = true THEN '✅ STAYED ENABLED' ELSE '❌ GOT DISABLED' END
    INTO test_result
    FROM business_auto_refresh
    WHERE user_id = v_user_id
    AND listing_id = v_listing_id;
    
    RAISE NOTICE '   → Result after UPSERT: %', test_result;
    RAISE NOTICE '';
    
    -- Test 2: DELETE (what the UI does when toggling OFF)
    BEGIN
        DELETE FROM business_auto_refresh
        WHERE user_id = v_user_id
        AND listing_id = v_listing_id;
        
        RAISE NOTICE '✅ TEST 2 - DELETE: SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TEST 2 - DELETE: FAILED - %', SQLERRM;
    END;
    
    -- Wait a moment
    PERFORM pg_sleep(0.1);
    
    -- Check if it was deleted
    IF NOT EXISTS (
        SELECT 1 FROM business_auto_refresh
        WHERE user_id = v_user_id
        AND listing_id = v_listing_id
    ) THEN
        RAISE NOTICE '   → Result after DELETE: ✅ DELETED SUCCESSFULLY';
    ELSE
        RAISE NOTICE '   → Result after DELETE: ❌ STILL EXISTS (NOT DELETED)';
    END IF;
    
    RAISE NOTICE '';
    
    -- Test 3: Re-enable to restore state
    INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at, refresh_interval_hours)
    VALUES (v_user_id, v_listing_id, true, NOW() + INTERVAL '2 hours', 2)
    ON CONFLICT (user_id, listing_id)
    DO UPDATE SET
        is_active = true,
        next_refresh_at = NOW() + INTERVAL '2 hours',
        updated_at = NOW();
    
    RAISE NOTICE '✅ TEST 3 - RE-ENABLED: SUCCESS (restored state)';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
END $$;

-- 5. Check the current state of all auto-refresh records
SELECT 
    '=== CURRENT STATE ===' as section,
    bar.listing_id,
    l.title,
    bar.is_active,
    bar.last_refresh_at,
    bar.next_refresh_at,
    bar.updated_at,
    NOW() - bar.updated_at as time_since_update
FROM business_auto_refresh bar
JOIN listings l ON bar.listing_id = l.id
WHERE bar.user_id IN (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
)
ORDER BY bar.updated_at DESC
LIMIT 18;

-- 6. Check for any database functions that might auto-update these records
SELECT 
    '=== FUNCTIONS THAT REFERENCE business_auto_refresh ===' as section,
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE prosrc LIKE '%business_auto_refresh%'
AND proname != 'check_cron_deactivation'
ORDER BY proname;

