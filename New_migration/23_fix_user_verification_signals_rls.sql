-- =============================================
-- FIX USER VERIFICATION SIGNALS RLS POLICY
-- Migration 23: Fix RLS policy issues for user_verification_signals table
-- =============================================

-- The issue is that trigger functions run without proper authentication context
-- causing RLS violations when trying to INSERT/UPDATE user_verification_signals

-- Solution 1: Make the trigger functions run with SECURITY DEFINER
-- This allows them to bypass RLS policies

-- First, let's recreate the function with SECURITY DEFINER
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
    -- Calculate account age
    SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER
    INTO v_account_age_days
    FROM profiles
    WHERE id = p_user_id;
    
    -- Calculate transaction metrics
    SELECT 
        COUNT(*) FILTER (WHERE status = 'confirmed'),
        COUNT(*)
    INTO v_successful_transactions, v_total_transactions
    FROM meetup_transactions
    WHERE buyer_id = p_user_id OR seller_id = p_user_id;
    
    -- Calculate review metrics
    SELECT COUNT(*) INTO v_reviews_given
    FROM reviews WHERE reviewer_id = p_user_id;
    
    SELECT COUNT(*) INTO v_reviews_received
    FROM reviews WHERE reviewed_user_id = p_user_id;
    
    -- Calculate trust score (simplified version)
    v_trust_score := 0;
    
    -- Account age: up to 20 points (1 point per month, max 20 months)
    v_trust_score := v_trust_score + LEAST(v_account_age_days / 30, 20);
    
    -- Successful transactions: 2 points each, max 30 points
    v_trust_score := v_trust_score + LEAST(v_successful_transactions * 2, 30);
    
    -- Reviews received: 1 point each, max 20 points
    v_trust_score := v_trust_score + LEAST(v_reviews_received, 20);
    
    -- Cap at 100
    v_trust_score := LEAST(v_trust_score, 100);
    
    -- Insert or update verification signals
    INSERT INTO user_verification_signals (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the main trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_user_verification_signals()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Update verification signals for relevant users
    IF TG_TABLE_NAME = 'meetup_transactions' THEN
        -- Update both buyer and seller
        FOR v_user_id IN SELECT unnest(ARRAY[NEW.buyer_id, NEW.seller_id]) LOOP
            PERFORM update_single_user_verification_signals(v_user_id);
        END LOOP;
    ELSIF TG_TABLE_NAME = 'reviews' THEN
        -- Update both reviewer and reviewed user
        PERFORM update_single_user_verification_signals(NEW.reviewer_id);
        PERFORM update_single_user_verification_signals(NEW.reviewed_user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_single_user_verification_signals TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_verification_signals TO authenticated;
