-- Script to Remove/Deduct User Credits
-- Use this for testing, refunds, or administrative actions

-- ============================================
-- OPTION 1: Remove Specific Amount of Credits
-- ============================================

-- Replace 'user-email@example.com' with actual email
-- Replace 50 with the amount to deduct
DO $$
DECLARE
    v_user_id UUID;
    v_current_balance INTEGER;
    v_amount_to_deduct INTEGER := 50; -- CHANGE THIS
    v_new_balance INTEGER;
BEGIN
    -- Get user ID and current balance
    SELECT id INTO v_user_id 
    FROM profiles 
    WHERE email = 'oseikwadwobernard@gmail.com'; -- CHANGE THIS EMAIL
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Get current balance from user_credits
    SELECT balance INTO v_current_balance 
    FROM user_credits 
    WHERE user_id = v_user_id;
    
    IF v_current_balance IS NULL THEN
        v_current_balance := 0;
    END IF;
    
    -- Calculate new balance (don't go negative)
    v_new_balance := GREATEST(v_current_balance - v_amount_to_deduct, 0);
    
    -- Update user_credits
    UPDATE user_credits 
    SET 
        balance = v_new_balance,
        lifetime_spent = lifetime_spent + (v_current_balance - v_new_balance),
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Also update profile for backward compatibility
    UPDATE profiles 
    SET credit_balance = v_new_balance 
    WHERE id = v_user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        balance_before,
        balance_after,
        reference_type,
        reference_id,
        metadata
    ) VALUES (
        v_user_id,
        (v_current_balance - v_new_balance),
        'spent',
        v_current_balance,
        v_new_balance,
        'admin_adjustment',
        gen_random_uuid()::text,
        jsonb_build_object(
            'reason', 'Administrative credit removal',
            'deducted_amount', v_amount_to_deduct,
            'actual_deduction', (v_current_balance - v_new_balance)
        )
    );
    
    RAISE NOTICE 'Credits deducted successfully!';
    RAISE NOTICE 'Previous balance: %', v_current_balance;
    RAISE NOTICE 'Amount deducted: %', (v_current_balance - v_new_balance);
    RAISE NOTICE 'New balance: %', v_new_balance;
END $$;


-- ============================================
-- OPTION 2: Reset Credits to Zero
-- ============================================

-- Uncomment to use:
/*
DO $$
DECLARE
    v_user_id UUID;
    v_current_balance INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM profiles 
    WHERE email = 'oseikwadwobernard@gmail.com'; -- CHANGE THIS EMAIL
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Get current balance
    SELECT balance INTO v_current_balance 
    FROM user_credits 
    WHERE user_id = v_user_id;
    
    IF v_current_balance IS NULL THEN
        v_current_balance := 0;
    END IF;
    
    -- Reset to zero
    UPDATE user_credits 
    SET 
        balance = 0,
        lifetime_spent = lifetime_spent + v_current_balance,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
    -- Also update profile
    UPDATE profiles 
    SET credit_balance = 0 
    WHERE id = v_user_id;
    
    -- Log the transaction
    INSERT INTO credit_transactions (
        user_id,
        amount,
        type,
        balance_before,
        balance_after,
        reference_type,
        reference_id,
        metadata
    ) VALUES (
        v_user_id,
        v_current_balance,
        'spent',
        v_current_balance,
        0,
        'admin_adjustment',
        gen_random_uuid()::text,
        jsonb_build_object(
            'reason', 'Reset credits to zero'
        )
    );
    
    RAISE NOTICE 'Credits reset to zero!';
    RAISE NOTICE 'Previous balance: %', v_current_balance;
END $$;
*/


-- ============================================
-- OPTION 3: View User Credits Before Removal
-- ============================================

SELECT 
    p.email,
    p.credit_balance as profile_balance,
    uc.balance as user_credits_balance,
    uc.lifetime_earned,
    uc.lifetime_spent,
    uc.updated_at
FROM profiles p
LEFT JOIN user_credits uc ON p.id = uc.user_id
WHERE p.email = 'oseikwadwobernard@gmail.com'; -- CHANGE THIS EMAIL


-- ============================================
-- OPTION 4: View Recent Credit Transactions
-- ============================================

SELECT 
    ct.created_at,
    ct.type,
    ct.amount,
    ct.balance_before,
    ct.balance_after,
    ct.reference_type,
    ct.metadata
FROM credit_transactions ct
JOIN profiles p ON ct.user_id = p.id
WHERE p.email = 'oseikwadwobernard@gmail.com' -- CHANGE THIS EMAIL
ORDER BY ct.created_at DESC
LIMIT 10;


-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================

/*
1. BEFORE RUNNING:
   - Change 'oseikwadwobernard@gmail.com' to the target user's email
   - For OPTION 1: Change the amount to deduct (v_amount_to_deduct := 50)
   
2. RUN THE SCRIPT:
   - Execute in your database client or Supabase SQL Editor
   - Check the NOTICE messages for confirmation
   
3. VERIFY:
   - Run OPTION 3 to see the updated balance
   - Run OPTION 4 to see the transaction log
   
4. NOTES:
   - Credits won't go below 0 (automatic safety check)
   - All changes are logged in credit_transactions
   - Both user_credits and profiles tables are updated
   - Type is 'spent' to indicate deduction
*/

