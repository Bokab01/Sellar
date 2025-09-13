-- =============================================
-- SELLAR MOBILE APP - FIX VERIFICATION SIGNALS FUNCTION
-- Migration 37: Recreate missing update_single_user_verification_signals function
-- =============================================

-- The function update_single_user_verification_signals is missing
-- This function is critical for updating user trust metrics
-- Let's recreate it with proper security settings

-- Drop the function if it exists (to ensure clean recreation)
DROP FUNCTION IF EXISTS update_single_user_verification_signals(UUID);

-- Recreate the function with proper security and search path
CREATE OR REPLACE FUNCTION update_single_user_verification_signals(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_account_age_days INTEGER;
    v_successful_transactions INTEGER;
    v_total_transactions INTEGER;
    v_reviews_given INTEGER;
    v_reviews_received INTEGER;
    v_trust_score INTEGER;
BEGIN
    -- Calculate account age in days
    SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER
    INTO v_account_age_days
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Default to 0 if user not found
    v_account_age_days := COALESCE(v_account_age_days, 0);
    
    -- Count successful transactions (completed meetup transactions)
    SELECT COUNT(*)::INTEGER
    INTO v_successful_transactions
    FROM public.meetup_transactions
    WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND status = 'completed';
    
    -- Count total transactions
    SELECT COUNT(*)::INTEGER
    INTO v_total_transactions
    FROM public.meetup_transactions
    WHERE (buyer_id = p_user_id OR seller_id = p_user_id);
    
    -- Count reviews given by this user
    SELECT COUNT(*)::INTEGER
    INTO v_reviews_given
    FROM public.reviews
    WHERE reviewer_id = p_user_id;
    
    -- Count reviews received by this user
    SELECT COUNT(*)::INTEGER
    INTO v_reviews_received
    FROM public.reviews
    WHERE reviewed_user_id = p_user_id;
    
    -- Calculate trust score (0-100)
    v_trust_score := 0;
    
    -- Successful transactions: +5 per transaction (max 50 points)
    v_trust_score := v_trust_score + LEAST(v_successful_transactions * 5, 50);
    
    -- Reviews received: +2 per review (max 20 points)
    v_trust_score := v_trust_score + LEAST(v_reviews_received * 2, 20);
    
    -- Reviews given: +1 per review (max 10 points)
    v_trust_score := v_trust_score + LEAST(v_reviews_given, 10);
    
    -- Account age: +1 per 30 days (max 10 points)
    v_trust_score := v_trust_score + LEAST(v_account_age_days / 30, 10);
    
    -- Ensure trust score doesn't exceed 100
    v_trust_score := LEAST(v_trust_score, 100);
    
    -- Insert or update verification signals
    INSERT INTO public.user_verification_signals (
        user_id, successful_transactions, total_transactions, 
        reviews_given, reviews_received, trust_score, account_age_days,
        last_activity_at, updated_at
    ) VALUES (
        p_user_id, v_successful_transactions, v_total_transactions,
        v_reviews_given, v_reviews_received, v_trust_score, v_account_age_days,
        NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        successful_transactions = EXCLUDED.successful_transactions,
        total_transactions = EXCLUDED.total_transactions,
        reviews_given = EXCLUDED.reviews_given,
        reviews_received = EXCLUDED.reviews_received,
        trust_score = EXCLUDED.trust_score,
        account_age_days = EXCLUDED.account_age_days,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_single_user_verification_signals TO authenticated;

-- Test the function exists
DO $$
BEGIN
    -- Test function creation
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_single_user_verification_signals'
    ) THEN
        RAISE NOTICE 'SUCCESS: update_single_user_verification_signals function created successfully';
    ELSE
        RAISE EXCEPTION 'FAILED: update_single_user_verification_signals function was not created';
    END IF;
END $$;
