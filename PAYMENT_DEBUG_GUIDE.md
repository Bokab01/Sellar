# Payment Flow Debug Guide

## 🐛 Issue Found and Fixed

**Root Cause:** The `paystack-verify` Edge Function was using the wrong column name `credits` instead of `credit_balance` when updating the user's profile.

**Error:** `ERROR: 42703: column "credits" does not exist`

**Fix:** Changed all references from `credits` to `credit_balance` in `supabase/functions/paystack-verify/index.ts`

---

## 🔍 How to Debug Payment Flow

### Step 1: Make a Test Payment

1. Open the app and navigate to **Buy Credits**
2. Select any package (e.g., Starter - 120 credits)
3. Confirm the purchase in the modal
4. Complete payment with test card:
   ```
   Card: 5060 6666 6666 6666 666
   Expiry: 12/26
   CVV: 123
   PIN: 1234
   OTP: 123456
   ```

### Step 2: Watch the Console Logs

After completing payment, you should see these logs in order:

```
🔍 WebView navigation: https://checkout.paystack.com/paycomplete...
✅ Payment success detected
📝 Payment reference: sellar_1234567890_abc123
🎉 handlePaymentSuccess called with: { reference: 'sellar_...' }
🔄 Verifying payment with reference: sellar_...
✅ Payment verified: { status: 'success', ... }
📞 Calling onSuccess callback
💰 Buy Credits - Payment success handler called
📦 Package from request: { id: 'starter', credits: 120, ... }
🔄 Refreshing credits...
✅ Credits refreshed, new balance: 120
📢 Showing toast: Payment successful! 120 credits added to your account.
⏱️ Setting navigation timeout...
🚪 Closing payment modal
🔙 Navigating back...
```

### Step 3: Verify in Database

Run the queries in `test-payment-flow.sql`:

```sql
-- 1. Check transaction was created
SELECT * FROM paystack_transactions 
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- - status: 'success'
-- - webhook_processed: true
-- - manually_processed: true

-- 2. Check credits were added
SELECT * FROM credit_transactions 
WHERE type = 'purchase' 
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- - amount: 120 (or your package credits)
-- - type: 'purchase'
-- - balance_before: 0 (or previous balance)
-- - balance_after: 120 (or previous + new)

-- 3. Check user balance
SELECT credit_balance FROM profiles 
WHERE email = 'your-email@example.com';

-- Should show: 120 (or total credits)

-- 4. Check notification was sent
SELECT * FROM notifications 
WHERE type = 'payment_success' 
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- - title: 'Payment Successful! 🎉'
-- - message: '120 credits have been added to your account!'
```

---

## ✅ What Should Happen Now

After the fix is deployed, when you complete a payment:

1. ✅ **WebView detects success** - URL contains `paycomplete` or `trxref`
2. ✅ **Payment verification runs** - Calls `paystack-verify` Edge Function
3. ✅ **Credits are added** - Updates `profiles.credit_balance`
4. ✅ **Transaction recorded** - Inserts into `credit_transactions`
5. ✅ **Notification sent** - Inserts into `notifications`
6. ✅ **Success toast shows** - "Payment successful! X credits added"
7. ✅ **Balance refreshed** - Wallet shows new balance
8. ✅ **Auto-navigation** - Returns to previous screen after 1.5s

---

## 🚨 If It Still Doesn't Work

### Check 1: Edge Function Logs
Visit your Supabase Dashboard:
1. Go to **Edge Functions** → **paystack-verify**
2. Click **Logs**
3. Look for any errors during verification

### Check 2: Console Logs
Look for any errors in the app console:
- ❌ "Payment verification failed"
- ❌ "Failed to get profile"
- ❌ "Failed to update credits"

### Check 3: Network Requests
In your browser/debugger:
1. Check if `paystack-verify` Edge Function is being called
2. Check the response status (should be 200)
3. Check the response body for errors

### Check 4: RLS Policies
Make sure the user can:
- Read from `profiles` table
- Update their own `credit_balance`
- Insert into `credit_transactions`
- Insert into `notifications`

```sql
-- Test RLS as user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-id-here"}';

-- Try updating balance
UPDATE profiles 
SET credit_balance = credit_balance + 120 
WHERE id = 'user-id-here';

-- Should succeed without error
```

---

## 📊 Key Changes Made

### 1. Fixed Column Name
**File:** `supabase/functions/paystack-verify/index.ts`
- Changed: `credits` → `credit_balance`
- Lines: 221, 230, 236

### 2. Added Debug Logging
**File:** `components/PaymentModal/PaymentModal.tsx`
- Added: WebView navigation logging
- Added: Payment success handler logging
- Improved: URL detection patterns

**File:** `app/buy-credits.tsx`
- Added: Payment success handler logging
- Improved: Package info retrieval

### 3. Improved URL Detection
**File:** `components/PaymentModal/PaymentModal.tsx`
- Added patterns:
  - `checkout/paycomplete`
  - `trxref=`
  - `reference=`

---

## 🎉 Test Again!

1. Make a new test payment
2. Watch the console logs
3. Verify credits are added
4. Check you see the success toast
5. Confirm you're navigated back

**The fix is deployed and ready to test!** 🚀

