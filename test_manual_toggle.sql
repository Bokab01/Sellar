-- =============================================
-- MANUAL TEST: AUTO-REFRESH TOGGLE
-- =============================================
-- This simulates what the UI does when you toggle auto-refresh

-- STEP 1: Get user and listing IDs
SELECT 
    '=== SELECT USER AND LISTING ===' as section,
    us.user_id,
    p.full_name,
    l.id as listing_id,
    l.title as listing_title
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN profiles p ON us.user_id = p.id
JOIN listings l ON l.user_id = us.user_id
WHERE sp.name = 'Sellar Pro'
AND us.current_period_end > NOW()
AND l.status = 'active'
LIMIT 5;

-- STEP 2: Enable auto-refresh (REPLACE USER_ID and LISTING_ID from STEP 1)
/*
DO $$
DECLARE
    v_user_id UUID := 'REPLACE_WITH_USER_ID'; -- <<<< REPLACE THIS
    v_listing_id UUID := 'REPLACE_WITH_LISTING_ID'; -- <<<< REPLACE THIS
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          ENABLING AUTO-REFRESH                            ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- This is exactly what the UI does
    INSERT INTO business_auto_refresh (
        user_id,
        listing_id,
        is_active,
        next_refresh_at,
        refresh_interval_hours
    ) VALUES (
        v_user_id,
        v_listing_id,
        true,
        NOW() + INTERVAL '2 hours',
        2
    )
    ON CONFLICT (user_id, listing_id)
    DO UPDATE SET
        is_active = true,
        next_refresh_at = NOW() + INTERVAL '2 hours',
        updated_at = NOW();
    
    RAISE NOTICE '✅ Auto-refresh enabled';
    RAISE NOTICE '';
    
    -- Verify it was saved
    IF EXISTS (
        SELECT 1 FROM business_auto_refresh
        WHERE user_id = v_user_id
        AND listing_id = v_listing_id
        AND is_active = true
    ) THEN
        RAISE NOTICE '✅ VERIFIED: Record exists and is_active = true';
    ELSE
        RAISE NOTICE '❌ ERROR: Record was not saved or is_active = false';
    END IF;
    
    -- Show the record
    PERFORM (
        SELECT 
            id,
            is_active,
            last_refresh_at,
            next_refresh_at,
            created_at,
            updated_at
        FROM business_auto_refresh
        WHERE user_id = v_user_id
        AND listing_id = v_listing_id
    );
    
    RAISE NOTICE '';
END $$;
*/

-- STEP 3: Check if it persisted
/*
SELECT 
    '=== VERIFY AUTO-REFRESH STATE ===' as section,
    bar.id,
    bar.user_id,
    bar.listing_id,
    l.title as listing_title,
    bar.is_active,
    bar.last_refresh_at,
    bar.next_refresh_at,
    bar.created_at,
    bar.updated_at
FROM business_auto_refresh bar
LEFT JOIN listings l ON bar.listing_id = l.id
WHERE bar.user_id = 'REPLACE_WITH_USER_ID' -- <<<< REPLACE THIS
AND bar.listing_id = 'REPLACE_WITH_LISTING_ID'; -- <<<< REPLACE THIS
*/

-- STEP 4: Disable auto-refresh
/*
DO $$
DECLARE
    v_user_id UUID := 'REPLACE_WITH_USER_ID'; -- <<<< REPLACE THIS
    v_listing_id UUID := 'REPLACE_WITH_LISTING_ID'; -- <<<< REPLACE THIS
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║          DISABLING AUTO-REFRESH                           ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    -- This is exactly what the UI does
    DELETE FROM business_auto_refresh
    WHERE user_id = v_user_id
    AND listing_id = v_listing_id;
    
    RAISE NOTICE '✅ Auto-refresh disabled (record deleted)';
    RAISE NOTICE '';
    
    -- Verify it was deleted
    IF NOT EXISTS (
        SELECT 1 FROM business_auto_refresh
        WHERE user_id = v_user_id
        AND listing_id = v_listing_id
    ) THEN
        RAISE NOTICE '✅ VERIFIED: Record deleted successfully';
    ELSE
        RAISE NOTICE '❌ ERROR: Record still exists!';
    END IF;
    
    RAISE NOTICE '';
END $$;
*/


