-- =============================================
-- SELLAR PRO 2-WEEK FREE TRIAL SYSTEM
-- =============================================
-- This migration implements a complete 2-week free trial system for Sellar Pro
-- Users can start a trial once, and it automatically converts after 14 days

-- =============================================
-- 1. ADD TRIAL COLUMNS TO USER_SUBSCRIPTIONS
-- =============================================

-- Add trial tracking columns
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_converted BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_subscriptions.is_trial IS 'Whether this subscription is currently in trial period';
COMMENT ON COLUMN user_subscriptions.trial_started_at IS 'When the trial period started';
COMMENT ON COLUMN user_subscriptions.trial_ends_at IS 'When the trial period ends (14 days from start)';
COMMENT ON COLUMN user_subscriptions.trial_converted IS 'Whether the trial was converted to a paid subscription';

-- =============================================
-- 2. CREATE TRIAL TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_trials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
    converted_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user can only have one trial per plan
    UNIQUE(user_id, plan_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscription_trials_user_id ON subscription_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_trials_status ON subscription_trials(status);
CREATE INDEX IF NOT EXISTS idx_subscription_trials_ends_at ON subscription_trials(ends_at);

-- Add RLS policies
ALTER TABLE subscription_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trials"
    ON subscription_trials FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trials"
    ON subscription_trials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 3. FUNCTION TO CHECK IF USER HAS USED TRIAL
-- =============================================

CREATE OR REPLACE FUNCTION has_used_trial(
    p_user_id UUID,
    p_plan_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    trial_exists BOOLEAN;
BEGIN
    -- Check if user has already used a trial for this plan (or any plan if not specified)
    IF p_plan_id IS NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM subscription_trials
            WHERE user_id = p_user_id
        ) INTO trial_exists;
    ELSE
        SELECT EXISTS(
            SELECT 1 FROM subscription_trials
            WHERE user_id = p_user_id AND plan_id = p_plan_id
        ) INTO trial_exists;
    END IF;
    
    RETURN trial_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. FUNCTION TO START TRIAL
-- =============================================

CREATE OR REPLACE FUNCTION start_trial(
    p_user_id UUID,
    p_plan_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    subscription_id UUID,
    trial_id UUID,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    error TEXT
) AS $$
DECLARE
    v_subscription_id UUID;
    v_trial_id UUID;
    v_trial_ends_at TIMESTAMP WITH TIME ZONE;
    v_has_trial BOOLEAN;
BEGIN
    -- Check if user has already used trial
    SELECT has_used_trial(p_user_id, p_plan_id) INTO v_has_trial;
    
    IF v_has_trial THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE, 'Trial already used for this plan'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate trial end date (14 days from now)
    v_trial_ends_at := NOW() + INTERVAL '14 days';
    
    -- Create subscription record with trial
    INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        is_trial,
        trial_started_at,
        trial_ends_at,
        auto_renew
    ) VALUES (
        p_user_id,
        p_plan_id,
        'active',
        NOW(),
        v_trial_ends_at,
        true,
        NOW(),
        v_trial_ends_at,
        true
    )
    RETURNING id INTO v_subscription_id;
    
    -- Create trial tracking record
    INSERT INTO subscription_trials (
        user_id,
        subscription_id,
        plan_id,
        started_at,
        ends_at,
        status
    ) VALUES (
        p_user_id,
        v_subscription_id,
        p_plan_id,
        NOW(),
        v_trial_ends_at,
        'active'
    )
    RETURNING id INTO v_trial_id;
    
    -- Return success
    RETURN QUERY SELECT true, v_subscription_id, v_trial_id, v_trial_ends_at, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. FUNCTION TO CONVERT TRIAL TO PAID
-- =============================================

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
    
    -- Update subscription
    UPDATE user_subscriptions
    SET 
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

-- =============================================
-- 6. FUNCTION TO EXPIRE TRIALS
-- =============================================

CREATE OR REPLACE FUNCTION expire_trials()
RETURNS TABLE (
    expired_count INTEGER
) AS $$
DECLARE
    v_expired_count INTEGER := 0;
BEGIN
    -- Update expired trial subscriptions
    UPDATE user_subscriptions
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE is_trial = true 
    AND trial_ends_at < NOW() 
    AND status = 'active';
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    
    -- Update trial tracking records
    UPDATE subscription_trials
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'active' 
    AND ends_at < NOW();
    
    RETURN QUERY SELECT v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. FUNCTION TO CANCEL TRIAL
-- =============================================

CREATE OR REPLACE FUNCTION cancel_trial(
    p_subscription_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    error TEXT
) AS $$
BEGIN
    -- Update subscription
    UPDATE user_subscriptions
    SET 
        status = 'cancelled',
        auto_renew = false,
        updated_at = NOW()
    WHERE id = p_subscription_id AND user_id = p_user_id AND is_trial = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trial subscription not found'::TEXT;
        RETURN;
    END IF;
    
    -- Update trial record
    UPDATE subscription_trials
    SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE subscription_id = p_subscription_id;
    
    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION has_used_trial(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION start_trial(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION convert_trial_to_paid(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_trial(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_trials() TO authenticated;

-- =============================================
-- 9. CREATE CRON JOB FOR TRIAL EXPIRATION
-- =============================================

-- Note: This requires pg_cron extension
-- Run daily at midnight to expire trials
-- SELECT cron.schedule('expire-trials', '0 0 * * *', 'SELECT expire_trials();');

-- =============================================
-- 10. SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SELLAR PRO TRIAL SYSTEM INSTALLED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Trial columns added to user_subscriptions';
    RAISE NOTICE '✅ subscription_trials table created';
    RAISE NOTICE '✅ Trial management functions created:';
    RAISE NOTICE '   - has_used_trial()';
    RAISE NOTICE '   - start_trial()';
    RAISE NOTICE '   - convert_trial_to_paid()';
    RAISE NOTICE '   - expire_trials()';
    RAISE NOTICE '   - cancel_trial()';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Update mobile app to use trial functions';
    RAISE NOTICE '   2. Set up cron job for trial expiration';
    RAISE NOTICE '   3. Update UI to show trial status';
    RAISE NOTICE '';
END $$;
