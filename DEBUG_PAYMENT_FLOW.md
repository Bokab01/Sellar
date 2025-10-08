# Debug Payment Flow Guide

## Changes Made to Help Debug

### 1. Added Console Logging

**PaymentModal (`components/PaymentModal/PaymentModal.tsx`):**
- ✅ Logs every WebView navigation URL
- ✅ Logs when payment success is detected
- ✅ Logs payment reference extraction
- ✅ Logs verification process
- ✅ Logs callback execution

**Buy Credits Screen (`app/buy-credits.tsx`):**
- ✅ Logs when success handler is called
- ✅ Logs package information
- ✅ Logs credit refresh process
- ✅ Logs toast display
- ✅ Logs navigation

### 2. Improved Success Detection

Added more URL patterns to detect Paystack success:
- `callback`
- `success`
- `checkout/paycomplete` (Paystack's actual success page)
- `trxref=` (Paystack's transaction reference parameter)
- `reference=` (Our reference parameter)

---

## How to Debug Your Next Payment

### Step 1: Open Developer Console
In your terminal where the app is running, watch for logs starting with these emojis:
- 🔍 WebView navigation
- ✅ Payment success detected
- 📝 Payment reference
- 💰 Buy Credits handler
- 🔄 Refreshing credits
- 📢 Showing toast
- 🔙 Navigating back

### Step 2: Make a Test Payment

1. Open Buy Credits screen
2. Select a package (e.g., Starter - 120 credits)
3. Confirm in modal
4. Complete payment with test card:
   ```
   Card: 5060 6666 6666 6666 666
   Expiry: 12/26
   CVV: 123
   PIN: 1234
   ```

### Step 3: Watch the Console

You should see a sequence like this:

```
🔍 WebView navigation: https://paystack.com/pay/...
🔍 WebView navigation: https://checkout.paystack.com/...
🔍 WebView navigation: https://checkout.paystack.com/paycomplete?...
✅ Payment success detected
📝 Payment reference: sellar_1234567890_xyz
🎉 handlePaymentSuccess called with: { reference: 'sellar_1234567890_xyz' }
🔄 Verifying payment with reference: sellar_1234567890_xyz
✅ Payment verified: { status: 'success', ... }
📞 Calling onSuccess callback
💰 Buy Credits - Payment success handler called
📝 Reference: sellar_1234567890_xyz
📦 Package from request: { id: 'starter', credits: 120, ... }
🔄 Refreshing credits...
✅ Credits refreshed, new balance: 120
📢 Showing toast: Payment successful! 120 credits added to your account.
⏱️ Setting navigation timeout...
🚪 Closing payment modal
🔙 Navigating back...
```

### Step 4: If You Don't See the Logs

**Problem 1: No "WebView navigation" logs**
- The WebView might not be loading
- Check internet connection
- Check Paystack initialization

**Problem 2: "WebView navigation" but no "Payment success detected"**
- Copy the final URL from console
- Share it with me - I'll update the detection pattern

**Problem 3: "Payment success detected" but no "handlePaymentSuccess"**
- The success handler isn't being called
- Check if there's an error in the PaymentModal

**Problem 4: "handlePaymentSuccess" but no toast/navigation**
- The buy-credits success handler isn't being called
- Check if `onSuccess` prop is passed correctly

---

## Database Verification

After payment, run these queries to check:

```sql
-- 1. Check if transaction was recorded
SELECT * FROM paystack_transactions 
WHERE reference = 'YOUR_PAYMENT_REFERENCE'
LIMIT 1;

-- 2. Check if credits were added
SELECT * FROM credit_transactions 
WHERE reference_id = 'YOUR_PAYMENT_REFERENCE'
LIMIT 1;

-- 3. Check your current balance
SELECT credits FROM profiles 
WHERE email = 'kingbokab@gmail.com';
```

Use the queries in `test-payment-flow.sql` for more comprehensive checks.

---

## Common Issues & Solutions

### Issue 1: WebView doesn't detect success
**Symptom:** Payment completes but stays on Paystack page

**Solution:** 
- Paystack's success URL pattern changed
- Look at console for "WebView navigation" logs
- Copy the final URL and share with me
- I'll add the pattern to detection

### Issue 2: Verification fails
**Symptom:** "Payment verification failed" error

**Possible causes:**
- Edge Function not deployed
- Paystack secret key not set
- Reference mismatch
- Network error

**Check:**
```bash
# Verify Edge Function is deployed
supabase functions list

# Check secrets
supabase secrets list
```

### Issue 3: Credits not added
**Symptom:** Payment verified but balance not updated

**Check database:**
1. Run queries from `test-payment-flow.sql`
2. Check if `paystack_transactions` has the record
3. Check if `webhook_processed` or `manually_processed` is true
4. Check if `credit_transactions` has the record

**If transaction exists but credits not added:**
- Edge Function processed the payment
- But credit addition failed
- Check Edge Function logs in Supabase Dashboard

### Issue 4: Success handler not called
**Symptom:** No logs after "Payment verified"

**Possible causes:**
- `onSuccess` callback not passed
- Error in success handler
- Component unmounted

**Check:**
- Look for error logs
- Check if PaymentModal is still mounted
- Verify `onSuccess` prop is correct

---

## Next Steps

1. **Test payment** with logging enabled
2. **Copy ALL console logs** from the moment you tap "Confirm Payment" until it should navigate back
3. **Run database queries** to see if data was saved
4. **Share the logs** with me so I can see exactly where it's failing

---

## Testing Tips

- Use **test mode** cards only
- Each payment creates a **unique reference**
- You can track it in console and database
- **Paystack Dashboard** also shows all test transactions

---

**🔧 All logging is now in place. Let's test and see what's happening!**

