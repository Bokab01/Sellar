# Mobile App Payment Security Testing Guide

## 🧪 Testing Plan

We'll test 3 critical security features:
1. ✅ **Normal Payment** (should work)
2. ❌ **Amount Validation** (should block fraud)
3. ❌ **Rate Limiting** (should block spam)

---

## 📱 Test 1: Normal Payment Flow

### **What We're Testing:**
- Regular payment works correctly
- Credits are added
- No security blocks legitimate users

### **Steps:**

1. **Open Sellar app** → Go to **Wallet** → **Top Up Credits**

2. **Select "Starter" package** (GHS 15, 50 credits)

3. **Complete payment** on Paystack with test card:
   - Card: `5060 6666 6666 6666 666`
   - CVV: `123`
   - PIN: `1234`
   - OTP: `123456`

4. **Expected Result:**
   - ✅ Payment successful toast
   - ✅ 50 credits added to balance
   - ✅ Success screen shows for 3.5 seconds
   - ✅ Navigates back to buy-credits

5. **Verify in Database:**
   ```sql
   -- Check transaction
   SELECT reference, status, amount/100 AS amount_ghs, fraud_detected
   FROM paystack_transactions
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC LIMIT 1;
   
   -- Expected: status = 'success', fraud_detected = FALSE
   ```

6. **Check Logs:**
   - Supabase Dashboard → Functions → `paystack-verify` → Logs
   - Look for: `"✅ Payment amount validated"`

---

## 🚨 Test 2: Fraud Detection (Amount Validation)

### **What We're Testing:**
- System detects amount mismatch
- Blocks credit addition
- Flags transaction as fraud

### **Steps:**

1. **Create Fraudulent Test Transaction:**
   ```sql
   -- Run this in Supabase SQL Editor
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
     'YOUR_USER_ID',  -- Replace with your actual user ID
     'credit_package',
     'max',           -- Claims Max package (700 credits, GHS 100)
     1500,            -- But amount is only GHS 15 (FRAUD!)
     'success',       -- Simulate Paystack success
     'card'
   ) RETURNING reference;
   ```

2. **Copy the returned reference** (e.g., `test_fraud_1696776543`)

