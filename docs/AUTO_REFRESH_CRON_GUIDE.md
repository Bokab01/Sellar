# 🔄 Sellar Pro Auto-Refresh Cron Setup Guide

## 📋 Overview

This guide covers the **automatic listing refresh system** for Sellar Pro users, implemented using Supabase's `pg_cron` extension.

---

## 🎯 How It Works

### **For Users:**
- Sellar Pro users with active boosts get automatic refresh every **2 hours**
- Listings move to the top of search results automatically
- No manual action required

### **Behind the Scenes:**
- Cron job runs **every 15 minutes**
- Checks which listings are due for refresh (2 hours since last refresh)
- Updates only listings that are due
- Fair distribution: all users get consistent 2-hour intervals

---

## 🚀 Setup Instructions

### **Step 1: Apply the Migration**

```bash
# Navigate to your project directory
cd C:\Users\oseik\Desktop\Sellar-mobile-app

# Push the migration to Supabase
supabase db push
```

**What this does:**
- ✅ Enables `pg_cron` extension
- ✅ Creates cron job "sellar-pro-auto-refresh"
- ✅ Schedules it to run every 15 minutes
- ✅ Sets up monitoring functions

---

## 📊 Monitoring & Verification

### **Check Cron Job Status**

```sql
-- Quick status check
SELECT * FROM check_auto_refresh_cron_status();
```

**Returns:**
- Job name and schedule
- Last run time
- Success/failure status
- Average execution time
- Total runs and failed runs

### **View Recent Cron Runs**

```sql
-- See last 10 runs
SELECT 
    runid,
    start_time,
    end_time,
    status,
    return_message,
    EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds
FROM cron.job_run_details
WHERE jobid = (
    SELECT jobid FROM cron.job 
    WHERE jobname = 'sellar-pro-auto-refresh'
)
ORDER BY start_time DESC
LIMIT 10;
```

### **Check System Health**

```sql
-- See how many listings are due for refresh
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active,
    COUNT(CASE WHEN is_active = true AND next_refresh_at <= NOW() THEN 1 END) as due_now
FROM business_auto_refresh;
```

### **View Active Cron Jobs**

```sql
-- List all cron jobs in your database
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    database
FROM cron.job;
```

---

## 🧪 Manual Testing

### **Trigger Refresh Manually**

```sql
-- Run auto-refresh right now (for testing)
SELECT * FROM trigger_auto_refresh_now();
```

**Returns:**
```
processed_count | error_count | deactivated_count | execution_time_ms
----------------|-------------|-------------------|------------------
5               | 0           | 2                 | 234
```

- `processed_count`: Listings refreshed
- `error_count`: Errors encountered
- `deactivated_count`: Listings deactivated (no active boost)
- `execution_time_ms`: How long it took

### **Create Test Data**

```sql
-- Create a test auto-refresh entry (for testing)
-- Replace USER_ID and LISTING_ID with real values
INSERT INTO business_auto_refresh (user_id, listing_id, next_refresh_at)
VALUES 
    ('YOUR_USER_ID', 'YOUR_LISTING_ID', NOW() - INTERVAL '5 minutes')
ON CONFLICT (user_id, listing_id) 
DO UPDATE SET 
    next_refresh_at = NOW() - INTERVAL '5 minutes',
    is_active = true;

-- Now trigger refresh
SELECT * FROM trigger_auto_refresh_now();

-- Check if it was processed
SELECT * FROM business_auto_refresh 
WHERE user_id = 'YOUR_USER_ID';
```

---

## ⚙️ Configuration

### **Cron Schedule: Every 15 Minutes**

```
*/15 * * * *
```

**Why 15 minutes?**
- ✅ Fair to all users (max 15-min delay from 2-hour mark)
- ✅ Distributed load (not all at once)
- ✅ Efficient (only processes due listings)

### **Change Schedule (If Needed)**

```sql
-- Update schedule to every 30 minutes
SELECT cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh'),
    schedule := '*/30 * * * *'
);

-- Or every hour
SELECT cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh'),
    schedule := '0 * * * *'
);

-- Verify change
SELECT jobname, schedule FROM cron.job 
WHERE jobname = 'sellar-pro-auto-refresh';
```

---

## 🛠️ Management Commands

### **Pause Cron Job**

```sql
-- Temporarily disable auto-refresh
SELECT cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh'),
    active := false
);
```

### **Resume Cron Job**

```sql
-- Re-enable auto-refresh
SELECT cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh'),
    active := true
);
```

### **Remove Cron Job**

```sql
-- Delete the cron job (use with caution!)
SELECT cron.unschedule('sellar-pro-auto-refresh');
```

### **Recreate Cron Job**

```sql
-- If you accidentally deleted it
SELECT cron.schedule(
    'sellar-pro-auto-refresh',
    '*/15 * * * *',
    $$ SELECT process_business_auto_refresh(); $$
);
```

---

## 🔍 Troubleshooting

### **Issue: Cron Job Not Running**

**Check if job exists:**
```sql
SELECT * FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh';
```

**If empty:** Re-run migration 34

**Check if job is active:**
```sql
SELECT active FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh';
```

**If false:** Resume with `active := true` command above

---

### **Issue: Listings Not Being Refreshed**

