-- =============================================
-- ADD MISSING REWARD SYSTEM FUNCTIONS
-- Add the missing get_user_reward_summary and award_community_credits functions
-- =============================================

-- Function to get user reward summary
CREATE OR REPLACE FUNCTION get_user_reward_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_credits INTEGER;
    v_total_rewards INTEGER;
    v_achievements_count INTEGER;
    v_recent_rewards JSON;
BEGIN
    -- Get total credits earned from rewards
    SELECT COALESCE(SUM(credits_earned), 0) INTO v_total_credits
    FROM community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get total rewards count
    SELECT COUNT(*) INTO v_total_rewards
    FROM community_rewards
    WHERE user_id = p_user_id AND is_validated = true;
    
    -- Get completed achievements count
    SELECT COUNT(*) INTO v_achievements_count
    FROM user_achievements
    WHERE user_id = p_user_id AND is_completed = true;
    
    -- Get recent rewards (last 10)
    SELECT json_agg(
        json_build_object(
            'id', id,
            'reward_type', reward_type,
            'credits_earned', credits_earned,
            'trigger_action', trigger_action,
            'created_at', created_at
        )
    ) INTO v_recent_rewards
    FROM (
        SELECT id, reward_type, credits_earned, trigger_action, created_at
        FROM community_rewards
        WHERE user_id = p_user_id AND is_validated = true
        ORDER BY created_at DESC
        LIMIT 10
    ) recent;
    
    RETURN json_build_object(
        'total_credits_earned', v_total_credits,
        'total_rewards', v_total_rewards,
        'achievements_unlocked', v_achievements_count,
        'recent_rewards', COALESCE(v_recent_rewards, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award community credits
CREATE OR REPLACE FUNCTION award_community_credits(
    p_user_id UUID,
    p_reward_type TEXT,
    p_credits_earned INTEGER,
    p_trigger_action TEXT DEFAULT 'manual'
)
RETURNS JSON AS $$
DECLARE
    v_reward_id UUID;
    v_transaction_id UUID;
    v_credit_balance INTEGER;
BEGIN
    -- Insert reward record
    INSERT INTO community_rewards (user_id, reward_type, credits_earned, is_validated, trigger_action)
    VALUES (p_user_id, p_reward_type, p_credits_earned, true, p_trigger_action)
    RETURNING id INTO v_reward_id;
    
    -- Create transaction record
    INSERT INTO transactions (user_id, transaction_type, amount, title, credits_amount, description, category)
    VALUES (p_user_id, 'credit_earned', p_credits_earned, 'Community Reward: ' || p_reward_type, p_credits_earned, 'Earned from ' || p_trigger_action, 'reward')
    RETURNING id INTO v_transaction_id;
    
    -- Update user credits
    UPDATE user_credits 
    SET balance = balance + p_credits_earned,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_credit_balance;
    
    -- If no existing credit record, create one
    IF v_credit_balance IS NULL THEN
        INSERT INTO user_credits (user_id, balance)
        VALUES (p_user_id, p_credits_earned)
        RETURNING balance INTO v_credit_balance;
    END IF;
    
    RETURN json_build_object(
        'success', true, 
        'reward_id', v_reward_id,
        'transaction_id', v_transaction_id,
        'new_balance', v_credit_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for reward functions
GRANT EXECUTE ON FUNCTION get_user_reward_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION award_community_credits(UUID, TEXT, INTEGER, TEXT) TO authenticated;

-- Verify the functions were created
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_user_reward_summary', 'award_community_credits')
AND routine_schema = 'public';
