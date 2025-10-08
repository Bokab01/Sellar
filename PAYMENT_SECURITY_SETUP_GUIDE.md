# Payment Security Implementation Guide

## 🔐 Overview

This guide covers the security enhancements added to the Paystack payment system to prevent fraud, abuse, and ensure payment integrity.

---

## ✅ What Was Implemented

### 1. **Amount Validation**
- ✅ Validates payment amount matches package price
- ✅ Prevents users from paying less and claiming more credits
- ✅ Works in both Edge Function (manual verification) and Webhook
- ✅ Flags fraudulent transactions in database

### 2. **Rate Limiting**
- ✅ Tracks verification attempts per user
- ✅ Blocks users with >5 attempts in 5 minutes
- ✅ Blocks users with >10 failures in 1 hour
- ✅ Blocks users with fraud history in 24 hours

### 3. **Transaction Timeout**
- ✅ Expires pending transactions after 1 hour
- ✅ Automatic cleanup via database function
- ✅ Prevents stale transactions from lingering

### 4. **Fraud Detection**
- ✅ Tracks fraudulent transactions
- ✅ Records fraud reason and timestamp
- ✅ Logs amount mismatches with details
- ✅ Sends notification to user on fraud detection

### 5. **Security Metrics**
- ✅ Dashboard function for monitoring
- ✅ Tracks success/failure/fraud rates
- ✅ Webhook vs manual verification stats

---

## 📋 Deployment Steps

### **Step 1: Deploy Database Migration**

```bash
# Navigate to project root
cd /path/to/Sellar-mobile-app

# Deploy migration 39
supabase db push
```

**Verify deployment:**
```sql
-- Check if new columns exist
SELECT 
  fraud_detected, 
  fraud_reason, 
  verification_attempts 
FROM paystack_transactions 
LIMIT 1;

-- Test security metrics function
SELECT * FROM get_payment_security_metrics(7);
```

---

### **Step 2: Deploy Updated Edge Functions**

```bash
# Deploy paystack-verify with amount validation and rate limiting
supabase functions deploy paystack-verify

# Deploy paystack-webhook with amount validation
supabase functions deploy paystack-webhook

# Verify deployment
supabase functions list
```

**Expected output:**
```
  paystack-initialize    active    v1
  paystack-verify        active    v2  ← Updated
  paystack-webhook       active    v2  ← Updated
  expire-trials          active    v1
  auto-recover-expired-reservations  active    v1
```

---

### **Step 3: Set Up Transaction Expiration Cron Job**

**Option A: Using pg_cron (Recommended for Pro Plans)**

```sql
-- Create cron job to run every hour
SELECT cron.schedule(
  'expire-old-pending-transactions',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT expire_old_pending_transactions();$$
);

-- Verify cron job
SELECT * FROM cron.job;
```

**Option B: Using External Cron Service (cron-job.org)**

1. **Create Supabase Edge Function:**
```bash
# Create function directory
mkdir -p supabase/functions/expire-transactions

# Create index.ts (see below)

# Deploy
supabase functions deploy expire-transactions
```

2. **Create Edge Function:**
```typescript
// supabase/functions/expire-transactions/index.ts
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Verify cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');

  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the function
    const { data, error } = await supabase.rpc('expire_old_pending_transactions');

    if (error) throw error;

    console.log('✅ Transaction expiration complete:', data);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: data[0]?.expired_count || 0,
        references: data[0]?.references || [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Transaction expiration failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

3. **Set up on cron-job.org:**
   - URL: `https://your-project.supabase.co/functions/v1/expire-transactions`
   - Schedule: Every hour (`0 * * * *`)
   - Add custom header: `x-cron-secret: your-secret-value`

---

### **Step 4: Test Security Features**

#### **Test 1: Amount Validation**

```sql
-- Create a test transaction with wrong amount
INSERT INTO paystack_transactions (
  reference, user_id, purchase_type, purchase_id, amount, status
) VALUES (
  'test_fraud_' || NOW()::TEXT,
  'your-user-id',
  'credit_package',
  'starter', -- Starter should be 1500 pesewas
  500, -- ← WRONG AMOUNT (too low)
  'pending'
);
```

Then try to verify it via Edge Function. Should fail with:
> "Payment amount mismatch. Expected GHS 15 but received GHS 5. This transaction has been flagged for review."

#### **Test 2: Rate Limiting**

```bash
# Try to verify same payment 6+ times rapidly
for i in {1..7}; do
  curl -X POST "https://your-project.supabase.co/functions/v1/paystack-verify" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reference": "test_reference"}' &
done
```

After 5 attempts, should return:
> "Too many verification attempts. Please wait a few minutes before trying again."

#### **Test 3: Transaction Expiration**

```sql
-- Create old pending transaction
INSERT INTO paystack_transactions (
  reference, user_id, purchase_type, purchase_id, amount, status, created_at
) VALUES (
  'test_old_' || NOW()::TEXT,
  'your-user-id',
  'credit_package',
  'starter',
  1500,
  'pending',
  NOW() - INTERVAL '2 hours' -- 2 hours old
);

-- Run expiration function
SELECT * FROM expire_old_pending_transactions();

-- Verify status changed
SELECT status FROM paystack_transactions 
WHERE reference LIKE 'test_old_%';
-- Should return 'expired'
```

---

## 📊 Monitoring & Maintenance