3. **Try to verify it** (you'll need to manually call the Edge Function):
   ```bash
   # In terminal or using Postman/Insomnia
   curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/paystack-verify" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"reference": "test_fraud_1696776543"}'
   ```

4. **Expected Result:**
   - ❌ HTTP 400 error
   - ❌ Error message: "Payment amount mismatch. Expected GHS 100 but received GHS 15."
   - ❌ No credits added

5. **Verify in Database:**
   ```sql
   SELECT 
     reference,
     status,
     fraud_detected,
     fraud_reason
   FROM paystack_transactions
   WHERE reference LIKE 'test_fraud_%'
   ORDER BY created_at DESC;
   
   -- Expected: fraud_detected = TRUE, status = 'failed'
   ```

6. **Check Logs:**
   - Look for: `"💀 FRAUD ALERT: Amount mismatch!"`
   - Should show expected vs actual amounts

---

## ⚡ Test 3: Rate Limiting

### **What We're Testing:**
- System blocks excessive verification attempts
- Prevents spam attacks
- Returns HTTP 429 after threshold

### **Steps:**

1. **Create Test Transaction:**
   ```sql
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
     'YOUR_USER_ID',
     'credit_package',
     'starter',
     1500,
     'pending',
     'card'
   ) RETURNING reference;
   ```

2. **Copy the reference**

3. **Call verify endpoint 7 times rapidly:**
   ```bash
   # Run this in terminal (bash/zsh)
   for i in {1..7}; do
     echo "Attempt $i:"
     curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/paystack-verify" \
       -H "Authorization: Bearer YOUR_JWT_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"reference": "test_ratelimit_XXX"}'
     echo ""
     sleep 0.5
   done
   ```

4. **Expected Results:**
   - Attempts 1-5: May process normally (or return "transaction not found")
   - Attempt 6+: ❌ HTTP 429 error
   - Error: "Too many verification attempts. Please wait a few minutes."

5. **Verify in Database:**
   ```sql
   SELECT 
     reference,
     verification_attempts,
     last_verification_at
   FROM paystack_transactions
   WHERE reference LIKE 'test_ratelimit_%';
   
   -- Expected: verification_attempts >= 5
   ```

6. **Check Logs:**
   - Look for: `"🚨 Suspicious activity detected"`
   - Should show attempt count and reason

---

## 📊 Verification Queries

### **Overall Security Status:**
```sql
-- Run this to see all security metrics
SELECT 
  COUNT(*) AS total_transactions,
  COUNT(*) FILTER (WHERE status = 'success') AS successful,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE fraud_detected = TRUE) AS fraud_attempts,
  COUNT(*) FILTER (WHERE verification_attempts > 3) AS high_attempts
FROM paystack_transactions
WHERE created_at > NOW() - INTERVAL '1 day';
```

### **Check Your Credit Balance:**
```sql
SELECT 
  u.balance AS current_credits,
  u.lifetime_earned,
  u.lifetime_spent,
  p.credit_balance AS profile_balance
FROM user_credits u
JOIN profiles p ON u.user_id = p.id
WHERE u.user_id = 'YOUR_USER_ID';
```

### **View Recent Transactions:**
```sql
SELECT 
  reference,
  purchase_id AS package,
  amount / 100 AS amount_ghs,
  status,
  fraud_detected,
  verification_attempts,
  webhook_processed,
  manually_processed,
  created_at
FROM paystack_transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔍 What to Look For

### **✅ Success Indicators:**

1. **Normal payments work smoothly**
   - No false positives
   - Credits added correctly
   - Fast processing

2. **Fraud detection catches mismatches**
   - Amount validation working
   - Transactions flagged correctly
   - Clear error messages

3. **Rate limiting prevents abuse**
   - HTTP 429 after threshold
   - Attempt tracking working
   - Cool-down period enforced

### **❌ Issues to Watch:**

1. **False positives** - Legitimate payments blocked
   - Check logs for reason
   - Verify package prices match

2. **False negatives** - Fraud not detected
   - Amount validation might be bypassed
   - Check Edge Function deployment

3. **Rate limit too strict** - Normal users blocked
   - Adjust thresholds in migration 39
   - Current: 5 attempts / 5 minutes

---

## 📈 Expected Test Results

| Test | Expected Outcome | What It Proves |
|------|------------------|----------------|
| Normal Payment | ✅ Success, credits added | System works for legitimate users |
| Fraud Attempt | ❌ Blocked, flagged as fraud | Amount validation working |
| Rate Limiting | ❌ Blocked after 5 attempts | Spam protection working |

---

## 🚀 Quick Test (No Database Access)

If you don't have database access, just test the normal payment flow:

1. Buy credits normally (Starter package)
2. Check if credits are added
3. Look at payment screen behavior
4. Check for any error messages

**What you should see:**
- ✅ Smooth payment flow
- ✅ Success screen visible for 3.5 seconds
- ✅ Credits appear in wallet
- ✅ No unexpected errors

---

## 🆘 Troubleshooting

### **Payment Fails with "Payment validation failed"**

**Possible causes:**
1. Package prices changed in `constants/monetization.ts`
2. Edge Function not updated
3. Paystack test mode vs live mode mismatch

**Solution:**
```sql
-- Verify package prices match
SELECT 'starter' AS pkg, 1500 AS expected_pesewas
UNION ALL SELECT 'seller', 2500
UNION ALL SELECT 'plus', 5000
UNION ALL SELECT 'max', 10000;
```

### **Rate Limited Too Early**

**Solution:**
```sql
-- Reset verification attempts for testing
UPDATE paystack_transactions
SET verification_attempts = 0, last_verification_at = NULL
WHERE reference = 'YOUR_REFERENCE';
```

### **Legitimate Payment Marked as Fraud**

**Solution:**
```sql
-- Clear fraud flag and reprocess
UPDATE paystack_transactions
SET 
  fraud_detected = FALSE,
  fraud_reason = NULL,
  status = 'pending'
WHERE reference = 'YOUR_REFERENCE';

-- Then verify again via app
```

---

## ✅ Test Checklist

- [ ] Normal payment completes successfully
- [ ] Credits are added to balance
- [ ] Success screen shows for 3.5 seconds
- [ ] Fraud detection blocks amount mismatch
- [ ] Rate limiting triggers after 5 attempts
- [ ] Transaction logs show correct status
- [ ] Edge Function logs show security checks
- [ ] No false positives (legitimate payments work)

---

## 📞 Need Help?

If tests fail unexpectedly:
1. Check Edge Function logs in Supabase Dashboard
2. Run verification queries above
3. Check `PAYMENT_SECURITY_SETUP_GUIDE.md` for troubleshooting
4. Look at `test-payment-security.sql` for more detailed queries

---

**Ready to test? Start with Test 1 (Normal Payment)!** 🚀

