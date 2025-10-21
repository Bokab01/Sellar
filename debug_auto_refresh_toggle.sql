-- =============================================
-- DEBUG AUTO-REFRESH TOGGLE ISSUE
-- =============================================
-- This will help us understand why auto-refresh toggle is turning off

-- 1. Find the user with cancelled but active subscription
SELECT 
    '=== USER WITH CANCELLED SUBSCRIPTION ===' as section,
    us.id as subscription_id,
    us.user_id,
    p.full_name,
    p.email,
    sp.name as plan_name,
    us.status,
    us.auto_renew,
    us.is_trial,
    us.current_period_start,
    us.current_period_end,
    us.current_period_end > NOW() as is_still_active,
    EXTRACT(DAY FROM (us.current_period_end - NOW())) as days_remaining
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN profiles p ON us.user_id = p.id
WHERE sp.name = 'Sellar Pro'
AND us.current_period_end > NOW()
ORDER BY us.created_at DESC;

-- 2. Check their listings
SELECT 
    '=== USER LISTINGS ===' as section,
    l.id as listing_id,
    l.title,
    l.status,
    l.user_id,
    l.created_at,
    l.updated_at
FROM listings l
WHERE l.user_id IN (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW()
)
AND l.status = 'active'
ORDER BY l.created_at DESC;

-- 3. Check existing auto-refresh entries
SELECT 
    '=== EXISTING AUTO-REFRESH ENTRIES ===' as section,
    bar.id,
    bar.user_id,
    bar.listing_id,
    l.title as listing_title,
    bar.is_active,
    bar.last_refresh_at,
    bar.next_refresh_at,
    bar.refresh_interval_hours,
    bar.created_at,
    bar.updated_at
FROM business_auto_refresh bar
LEFT JOIN listings l ON bar.listing_id = l.id
WHERE bar.user_id IN (
    SELECT us.user_id 
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW()
)
ORDER BY bar.created_at DESC;

-- 4. Check RLS policies on business_auto_refresh table
SELECT 
    '=== RLS POLICIES ===' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'business_auto_refresh';

-- 5. Check if there's a trigger that might be interfering
SELECT 
    '=== TRIGGERS ON business_auto_refresh ===' as section,
    tgname as trigger_name,
    tgtype,
    tgenabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'business_auto_refresh'::regclass
AND tgname NOT LIKE 'RI_%'; -- Exclude referential integrity triggers

-- 6. Test if user can insert/update/delete
-- (This will show what operations are allowed)
DO $$
DECLARE
    test_user_id UUID;
    test_listing_id UUID;
    can_insert BOOLEAN := false;
    can_update BOOLEAN := false;
    can_delete BOOLEAN := false;
BEGIN
    -- Get a test user and listing
    SELECT us.user_id INTO test_user_id
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE sp.name = 'Sellar Pro'
    AND us.current_period_end > NOW()
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️  No active Sellar Pro user found for testing';
        RETURN;
    END IF;
    
    SELECT l.id INTO test_listing_id
    FROM listings l
    WHERE l.user_id = test_user_id
    AND l.status = 'active'
    LIMIT 1;
    
    IF test_listing_id IS NULL THEN
        RAISE NOTICE '⚠️  User has no active listings';
        RETURN;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          RLS PERMISSIONS TEST                             ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Test User ID: %', test_user_id;
    RAISE NOTICE 'Test Listing ID: %', test_listing_id;
    RAISE NOTICE '';
    
    -- Test INSERT
    BEGIN
        INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at)
        VALUES (test_user_id, test_listing_id, true, NOW() + INTERVAL '2 hours')
        ON CONFLICT (user_id, listing_id) DO NOTHING;
        
        can_insert := true;
        RAISE NOTICE '✅ INSERT: Allowed (service_role bypass)';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT: Failed - %', SQLERRM;
    END;
    
    -- Test UPDATE
    BEGIN
        UPDATE business_auto_refresh
        SET is_active = true,
            next_refresh_at = NOW() + INTERVAL '2 hours'
        WHERE user_id = test_user_id
        AND listing_id = test_listing_id;
        
        can_update := true;
        RAISE NOTICE '✅ UPDATE: Allowed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ UPDATE: Failed - %', SQLERRM;
    END;
    
    -- Check if record exists
    IF EXISTS (
        SELECT 1 FROM business_auto_refresh
        WHERE user_id = test_user_id
        AND listing_id = test_listing_id
    ) THEN
        RAISE NOTICE '✅ Record exists in database';
    ELSE
        RAISE NOTICE '⚠️  No record found after insert/update';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- 7. Check the process_business_auto_refresh function for any deactivation logic
SELECT 
    '=== AUTO-REFRESH FUNCTION CODE ===' as section,
    pg_get_functiondef('process_business_auto_refresh'::regproc) as function_definition;