### **Security Dashboard Queries**

#### **Overall Security Metrics (Last 7 Days)**
```sql
SELECT * FROM get_payment_security_metrics(7);
```

Expected output:
```
| metric                | count | percentage |
|-----------------------|-------|------------|
| Total Transactions    | 150   | 100.00     |
| Successful Payments   | 140   | 93.33      |
| Failed Payments       | 8     | 5.33       |
| Expired Transactions  | 2     | 1.33       |
| Fraud Detected        | 0     | 0.00       | ← Monitor this!
| Webhook Processed     | 135   | 90.00      |
| Manually Verified     | 5     | 3.33       |
```

#### **Fraud Alert Query**
```sql
-- Check for any fraudulent transactions
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
```

#### **High Verification Attempt Users**
```sql
-- Find users trying to verify too many times
SELECT 
  user_id,
  reference,
  verification_attempts,
  last_verification_at,
  status
FROM paystack_transactions
WHERE verification_attempts > 3
ORDER BY verification_attempts DESC;
```

#### **Expired Transactions Report**
```sql
-- See what got expired
SELECT 
  reference,
  user_id,
  purchase_type,
  amount / 100 AS amount_ghs,
  created_at,
  updated_at,
  (updated_at - created_at) AS time_pending
FROM paystack_transactions
WHERE status = 'expired'
ORDER BY updated_at DESC
LIMIT 20;
```

---

## 🚨 Alert Triggers (Recommended)

Set up alerts for:

1. **Fraud Detection:**
   ```sql
   -- Create notification for admin when fraud detected
   -- (Add trigger or monitor this query)
   SELECT COUNT(*) FROM paystack_transactions 
   WHERE fraud_detected = TRUE 
     AND fraud_detected_at > NOW() - INTERVAL '1 hour';
   ```

2. **High Failure Rate:**
   ```sql
   -- Alert if >20% of transactions failing
   WITH stats AS (
     SELECT * FROM get_payment_security_metrics(1)
   )
   SELECT 
     (SELECT percentage FROM stats WHERE metric = 'Failed Payments') AS failure_rate;
   -- Alert if > 20
   ```

3. **Unusual Verification Patterns:**
   ```sql
   -- Alert on users with >10 verification attempts
   SELECT user_id, COUNT(*) as attempt_count
   FROM paystack_transactions
   WHERE last_verification_at > NOW() - INTERVAL '1 hour'
   GROUP BY user_id
   HAVING COUNT(*) > 10;
   ```

---

## 🔍 Troubleshooting

### **Issue: Legitimate payment flagged as fraud**

**Check:**
```sql
SELECT 
  reference,
  purchase_type,
  purchase_id,
  amount,
  fraud_reason
FROM paystack_transactions
WHERE reference = 'YOUR_REFERENCE';
```

**Fix:**
```sql
-- Manually clear fraud flag and reprocess
UPDATE paystack_transactions
SET 
  fraud_detected = FALSE,
  fraud_reason = NULL,
  status = 'pending'
WHERE reference = 'YOUR_REFERENCE';

-- Then manually verify via Paystack API
```

---

### **Issue: Rate limiting blocking legitimate users**

**Check:**
```sql
SELECT * FROM check_suspicious_payment_activity(
  'user-id',
  'reference'
);
```

**Fix:**
```sql
-- Reset verification attempts
UPDATE paystack_transactions
SET 
  verification_attempts = 0,
  last_verification_at = NULL
WHERE reference = 'YOUR_REFERENCE';
```

---

### **Issue: Transactions not expiring**

**Check if cron is running:**
```sql
-- For pg_cron
SELECT * FROM cron.job WHERE jobname = 'expire-old-pending-transactions';

-- Check last run
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-old-pending-transactions')
ORDER BY start_time DESC
LIMIT 5;
```

**Manual trigger:**
```sql
SELECT * FROM expire_old_pending_transactions();
```

---

## 📈 Success Metrics

After implementing these security features, you should see:

✅ **0% fraud transactions** (amount mismatches caught)  
✅ **<5% expired transactions** (users completing within 1 hour)  
✅ **>90% webhook processing** (reliable webhook delivery)  
✅ **<1% manual verification** (webhooks working well)  
✅ **0 duplicate credit additions** (idempotency working)

---

## 🔄 Maintenance Schedule

- **Daily:** Check fraud detection query
- **Weekly:** Review security metrics
- **Monthly:** Analyze expired transaction trends
- **Quarterly:** Update package prices if changed

---

## 🚀 Next Steps (Optional Enhancements)

1. **IP Address Logging:** Track IP for each transaction
2. **Geolocation Validation:** Flag payments from unexpected countries
3. **Device Fingerprinting:** Detect multiple accounts from same device
4. **Machine Learning:** Build fraud detection model
5. **Admin Dashboard:** Visual interface for security metrics

---

## 📞 Support

If you encounter issues:
1. Check Edge Function logs: `supabase functions logs paystack-verify`
2. Check database logs: `SELECT * FROM get_payment_security_metrics(1)`
3. Review fraud transactions: See "Fraud Alert Query" above
4. Contact your team if a legitimate payment is blocked

---

**✅ Security Implementation Complete!**

Your payment system is now hardened against:
- Amount manipulation
- Duplicate processing
- Rate limit abuse
- Stale transactions
- Fraud attempts

Monitor the metrics regularly and adjust thresholds as needed.

