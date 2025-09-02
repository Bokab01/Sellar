# 🔗 Paystack Webhook Setup Guide

## Why Webhooks Are Important

Webhooks are **CRITICAL** for your payment system to work properly. Without webhooks:
- ❌ Credits won't be added after successful payment
- ❌ Subscriptions won't be activated
- ❌ Users won't get notifications
- ❌ Payment status won't update automatically

## 🚀 Quick Setup Steps

### 1. Get Your Webhook URL

Your webhook URL is:
```
https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/functions/v1/paystack-webhook
```

**Example:**
```
https://nqjzqwfvwdxdgvnlvvqo.supabase.co/functions/v1/paystack-webhook
```

### 2. Configure in Paystack Dashboard

1. **Login to Paystack Dashboard**
   - Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
   - Login with your account

2. **Navigate to Webhooks**
   - Click **Settings** → **Webhooks**
   - Click **"Add Endpoint"**

3. **Add Webhook Configuration**
   ```
   URL: https://[YOUR_PROJECT_ID].supabase.co/functions/v1/paystack-webhook
   Events: 
   ✅ charge.success
   ✅ charge.failed
   ```

4. **Save Configuration**
   - Click **"Save"**
   - Copy the **webhook secret** (you'll need this)

### 3. Test Your Webhook

1. **Go to Paystack Diagnostics Screen**
   - In your app: Buy Credits → 🔧 icon → Webhook Testing

2. **Click "Check Webhook Status"**
   - This shows recent transactions and webhook status

3. **Click "Webhook Setup Guide"**
   - Shows detailed setup instructions

4. **Make a Test Payment**
   - Try buying credits with a small amount
   - Check if webhook is received

## 🔍 Troubleshooting

### Webhook Not Receiving Events

**Check 1: URL is Correct**
```bash
# Test if webhook endpoint is accessible
curl -X POST https://[YOUR_PROJECT_ID].supabase.co/functions/v1/paystack-webhook
# Should return "Method not allowed" (405) - this is good!
```

**Check 2: Events are Selected**
- Make sure `charge.success` and `charge.failed` are checked in Paystack

**Check 3: Webhook Secret**
- The webhook validates signatures using `PAYSTACK_SECRET_KEY`
- Make sure this environment variable is set in Supabase

### Webhook Receiving but Not Processing

**Check Database Permissions**
- Webhook uses service role key to bypass RLS
- Check `paystack_transactions` table exists

**Check RPC Functions**
- `complete_credit_purchase` function must exist
- Check Supabase logs for errors

## 📊 Monitoring Webhooks

### In Paystack Dashboard
- **Settings** → **Webhooks** → **View Logs**
- Shows delivery attempts and responses

### In Your App
- **Paystack Diagnostics** → **Check Webhook Status**
- Shows recent transactions and processing status

### In Supabase
- **Logs** → **Edge Functions** → **paystack-webhook**
- Shows detailed processing logs

## 🎯 Expected Webhook Flow

```
1. User completes payment in Paystack
2. Paystack sends webhook to your endpoint
3. Webhook verifies signature
4. Webhook updates transaction status
5. Webhook calls complete_credit_purchase RPC
6. Credits added to user account
7. User gets notification
```

## 🚨 Common Issues

### Issue: "Invalid signature" Error
**Solution:** Check `PAYSTACK_SECRET_KEY` environment variable

### Issue: "Transaction not found" Error  
**Solution:** Make sure `paystack-initialize` creates transaction record first

### Issue: "RPC function not found" Error
**Solution:** Run the monetization migrations to create RPC functions

### Issue: Webhook times out
**Solution:** Check Supabase function logs for performance issues

## ✅ Verification Checklist

- [ ] Webhook URL added to Paystack dashboard
- [ ] `charge.success` and `charge.failed` events selected
- [ ] `PAYSTACK_SECRET_KEY` environment variable set
- [ ] `paystack-webhook` function deployed
- [ ] `complete_credit_purchase` RPC function exists
- [ ] Test payment completes successfully
- [ ] Credits appear in user account after payment
- [ ] Webhook status shows "processed" in diagnostics

## 🔧 Manual Testing

You can manually test webhook processing:

1. **Make a test payment**
2. **Go to Paystack Diagnostics**
3. **Click "Simulate Webhook Call"**
4. **Check if credits are added**

This helps verify the webhook processing logic works correctly.