**Check if listings have active boosts:**
```sql
-- Auto-refresh only works for listings with active boost features
SELECT 
    l.id,
    l.title,
    COUNT(fp.id) as active_boosts
FROM listings l
LEFT JOIN feature_purchases fp ON fp.listing_id = l.id 
    AND fp.status = 'active' 
    AND fp.expires_at > NOW()
    AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
WHERE l.user_id = 'YOUR_USER_ID'
GROUP BY l.id, l.title;
```

**Listings with 0 active boosts will NOT be auto-refreshed!**

---

### **Issue: User Not Seeing Auto-Refresh**

**Check if user has active Sellar Pro subscription:**
```sql
SELECT 
    us.user_id,
    sp.name as plan_name,
    us.status,
    us.is_trial,
    us.current_period_end,
    us.current_period_end > NOW() as is_active_now
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'
AND sp.name = 'Sellar Pro';
```

**Required conditions:**
- ✅ `status = 'active'`
- ✅ `current_period_end > NOW()`
- ✅ Listing has active boost feature

---

### **Issue: Cron Job Failing**

**Check recent errors:**
```sql
SELECT 
    runid,
    start_time,
    status,
    return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh')
AND status = 'failed'
ORDER BY start_time DESC
LIMIT 5;
```

**Common errors and fixes:**
- `function process_business_auto_refresh() does not exist`: Run migration 01 (initial schema)
- `permission denied`: Check function grants
- `timeout`: Increase statement timeout (contact Supabase support)

---

## 📈 Analytics Queries

### **Auto-Refresh Activity (Last 24 Hours)**

```sql
SELECT 
    DATE_TRUNC('hour', start_time) as hour,
    COUNT(*) as runs,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time))), 2) as avg_seconds
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh')
AND start_time > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', start_time)
ORDER BY hour DESC;
```

### **Top Auto-Refreshed Listings**

```sql
SELECT 
    l.id,
    l.title,
    u.email,
    bar.last_refresh_at,
    bar.next_refresh_at,
    COUNT(DISTINCT fp.id) as active_boosts
FROM business_auto_refresh bar
JOIN listings l ON bar.listing_id = l.id
JOIN auth.users u ON bar.user_id = u.id
LEFT JOIN feature_purchases fp ON fp.listing_id = l.id 
    AND fp.status = 'active'
    AND fp.expires_at > NOW()
WHERE bar.is_active = true
GROUP BY l.id, l.title, u.email, bar.last_refresh_at, bar.next_refresh_at
ORDER BY bar.last_refresh_at DESC
LIMIT 10;
```

### **Sellar Pro Users Without Auto-Refresh**

```sql
-- Find Pro users who should have auto-refresh but don't
SELECT 
    u.id,
    u.email,
    sp.name as plan,
    COUNT(DISTINCT l.id) as total_listings,
    COUNT(DISTINCT bar.listing_id) as listings_with_auto_refresh
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN auth.users u ON us.user_id = u.id
LEFT JOIN listings l ON l.user_id = u.id AND l.status = 'active'
LEFT JOIN business_auto_refresh bar ON bar.user_id = u.id
WHERE us.status = 'active'
AND sp.name = 'Sellar Pro'
AND us.current_period_end > NOW()
GROUP BY u.id, u.email, sp.name
HAVING COUNT(DISTINCT l.id) > 0 AND COUNT(DISTINCT bar.listing_id) = 0;
```

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Migration applied successfully
- [ ] Cron job exists: `SELECT * FROM cron.job WHERE jobname = 'sellar-pro-auto-refresh';`
- [ ] Cron job is active: `active = true`
- [ ] Schedule is correct: `*/15 * * * *`
- [ ] Manual trigger works: `SELECT * FROM trigger_auto_refresh_now();`
- [ ] Monitoring function works: `SELECT * FROM check_auto_refresh_cron_status();`
- [ ] Test listing gets refreshed after 2 hours
- [ ] No errors in `cron.job_run_details`

---

## 📞 Support

### **Common Questions**

**Q: Why every 15 minutes instead of every 2 hours?**
A: Running every 15 minutes ensures fair distribution. Users created at different times all get refreshed within 15 minutes of their 2-hour mark. If we ran every 2 hours, some users would wait 3+ hours for their first refresh.

**Q: Does this cost extra?**
A: No. `pg_cron` is included in all Supabase tiers. The function is optimized to only process due listings, so it's very efficient.

**Q: Can I see cron job logs in the Supabase Dashboard?**
A: Yes! Go to: **Database** → **Extensions** → **pg_cron** → **Job Run Details**

**Q: What if I want to change the refresh interval from 2 hours to something else?**
A: The 2-hour interval is set in the `business_auto_refresh` table. You'd need to modify the `setup_business_auto_refresh()` function to use a different interval.

---

## 🎉 You're All Set!

Your Sellar Pro auto-refresh system is now running automatically!

**What happens next:**
1. ✅ Cron runs every 15 minutes
2. ✅ Checks which listings are due (2 hours since last refresh)
3. ✅ Updates only listings with active boosts
4. ✅ Pro users see consistent top placement
5. ✅ No manual intervention required

**Monitor health:** `SELECT * FROM check_auto_refresh_cron_status();`

---

*Last updated: October 8, 2025*

