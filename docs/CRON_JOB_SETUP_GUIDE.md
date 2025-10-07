# Cron Job Setup Guide - Using cron-job.org + Supabase

This guide explains how to set up automatic recovery of expired reservations using cron-job.org and Supabase Edge Functions.

---

## Overview

**Architecture:**
```
cron-job.org (every hour)
    ↓ HTTP Request
Supabase Edge Function
    ↓ RPC Call
Database Functions
    ↓ Update
Listings Table
```

---

## Step 1: Deploy Supabase Edge Function

### 1.1 Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 1.2 Login to Supabase

```bash
supabase login
```

### 1.3 Link to Your Project

```bash
supabase link --project-ref your-project-ref
```

### 1.4 Generate a Secret Key

```bash
# Generate a random secret (save this!)
openssl rand -base64 32
# Example output: Kx8J2mN9pQ3rS5tU7vW1xY2zA4bC6dE8fG0hI2jK4lM=
```

### 1.5 Set Environment Variables

```bash
# Set the CRON_SECRET
supabase secrets set CRON_SECRET=Kx8J2mN9pQ3rS5tU7vW1xY2zA4bC6dE8fG0hI2jK4lM=

# Verify secrets are set
supabase secrets list
```

### 1.6 Deploy the Function

```bash
supabase functions deploy auto-recover-reservations
```

### 1.7 Get Your Function URL

After deployment, you'll get a URL like:
```
https://your-project-ref.supabase.co/functions/v1/auto-recover-reservations
```

**Save this URL - you'll need it for cron-job.org!**

---

## Step 2: Set Up cron-job.org

### 2.1 Create Account

1. Go to https://cron-job.org
2. Sign up for a free account
3. Verify your email

### 2.2 Create New Cron Job

1. Click **"Create cronjob"**
2. Fill in the details:

**Basic Settings:**
```
Title: Auto-Recover Expired Reservations
Address (URL): https://your-project-ref.supabase.co/functions/v1/auto-recover-reservations
```

**Schedule:**
```
Every: 1 hour
At: 0 minutes past the hour
```

Or use advanced cron expression:
```
0 * * * *
```

**Request Settings:**
```
Request method: POST
Request timeout: 30 seconds
```

**Custom Headers:**
Add these 3 headers (IMPORTANT - all 3 are required):
```
Header 1:
  Name: Authorization
  Value: Bearer YOUR_SUPABASE_ANON_KEY
  (Get from: Supabase Dashboard → Settings → API → anon/public key)

Header 2:
  Name: x-cron-secret
  Value: YOUR_GENERATED_SECRET
  (Use the same secret you set in Supabase)

Header 3:
  Name: Content-Type
  Value: application/json
```

**Notifications:**
```
☑ Notify me when execution fails
☐ Notify me when execution succeeds (optional)
```

3. Click **"Create cronjob"**

---

## Step 3: Test the Setup

### 3.1 Manual Test via cron-job.org

1. Go to your cronjob in cron-job.org
2. Click **"Execute now"**
3. Check the execution log
4. Should see: `Status: 200 OK`

### 3.2 Manual Test via Terminal

```bash
# Replace with your actual URL, anon key, and secret
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/auto-recover-reservations \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "x-cron-secret: YOUR_GENERATED_SECRET" \
  -H "Content-Type: application/json"
```

**PowerShell (Windows):**
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_SUPABASE_ANON_KEY"
    "x-cron-secret" = "YOUR_GENERATED_SECRET"
    "Content-Type" = "application/json"
}
Invoke-WebRequest -Uri "https://your-project-ref.supabase.co/functions/v1/auto-recover-reservations" -Method POST -Headers $headers
```

**Expected Response:**
```json
{
  "success": true,
  "recovered_count": 0,
  "timestamp": "2025-10-05T12:00:00.000Z",
  "message": "Successfully recovered 0 expired reservations"
}
```

### 3.3 Check Supabase Logs

```bash
# View function logs
supabase functions logs auto-recover-reservations
```

Or in Supabase Dashboard:
1. Go to **Edge Functions**
2. Click **auto-recover-reservations**
3. View **Logs** tab

---

## Step 4: Create Test Reservation (Optional)

To verify the system works end-to-end:

### 4.1 Create a Test Reservation

```sql
-- In Supabase SQL Editor
UPDATE listings
SET 
  status = 'reserved',
  reserved_until = NOW() - INTERVAL '1 hour',  -- Already expired
  reserved_for = (SELECT id FROM profiles LIMIT 1)
WHERE id = 'your-test-listing-id';
```

### 4.2 Trigger Cron Job

1. Go to cron-job.org
2. Click **"Execute now"**
3. Wait a few seconds

### 4.3 Verify Recovery

```sql
-- Check if listing was recovered
SELECT id, status, reserved_until, reserved_for
FROM listings
WHERE id = 'your-test-listing-id';

