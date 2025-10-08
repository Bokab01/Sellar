# 🚀 Quick Payment Security Test Reference

## 1️⃣ Normal Payment (2 minutes)

```
✅ Open app → Buy Credits → Select "Starter" (GHS 15)
✅ Pay with test card: 5060 6666 6666 6666 666
✅ Expect: Success + 50 credits added
```

**Verify:**
```sql
SELECT reference, status, fraud_detected, amount/100 AS ghs
FROM paystack_transactions 
WHERE user_id = 'YOUR_ID' 
ORDER BY created_at DESC LIMIT 1;
-- Should show: status='success', fraud_detected=FALSE
```

---

## 2️⃣ Fraud Detection (5 minutes)

**Create fake transaction:**
```sql
INSERT INTO paystack_transactions (reference, user_id, purchase_type, purchase_id, amount, status)
VALUES ('fraud_test_' || NOW()::TEXT, 'YOUR_ID', 'credit_package', 'max', 1500, 'success')
RETURNING reference;
-- Claims Max (GHS 100) but paid GHS 15
```

**Verify it:**
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/paystack-verify" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"reference": "fraud_test_XXX"}'
```

**Expected:** ❌ Error: "Payment amount mismatch"

---

## 3️⃣ Edge Function Logs

**Supabase Dashboard → Functions → paystack-verify → Logs**

**Look for:**
- ✅ `"🔒 Validating payment amount..."`
- ✅ `"✅ Payment amount validated"`
- ❌ `"💀 FRAUD ALERT: Amount mismatch!"`
- ⚡ `"🚨 Suspicious activity detected"`

---

## 📊 Quick Status Check

```sql
-- One query to see everything
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') AS successful,
  COUNT(*) FILTER (WHERE fraud_detected = TRUE) AS fraud_blocked,
  COUNT(*) FILTER (WHERE verification_attempts > 3) AS rate_limited
FROM paystack_transactions
WHERE created_at > NOW() - INTERVAL '1 day';
```

**Expected Results:**
- `successful` = number of successful payments
- `fraud_blocked` = 0 (unless you tested fraud)
- `rate_limited` = 0 (unless you tested rate limit)

---

## 🎯 Success Criteria

✅ Normal payment works  
✅ Fraud gets blocked  
✅ Logs show validation  
✅ Credits added correctly  

---

## 🔧 Reset Test Data

```sql
-- Clean up test transactions
DELETE FROM paystack_transactions 
WHERE reference LIKE 'test_%' OR reference LIKE 'fraud_%';
```

---

## 🆘 Quick Fixes

**Payment blocked incorrectly?**
```sql
UPDATE paystack_transactions
SET fraud_detected = FALSE, status = 'pending'
WHERE reference = 'YOUR_REF';
```

**Rate limited?**
```sql
UPDATE paystack_transactions
SET verification_attempts = 0
WHERE reference = 'YOUR_REF';
```

---

## 📞 Where to Get Help

1. **Detailed Guide:** `TEST_PAYMENT_SECURITY_MOBILE.md`
2. **Setup Guide:** `PAYMENT_SECURITY_SETUP_GUIDE.md`
3. **All Queries:** `test-payment-security.sql`

---

**Start with Test 1 (Normal Payment) now!** 🚀

