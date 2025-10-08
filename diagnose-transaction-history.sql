-- Comprehensive Transaction History Diagnostic
-- Use this to find out why credit purchases aren't showing in transaction history

-- ============================================
-- 1. Check ALL Credit Transactions for User
-- ============================================
SELECT 
    id,
    user_id,
    amount,
    type,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    metadata,
    created_at
FROM credit_transactions 
WHERE user_id IN (
    SELECT id FROM profiles WHERE email = 'oseikwadwobernard@gmail.com'
)
ORDER BY created_at DESC 
LIMIT 10;


-- ============================================
-- 2. Check Paystack Transactions
-- ============================================
SELECT 
    reference,
    status,
    amount,
    purchase_type,
    purchase_id,
    webhook_processed,
    manually_processed,
    created_at
FROM paystack_transactions
WHERE user_id IN (
    SELECT id FROM profiles WHERE email = 'oseikwadwobernard@gmail.com'
)
AND status = 'success'
ORDER BY created_at DESC
LIMIT 10;


-- ============================================
-- 3. Check User Credits Balance
-- ============================================
SELECT 
    uc.balance,
    uc.lifetime_earned,
    uc.lifetime_spent,
    uc.updated_at,
    p.credit_balance as profile_balance,
    p.email
FROM user_credits uc
JOIN profiles p ON uc.user_id = p.id
WHERE p.email = 'oseikwadwobernard@gmail.com';


-- ============================================
-- 4. Cross-Reference: Successful Payments vs Credit Transactions
-- ============================================
-- This shows which successful payments have corresponding credit transactions
SELECT 
    pt.reference,
    pt.amount as payment_amount,
    pt.purchase_id as package_id,
    pt.status,
    pt.created_at as payment_at,
    ct.id as transaction_logged,
    ct.amount as credits_added,
    ct.type as transaction_type,
    ct.created_at as logged_at
FROM paystack_transactions pt
LEFT JOIN credit_transactions ct ON ct.reference_id = pt.reference
WHERE pt.user_id IN (
    SELECT id FROM profiles WHERE email = 'oseikwadwobernard@gmail.com'
)
AND pt.status = 'success'
ORDER BY pt.created_at DESC
LIMIT 10;


-- ============================================
-- 5. Check for Missing Transaction Logs
-- ============================================
-- Successful payments that DON'T have a credit_transaction entry
SELECT 
    pt.reference,
    pt.amount as paid_amount,
    pt.purchase_id as package_id,
    pt.created_at,
    'Missing credit transaction log' as issue
FROM paystack_transactions pt
WHERE pt.user_id IN (
    SELECT id FROM profiles WHERE email = 'oseikwadwobernard@gmail.com'
)
AND pt.status = 'success'
AND pt.webhook_processed = true
AND NOT EXISTS (
    SELECT 1 
    FROM credit_transactions ct 
    WHERE ct.reference_id = pt.reference
)
ORDER BY pt.created_at DESC;


-- ============================================
-- 6. Check Transaction Table Schema
-- ============================================
-- Verify the credit_transactions table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'credit_transactions'
ORDER BY ordinal_position;


-- ============================================
-- 7. Check for RLS Issues
-- ============================================
-- Check if Row Level Security is blocking inserts
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'credit_transactions';


-- ============================================
-- EXPECTED RESULTS
-- ============================================

/*
WHAT YOU SHOULD SEE:

Query 1: Should show all your credit transactions including purchases
Query 2: Should show all successful Paystack payments
Query 3: Should show your current balance matching total credits purchased
Query 4: Should show each successful payment with its corresponding transaction log
Query 5: Should be EMPTY (if there are rows, those payments didn't log transactions)

If Query 5 shows rows, it means:
- The Edge Function completed the payment
- Credits were added to user_credits
- BUT the credit_transactions table wasn't updated

This could be due to:
1. RLS policies blocking the insert
2. Error in the transaction logging code
3. Missing columns in the table
*/

