-- Fix existing trial conversions that have incorrect status
-- Issue: Subscriptions that were successfully converted from trial still show as 'trialing' or other incorrect statuses

-- Update all converted trials to have 'active' status
UPDATE user_subscriptions
SET 
    status = 'active',
    updated_at = NOW()
WHERE 
    trial_converted = true  -- Was converted from trial
    AND is_trial = false    -- Trial flag correctly set to false
    AND status != 'active'  -- But status is not active
    AND current_period_end > NOW();  -- And subscription period hasn't expired

-- Log the fix
DO $$
DECLARE
    v_fixed_count INTEGER;
BEGIN
    -- Get count of fixed subscriptions
    SELECT COUNT(*) INTO v_fixed_count
    FROM user_subscriptions
    WHERE 
        trial_converted = true 
        AND is_trial = false 
        AND status = 'active'
        AND current_period_end > NOW();
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ FIXED CONVERTED TRIAL SUBSCRIPTIONS';
    RAISE NOTICE 'Total active converted trials: %', v_fixed_count;
    RAISE NOTICE '';
END $$;

