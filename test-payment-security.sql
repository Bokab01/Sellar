-- ============================================================================
-- Payment Security Test Script
-- Run these queries to test the security features
-- ============================================================================

-- ============================================================================
-- SETUP: Get your user ID and create test data
-- ============================================================================

-- 1. Get your user ID (replace email with yours)
SELECT id, email FROM auth.users WHERE email = 'oseikwadwobernard@gmail.com';
-- Copy the ID for use below

-- Set your user ID here (replace with actual UUID from above)
\set user_id '00000000-0000-0000-0000-000000000000'

-- ============================================================================
-- TEST 1: Normal Payment Flow (Should Work)
-- ============================================================================

-- Create a legitimate test transaction
INSERT INTO paystack_transactions (
  reference,
  user_id,
  purchase_type,
  purchase_id,
  amount,
  status,
  payment_method
) VALUES (
  'test_legitimate_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  :'user_id',
  'credit_package',
  'starter',  -- 50 credits
  1500,       -- GHS 15 = 1500 pesewas (CORRECT AMOUNT)
  'pending',
  'card'
) RETURNING reference, amount / 100 AS amount_ghs, purchase_id;

-- Note the reference from above, then simulate Paystack verification
-- In your mobile app, call paystack-verify with this reference
-- Expected: SUCCESS - Credits should be added

-- ============================================================================
-- TEST 2: Amount Manipulation Attack (Should Fail - Fraud Detection)
-- ============================================================================

-- Create a fraudulent transaction (wrong amount)
INSERT INTO paystack_transactions (
  reference,
  user_id,
  purchase_type,
  purchase_id,
  amount,
  status,
  payment_method
) VALUES (
  'test_fraud_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  :'user_id',
  'credit_package',
  'max',      -- Claims Max package (700 credits, should be GHS 100)
  1500,       -- But only paid GHS 15 (FRAUD!)
  'pending',
  'card'
) RETURNING reference, amount / 100 AS amount_ghs, purchase_id;

-- Try to verify this payment via Edge Function
-- Expected: BLOCKED - Transaction flagged as fraud
-- Error: "Payment amount mismatch. Expected GHS 100 but received GHS 15."

-- ============================================================================
-- TEST 3: Check Current Payment Status
-- ============================================================================

-- View all your recent test transactions
SELECT 
  reference,
  purchase_type,
  purchase_id,
  amount / 100 AS amount_ghs,
  status,
  fraud_detected,
  fraud_reason,
  verification_attempts,
  webhook_processed,
  created_at
FROM paystack_transactions
WHERE user_id = :'user_id'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- TEST 4: Check Credit Balance
-- ============================================================================

-- Check your current credit balance
SELECT 
  balance,
  lifetime_earned,
  lifetime_spent
FROM user_credits
WHERE user_id = :'user_id';

-- Also check profiles table
SELECT 
  credit_balance,
  full_name,
  email
FROM profiles
WHERE id = :'user_id';

-- ============================================================================
-- TEST 5: Check Credit Transactions Log
-- ============================================================================

-- View recent credit transactions
SELECT 
  amount,
  type,
  balance_before,
  balance_after,
  reference_type,
  metadata->>'package_name' AS package,
  metadata->>'source' AS source,
  created_at
FROM credit_transactions
WHERE user_id = :'user_id'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- TEST 6: Simulate Multiple Verification Attempts (Rate Limiting)
-- ============================================================================

-- Create a test transaction for rate limit testing
INSERT INTO paystack_transactions (
  reference,
  user_id,
  purchase_type,
  purchase_id,
  amount,
  status,
  payment_method
) VALUES (
  'test_ratelimit_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  :'user_id',
  'credit_package',
  'starter',
  1500,
  'pending',
  'card'
) RETURNING reference;

-- Note the reference, then try to verify it 6+ times rapidly in your app
-- Expected: First 5 attempts process normally, 6th returns HTTP 429
-- Error: "Too many verification attempts. Please wait a few minutes."

-- ============================================================================
-- TEST 7: Check for Fraudulent Transactions
-- ============================================================================

