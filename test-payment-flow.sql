-- Test Payment Flow Queries
-- Run these after making a test payment to debug

-- 1. Check latest Paystack transaction
SELECT 
    id,
    reference,
    user_id,
    amount,
    status,
    purchase_type,
    purchase_id,
    webhook_processed,
    manually_processed,
    created_at
FROM paystack_transactions 
ORDER BY created_at DESC 
LIMIT 3;

-- 2. Check if credits were added to user_credits table
SELECT 
    id,
    user_id,
    balance,
    lifetime_earned,
    lifetime_spent,
    updated_at
FROM user_credits 
WHERE user_id IN (
    SELECT id FROM profiles WHERE email = 'oseikwadwobernard@gmail.com'
);

-- 3. Check credit transaction log
SELECT 
    id,
    user_id,
    amount,
    type,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    created_at
FROM credit_transactions 
WHERE type = 'earned' AND metadata->>'source' = 'credit_purchase'
ORDER BY created_at DESC 
LIMIT 3;

-- 4. Check user's current balance in profiles (backward compatibility)
SELECT 
    id,
    email,
    credit_balance,
    updated_at
FROM profiles 
WHERE email = 'oseikwadwobernard@gmail.com';

-- 6. Check notification
SELECT 
    id,
    user_id,
    type,
    title,
    body,
    is_read,
    created_at
FROM notifications 
WHERE type = 'payment_success'
ORDER BY created_at DESC 
LIMIT 3;

-- 7. Check for any errors in transaction
SELECT 
    reference,
    status,
    paystack_response,
    webhook_processed,
    manually_processed
FROM paystack_transactions 
WHERE status = 'failed' OR status = 'pending'
ORDER BY created_at DESC 
LIMIT 5;

