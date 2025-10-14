-- Fix convert_trial_to_paid function to properly set status to 'active'
-- Issue: Function was not updating status field, leaving it as 'trialing' after conversion

CREATE OR REPLACE FUNCTION convert_trial_to_paid(
    p_subscription_id UUID,
    p_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    error TEXT
) AS $$
DECLARE
    v_plan_id UUID;
    v_billing_cycle VARCHAR(20);
    v_new_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get subscription details
    SELECT plan_id INTO v_plan_id
    FROM user_subscriptions
    WHERE id = p_subscription_id AND user_id = p_user_id AND is_trial = true;
    
    IF v_plan_id IS NULL THEN
        RETURN QUERY SELECT false, 'Trial subscription not found'::TEXT;
        RETURN;
    END IF;
    
    -- Get billing cycle
    SELECT billing_cycle INTO v_billing_cycle
    FROM subscription_plans
    WHERE id = v_plan_id;
    
    -- Calculate new period end based on billing cycle
    IF v_billing_cycle = 'monthly' THEN
        v_new_period_end := NOW() + INTERVAL '30 days';
    ELSIF v_billing_cycle = 'yearly' THEN
        v_new_period_end := NOW() + INTERVAL '1 year';
    ELSE
        v_new_period_end := NOW() + INTERVAL '30 days';
    END IF;
    
    -- Update subscription - NOW INCLUDES STATUS UPDATE
    UPDATE user_subscriptions
    SET 
        status = 'active',  -- ✅ FIX: Set status to active
        is_trial = false,
        trial_converted = true,
        current_period_start = NOW(),
        current_period_end = v_new_period_end,
        updated_at = NOW()
    WHERE id = p_subscription_id AND user_id = p_user_id;
    
    -- Update trial record
    UPDATE subscription_trials
    SET 
        status = 'converted',
        converted_at = NOW(),
        updated_at = NOW()
    WHERE subscription_id = p_subscription_id;
    
    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the fix
COMMENT ON FUNCTION convert_trial_to_paid IS 'Converts a trial subscription to paid. Sets status to active, updates billing period, and marks trial as converted.';