-- Should show:
-- status = 'active'
-- reserved_until = NULL
-- reserved_for = NULL
```

---

## Monitoring & Maintenance

### View Execution History

**In cron-job.org:**
1. Go to your cronjob
2. Click **"Execution history"**
3. View success/failure rates

**In Supabase:**
```bash
supabase functions logs auto-recover-reservations --tail
```

### Check Recovery Statistics

```sql
-- See how many listings have been reserved
SELECT COUNT(*) as total_reservations
FROM listings
WHERE reservation_count > 0;

-- See active reservations
SELECT 
  id,
  title,
  status,
  reserved_until,
  EXTRACT(EPOCH FROM (reserved_until - NOW()))/3600 as hours_remaining
FROM listings
WHERE status = 'reserved'
ORDER BY reserved_until;

-- See recovery rate
SELECT 
  COUNT(CASE WHEN status = 'sold' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'active' AND reservation_count > 0 THEN 1 END) as recovered,
  COUNT(*) as total
FROM listings
WHERE reservation_count > 0;
```

---

## Troubleshooting

### Issue: 401 Unauthorized

**Cause:** Missing or wrong authentication headers

**Fix:**
1. **Verify you have ALL 3 headers in cron-job.org:**
   - `Authorization: Bearer YOUR_ANON_KEY`
   - `x-cron-secret: YOUR_SECRET`
   - `Content-Type: application/json`
2. Get anon key from: Supabase Dashboard → Settings → API
3. Verify secret in Supabase: `supabase secrets list`
4. No extra spaces or quotes around values
5. Make sure "Bearer " is included before the anon key

### Issue: 500 Internal Server Error

**Cause:** Function error or database issue

**Fix:**
1. Check function logs: `supabase functions logs auto-recover-reservations`
2. Verify database functions exist:
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN ('auto_recover_expired_reservations', 'notify_expired_reservations');
   ```
3. Test functions manually:
   ```sql
   SELECT auto_recover_expired_reservations();
   ```

### Issue: Function Not Found

**Cause:** Function not deployed or wrong URL

**Fix:**
1. Redeploy: `supabase functions deploy auto-recover-reservations`
2. Verify URL in Supabase Dashboard → Edge Functions
3. Update URL in cron-job.org

### Issue: No Listings Recovered

**Cause:** No expired reservations or function not running

**Fix:**
1. Check if there are expired reservations:
   ```sql
   SELECT COUNT(*) FROM listings 
   WHERE status = 'reserved' AND reserved_until < NOW();
   ```
2. Verify cron job is executing (check cron-job.org history)
3. Check function logs for errors

---

## Cost & Limits

### cron-job.org Free Tier:
- ✅ Unlimited cron jobs
- ✅ 1-minute minimum interval
- ✅ Email notifications
- ✅ Execution history
- ✅ No credit card required

### Supabase Edge Functions Free Tier:
- ✅ 500,000 invocations/month
- ✅ 2 million compute seconds/month
- ✅ More than enough for hourly cron jobs

**Estimated Usage:**
- 24 executions/day × 30 days = 720 executions/month
- Well within free tier limits ✅

---

## Security Best Practices

1. **Keep Secret Safe:**
   - Never commit to Git
   - Use environment variables
   - Rotate periodically

2. **Monitor Logs:**
   - Check for unauthorized attempts
   - Set up failure notifications

3. **Rate Limiting:**
   - Edge function has built-in protection
   - cron-job.org respects your schedule

4. **Backup Plan:**
   - Document the process
   - Have manual recovery SQL ready
   - Monitor completion rates

---

## Alternative: GitHub Actions (Backup Option)

If cron-job.org is down, you can use GitHub Actions:

```yaml
# .github/workflows/auto-recovery.yml
name: Auto-Recover Reservations
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger
jobs:
  recover:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            ${{ secrets.SUPABASE_FUNCTION_URL }} \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

---

## Summary

✅ **Setup Complete When:**
1. Edge function deployed to Supabase
2. CRON_SECRET environment variable set
3. Cron job created on cron-job.org
4. Test execution successful
5. Logs show successful recoveries

**Your reservation system is now fully automated!** 🎉

---

## Quick Reference

**Function URL:**
```
https://your-project-ref.supabase.co/functions/v1/auto-recover-reservations
```

**Required Headers:**
```
Authorization: Bearer your-anon-key
x-cron-secret: your-secret-key
Content-Type: application/json
```

**Schedule:**
```
Every hour (0 * * * *)
```

**Expected Response:**
```json
{"success": true, "recovered_count": N}
```

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs/guides/functions
- cron-job.org Support: https://cron-job.org/en/support/
