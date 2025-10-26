# 🔄 Cron Job Setup Guide for Trial Expiration

This guide will walk you through setting up an automated cron job to expire trials daily using Supabase Edge Functions and cron-job.org.

---

## 📋 Overview

The cron job will:
- Run daily at midnight (00:00 UTC)
- Call the `expire_trials()` database function
- Automatically expire trials that have passed their 14-day period
- Update subscription status to 'expired'

---

## 🛠️ Step 1: Install Supabase CLI

If you haven't already, install the Supabase CLI:

```bash
# Using npm
npm install -g supabase

# Or using brew (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

---

## 🔐 Step 2: Login to Supabase

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your project ref:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID"

---

## 📝 Step 3: Create Edge Function

### 3.1 Create the function directory and file

```bash
# Create the edge function
supabase functions new expire-trials
```

This creates: `supabase/functions/expire-trials/index.ts`

### 3.2 Add the function code

Open `supabase/functions/expire-trials/index.ts` and replace with:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the request is from cron-job.org
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    // Check if either Authorization header or x-cron-secret matches
    const isAuthorized =
      authHeader === `Bearer ${expectedSecret}` ||
      cronSecret === expectedSecret;

    if (!isAuthorized) {
      console.error('Unauthorized request - missing or invalid secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Starting trial expiration process...');

    // Call the expire_trials function
    const { data, error } = await supabase.rpc('expire_trials');

    if (error) {
      console.error('Error expiring trials:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          details: error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const expiredCount = data?.[0]?.expired_count || 0;
    console.log(`Successfully expired ${expiredCount} trial(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: expiredCount,
        timestamp: new Date().toISOString(),
        message: `Expired ${expiredCount} trial subscription(s)`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### 3.3 Create `.env` file for local testing

Create `supabase/functions/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-random-secret-key
```

**To get your service role key:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy the "service_role" key (⚠️ Keep this secret!)

**Generate a random CRON_SECRET:**
```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use this online: https://www.random.org/strings/
# Generate a 32-character alphanumeric string
```

---

## 🧪 Step 4: Test Locally

```bash
# Serve the function locally
supabase functions serve expire-trials --env-file supabase/functions/.env

# In another terminal, test it
curl -X POST http://localhost:54321/functions/v1/expire-trials \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"

# Or test with x-cron-secret header
curl -X POST http://localhost:54321/functions/v1/expire-trials \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "success": true,
  "expired_count": 0,
  "timestamp": "2025-01-08T12:00:00.000Z",
  "message": "Expired 0 trial subscription(s)"
}
```

---

## 🚀 Step 5: Deploy to Supabase

### 5.1 Set environment variables

```bash
# Set the CRON_SECRET on Supabase
supabase secrets set CRON_SECRET=your-random-secret-key
```

### 5.2 Deploy the function

```bash
# Deploy the function
supabase functions deploy expire-trials

# Verify deployment
supabase functions list
```

You should see:
```
┌─────────────────┬─────────┬─────────────────────┐
│ NAME            │ VERSION │ CREATED AT          │
├─────────────────┼─────────┼─────────────────────┤
│ expire-trials   │ 1       │ 2025-01-08 12:00:00 │
└─────────────────┴─────────┴─────────────────────┘
```

### 5.3 Get the function URL

Your function URL will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials
```

Example:
```
https://abcdefghijklmnop.supabase.co/functions/v1/expire-trials
```

---

## ⏰ Step 6: Set Up Cron-Job.org

### 6.1 Create an account

1. Go to https://cron-job.org
2. Click "Sign Up" (free account)
3. Verify your email

### 6.2 Create a new cron job

1. **Login** to cron-job.org
2. Click **"Create cronjob"**

### 6.3 Configure the cron job

**Basic Settings:**
- **Title**: `Sellar Trial Expiration`
- **Address (URL)**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials`

**Schedule:**
- **Pattern**: Select "Every day"
- **Time**: `00:00` (midnight)
- **Timezone**: Choose your timezone or UTC

**Request Settings:**
- **Request Method**: `POST`
- **Request Headers**: Click "Add header"
  - **Header 1**:
    - Name: `x-cron-secret`
    - Value: `your-random-secret-key` (same as CRON_SECRET)
  - **Header 2**:
    - Name: `Content-Type`
    - Value: `application/json`

**Advanced Settings:**
- **Request timeout**: `30` seconds
- **Follow redirects**: ✅ Enabled
- **Notifications**: ✅ Enable email notifications on failure

### 6.4 Save and activate

1. Click **"Create cronjob"**
2. Verify the job is **Active** (green)

---

## ✅ Step 7: Test the Cron Job

### 7.1 Manual test from cron-job.org

1. Go to your cronjob on cron-job.org
2. Click **"Execute now"**
3. Check the execution log
4. Should see status `200` with response

### 7.2 Verify in Supabase

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click on **`expire-trials`**
4. Check **"Logs"** tab
5. Should see execution logs

### 7.3 Test with a real trial

To properly test expiration:

```sql
-- 1. Create a test trial that expired yesterday
INSERT INTO subscription_trials (user_id, plan_id, started_at, ends_at, status)
VALUES (
  'YOUR_TEST_USER_ID',
  'YOUR_PLAN_ID',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '1 day',
  'active'
);

-- 2. Trigger the cron job manually on cron-job.org

-- 3. Check if it was expired
SELECT * FROM subscription_trials WHERE status = 'expired';
```

---

## 📊 Step 8: Monitor and Maintain

### Daily Monitoring Checklist

Check these regularly:
- ✅ Cron job execution status on cron-job.org
- ✅ Edge function logs on Supabase
- ✅ Database records for expired trials
- ✅ Email notifications from cron-job.org

### View Logs

**Supabase Dashboard:**
```
Project → Edge Functions → expire-trials → Logs
```

**cron-job.org Dashboard:**
```
Cronjobs → Sellar Trial Expiration → History
```

### Query Expired Trials

```sql
-- View all expired trials
SELECT 
  st.id,
  st.user_id,
  p.email,
  st.started_at,
  st.ends_at,
  st.status,
  st.updated_at
FROM subscription_trials st
JOIN auth.users p ON p.id = st.user_id
WHERE st.status = 'expired'
ORDER BY st.updated_at DESC;

-- Count trials by status
SELECT 
  status,
  COUNT(*) as count
FROM subscription_trials
GROUP BY status;
```

---

## 🔧 Troubleshooting

### Issue: 401 Unauthorized

**Cause**: CRON_SECRET mismatch

**Solution**:
```bash
# Check deployed secret
supabase secrets list

# Re-set if needed
supabase secrets set CRON_SECRET=your-random-secret-key

# Update cron-job.org header to match
```

### Issue: 500 Internal Server Error

**Cause**: Database function error

**Solution**:
```sql
-- Test the function manually
SELECT * FROM expire_trials();

-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'expire_trials';
```

### Issue: Function not found

**Cause**: Function not deployed properly

**Solution**:
```bash
# Re-deploy
supabase functions deploy expire-trials --no-verify-jwt

# Or with debug mode
supabase functions deploy expire-trials --debug
```

### Issue: Cron job not executing

**Cause**: Cron-job.org configuration

**Solution**:
1. Check job is **Active** (not paused)
2. Verify schedule is correct
3. Check execution history for errors
4. Verify URL is correct
5. Test "Execute now" manually

---

## 🔒 Security Best Practices

1. **NEVER commit `.env` files** - Add to `.gitignore`:
   ```
   supabase/functions/.env
   .env
   .env.local
   ```

2. **Use strong CRON_SECRET**:
   - Minimum 32 characters
   - Mix of letters, numbers, symbols
   - Never share publicly

3. **Rotate secrets periodically**:
   ```bash
   # Generate new secret
   openssl rand -base64 32
   
   # Update on Supabase
   supabase secrets set CRON_SECRET=new-secret
   
   # Update on cron-job.org
   # Edit cronjob → Update header value
   ```

4. **Monitor execution logs**:
   - Check for unauthorized attempts
   - Verify execution times
   - Review error patterns

---

## 📈 Analytics & Metrics

### Track Trial Performance

```sql
-- Trial conversion rate
SELECT 
  COUNT(CASE WHEN status = 'converted' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate_percent
FROM subscription_trials;

-- Average days to conversion
SELECT 
  AVG(EXTRACT(DAY FROM (converted_at - started_at))) as avg_days_to_convert
FROM subscription_trials
WHERE status = 'converted';

-- Trials expired this month
SELECT 
  COUNT(*) as expired_this_month
FROM subscription_trials
WHERE status = 'expired'
AND updated_at >= DATE_TRUNC('month', CURRENT_DATE);

-- Active trials ending soon
SELECT 
  user_id,
  ends_at,
  EXTRACT(DAY FROM (ends_at - NOW())) as days_remaining
FROM subscription_trials
WHERE status = 'active'
AND ends_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
ORDER BY ends_at ASC;
```

---

## ✅ Checklist: Cron Job Setup Complete

- [ ] Supabase CLI installed and logged in
- [ ] Edge function created (`expire-trials`)
- [ ] CRON_SECRET generated and set
- [ ] Function tested locally
- [ ] Function deployed to Supabase
- [ ] Cron-job.org account created
- [ ] Cron job configured and activated
- [ ] Manual test successful
- [ ] Real trial expiration tested
- [ ] Monitoring set up
- [ ] Logs reviewing process established

---

## 🎯 Quick Reference

### Important URLs
- **Supabase Dashboard**: https://app.supabase.com/project/YOUR_PROJECT_REF
- **Edge Functions**: https://app.supabase.com/project/YOUR_PROJECT_REF/functions
- **Cron-Job.org**: https://console.cron-job.org/jobs

### Important Commands
```bash
# Test locally
supabase functions serve expire-trials --env-file supabase/functions/.env

# Deploy
supabase functions deploy expire-trials

# View logs (live)
supabase functions logs expire-trials --follow

# Update secret
supabase secrets set CRON_SECRET=new-value
```

### Function URL Format
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials
```

---

## 🆘 Support

If you encounter issues:
1. Check **Supabase Edge Function logs**
2. Check **cron-job.org execution history**
3. Test function manually with curl
4. Verify database function exists
5. Check CRON_SECRET matches

---

## 🎉 Success!

Once everything is set up:
- ✅ Trials expire automatically every day at midnight
- ✅ No manual intervention needed
- ✅ Email notifications on failures
- ✅ Full audit trail in logs
- ✅ Users lose access after 14 days

**Your trial expiration system is now fully automated! 🚀**
