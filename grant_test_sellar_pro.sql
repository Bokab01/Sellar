-- =============================================
-- GRANT SELLAR PRO TO TEST USER
-- =============================================
-- This will give a test user Sellar Pro access for testing auto-refresh

-- STEP 1: Find a user to grant Sellar Pro to
SELECT 
    '=== AVAILABLE USERS ===' as section,
    p.id as user_id,
    p.full_name,
    p.email,
    (SELECT COUNT(*) FROM listings WHERE user_id = p.id AND status = 'active') as active_listings
FROM profiles p
WHERE p.id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- STEP 2: Get the Sellar Pro plan ID
SELECT 
    '=== SELLAR PRO PLAN ===' as section,
    id as plan_id,
    name,
    description
FROM subscription_plans
WHERE name = 'Sellar Pro';

-- STEP 3: Grant Sellar Pro to a user (REPLACE USER_ID)
-- Uncomment and replace USER_ID after finding it in STEP 1

/*
DO $$
DECLARE
    v_user_id UUID := 'REPLACE_WITH_USER_ID_FROM_STEP_1'; -- <<<< REPLACE THIS
    v_plan_id UUID;
BEGIN
    -- Get Sellar Pro plan ID
    SELECT id INTO v_plan_id 
    FROM subscription_plans 
    WHERE name = 'Sellar Pro';
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Sellar Pro plan not found';
    END IF;
    
    -- Grant Sellar Pro subscription (30 days)
    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        is_trial,
        current_period_start,
        current_period_end
    ) VALUES (
        v_user_id,
        v_plan_id,
        'active',
        true, -- Mark as trial
        NOW(),
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (user_id, plan_id)
    DO UPDATE SET
        status = 'active',
        current_period_end = NOW() + INTERVAL '30 days',
        updated_at = NOW();
    
    RAISE NOTICE '✅ Granted Sellar Pro to user: %', v_user_id;
    
    -- Auto-enable auto-refresh for all their active listings
    INSERT INTO business_auto_refresh (user_id, listing_id, is_active, next_refresh_at)
    SELECT 
        v_user_id,
        l.id,
        true,
        NOW() + INTERVAL '2 hours'
    FROM listings l
    WHERE l.user_id = v_user_id
    AND l.status = 'active'
    ON CONFLICT (user_id, listing_id)
    DO UPDATE SET
        is_active = true,
        next_refresh_at = NOW() + INTERVAL '2 hours',
        updated_at = NOW();
    
    RAISE NOTICE '✅ Auto-refresh enabled for all active listings';
END $$;
*/

-- STEP 4: Verify the grant worked
/*
SELECT 
    '=== VERIFICATION ===' as section,
    us.user_id,
    p.full_name,
    p.email,
    sp.name as plan,
    us.status,
    us.is_trial,
    us.current_period_end,
    (SELECT COUNT(*) FROM business_auto_refresh WHERE user_id = us.user_id AND is_active = true) as auto_refresh_schedules
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN profiles p ON us.user_id = p.id
WHERE sp.name = 'Sellar Pro'
AND us.status = 'active';
*/