-- Query all fraud attempts
SELECT 
  reference,
  user_id,
  purchase_type,
  purchase_id,
  amount / 100 AS amount_ghs,
  fraud_reason,
  fraud_detected_at,
  metadata
FROM paystack_transactions
WHERE fraud_detected = TRUE
ORDER BY fraud_detected_at DESC;

-- Expected: Should show any transactions where amount didn't match package

-- ============================================================================
-- TEST 8: Verify Payment Amount Validation is Working
-- ============================================================================

-- These are the correct package prices (what Edge Function expects)
SELECT 
  'starter' AS package,
  50 AS credits,
  15 AS price_ghs,
  1500 AS price_pesewas

UNION ALL

SELECT 
  'seller',
  120,
  25,
  2500

UNION ALL

SELECT 
  'plus',
  300,
  50,
  5000

UNION ALL

SELECT 
  'max',
  700,
  100,
  10000;

-- ============================================================================
-- TEST 9: Check Verification Attempts Tracking
-- ============================================================================

-- See which transactions have high verification attempts
SELECT 
  reference,
  status,
  verification_attempts,
  last_verification_at,
  created_at,
  (NOW() - created_at) AS age
FROM paystack_transactions
WHERE user_id = :'user_id'
  AND verification_attempts > 0
ORDER BY verification_attempts DESC;

-- ============================================================================
-- TEST 10: Clean Up Test Data (Optional)
-- ============================================================================

-- Delete test transactions (CAUTION: Only delete test data!)
-- DELETE FROM paystack_transactions 
-- WHERE reference LIKE 'test_%' 
--   AND user_id = :'user_id';

-- Check if any test references remain
SELECT COUNT(*) AS test_transactions
FROM paystack_transactions
WHERE reference LIKE 'test_%'
  AND user_id = :'user_id';

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

-- Overall payment security status
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') AS successful_payments,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_payments,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_payments,
  COUNT(*) FILTER (WHERE fraud_detected = TRUE) AS fraud_attempts,
  COUNT(*) FILTER (WHERE verification_attempts > 3) AS high_verification_attempts,
  COUNT(*) FILTER (WHERE webhook_processed = TRUE) AS webhook_processed,
  COUNT(*) FILTER (WHERE manually_processed = TRUE) AS manually_processed
FROM paystack_transactions
WHERE user_id = :'user_id';

-- ============================================================================
-- INSTRUCTIONS FOR MOBILE APP TESTING
-- ============================================================================

/*

To test the Edge Functions from your mobile app:

1. TEST NORMAL PAYMENT:
   - Go to Buy Credits screen
   - Select "Starter" package (GHS 15)
   - Complete payment on Paystack
   - Expected: Credits added successfully ✅

2. TEST FRAUD DETECTION:
   - Use the test transaction created in TEST 2 above
   - Try to verify it via the app
   - Expected: Error message, no credits added ❌

3. TEST RATE LIMITING:
   - Use the test transaction from TEST 6
   - Tap verify button 6+ times rapidly
   - Expected: After 5 attempts, "Too many attempts" error ❌

4. VERIFY RESULTS:
   - Run the queries in TEST 3, 4, and 5 above
   - Check fraud_detected = TRUE for fraudulent attempts
   - Check verification_attempts count

5. MONITOR LOGS:
   - Supabase Dashboard → Edge Functions → paystack-verify
   - Look for these log messages:
     * "🔒 Validating payment amount..."
     * "✅ Payment amount validated"
     * "💀 FRAUD ALERT: Amount mismatch!"
     * "🚨 Suspicious activity detected"

*/

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================

-- Quick verification command (run this after testing)
SELECT 
  'Security Features Status' AS status,
  CASE 
    WHEN COUNT(*) FILTER (WHERE fraud_detected = TRUE) > 0 
    THEN '✅ Fraud Detection Working'
    ELSE '⏳ No fraud attempts yet'
  END AS fraud_detection,
  CASE 
    WHEN MAX(verification_attempts) > 1 
    THEN '✅ Rate Limiting Working'
    ELSE '⏳ No multiple attempts yet'
  END AS rate_limiting
FROM paystack_transactions
WHERE user_id = :'user_id'
  AND reference LIKE 'test_%';

