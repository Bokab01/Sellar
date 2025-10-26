# 🚀 Deploy Cron Systems - Quick Guide

## ✅ What You're Deploying

Two automated background systems for Sellar Pro:

1. **Auto-Refresh** (Migration 34) - ✅ Already deployed
   - Refreshes Sellar Pro listings every 2 hours
   - Runs every 15 minutes

2. **Trial Expiration** (Migration 35) - 🆕 New
   - Expires 14-day trials automatically
   - Runs daily at midnight

---

## 📦 Deployment

### **Step 1: Deploy Migration 35**

```bash
cd C:\Users\oseik\Desktop\Sellar-mobile-app
supabase db push
```

**Expected output:**
```
Applying migration 35_setup_trial_expiration_cron.sql...
✅ Migration applied successfully
```

---

## ✅ Verification

### **Step 2: Verify Both Cron Jobs**

Run in Supabase SQL Editor:

```sql
SELECT 
    jobname,
    schedule,
    active,
    CASE 
        WHEN schedule = '*/15 * * * *' THEN 'Every 15 minutes'
        WHEN schedule = '0 0 * * *' THEN 'Daily at midnight UTC'
        ELSE schedule
    END as description
FROM cron.job
WHERE jobname IN ('sellar-pro-auto-refresh', 'expire-sellar-pro-trials')
ORDER BY jobname;
```

**Expected output:**
```
jobname                    | schedule      | active | description
---------------------------|---------------|--------|------------------
expire-sellar-pro-trials   | 0 0 * * *     | true   | Daily at midnight UTC
sellar-pro-auto-refresh    | */15 * * * *  | true   | Every 15 minutes
```

---

### **Step 3: Check Auto-Refresh Status**

```sql
SELECT * FROM check_auto_refresh_cron_status();
```

**Expected:**
- `is_scheduled: true`
- `is_active: true`
- `total_runs: > 0` (if deployed earlier)
- `failed_runs: 0`

---

### **Step 4: Check Trial Expiration Status**

```sql
SELECT * FROM check_trial_expiration_status();
```

**Expected:**
- `is_scheduled: true`
- `is_active: true`
- `schedule: 0 0 * * *`
- `next_scheduled_run: tomorrow at 00:00`

---

## 🧪 Testing

### **Test Auto-Refresh (Already Working)**

```sql
SELECT * FROM trigger_auto_refresh_now();
```

**Expected:**
```
processed_count | error_count | deactivated_count | execution_time_ms
----------------|-------------|-------------------|------------------
X               | 0           | Y                 | < 100
```

---

### **Test Trial Expiration (New)**

```sql
SELECT * FROM trigger_trial_expiration_now();
```

**Expected:**
```
trials_checked | trials_expired | execution_time_ms
---------------|----------------|------------------
X              | Y              | < 100
```

- `trials_checked`: Total active trials before
- `trials_expired`: Trials that were expired
- If you have no overdue trials, both will be 0 ✅

---

## 📊 System Health

### **Check Trial System Health**

```sql
SELECT * FROM check_trial_system_health();
```

**Shows:**
- Active trials
- Overdue trials (need expiration)
- Converted trials
- Expired trials
- Cancelled trials

---

### **View Trials Expiring Soon**

```sql
SELECT * FROM get_trials_expiring_soon(3);
```

Shows trials ending in next 3 days (useful for user notifications).

---

## 🎯 What Happens Next?

### **Auto-Refresh**
- ✅ Runs every 15 minutes
- ✅ Refreshes Sellar Pro listings with active boosts
- ✅ Deactivates entries for expired boosts
- ✅ Next run: Within 15 minutes

### **Trial Expiration**
- ✅ Runs daily at midnight UTC
- ✅ Expires trials past their 14-day period
- ✅ Removes Sellar Pro access
- ✅ Next run: Tonight at 00:00 UTC

---

## 📈 Monitoring Dashboard

### **View All Cron Activity**

```sql
SELECT 
    j.jobname,
    jr.start_time,
    jr.end_time,
    jr.status,
    EXTRACT(EPOCH FROM (jr.end_time - jr.start_time)) as duration_seconds
FROM cron.job_run_details jr
JOIN cron.job j ON jr.jobid = j.jobid
WHERE j.jobname IN ('sellar-pro-auto-refresh', 'expire-sellar-pro-trials')
ORDER BY jr.start_time DESC
LIMIT 20;
```

---

### **Quick Health Check**

```sql
-- Auto-refresh health
SELECT 
    'Auto-Refresh' as system,
    COUNT(*) FILTER (WHERE is_active = true) as active_entries,
    COUNT(*) FILTER (WHERE is_active = true AND next_refresh_at <= NOW()) as due_now
FROM business_auto_refresh

UNION ALL

-- Trial health
SELECT 
    'Trial Expiration' as system,
    COUNT(*) FILTER (WHERE status = 'active') as active_trials,
    COUNT(*) FILTER (WHERE status = 'active' AND ends_at < NOW()) as overdue
FROM subscription_trials;
```

---

## ✅ Success Criteria

Your deployment is successful if:

- [x] Migration 35 applied without errors
- [x] Both cron jobs visible in `cron.job`
- [x] Both jobs have `active = true`
- [x] Manual triggers work without errors
- [x] Monitoring functions return data

---

## 🆘 Troubleshooting

### **Issue: Migration 35 fails**

**Error:** `expire_trials() function not found`

**Fix:** Migration 31 must be applied first
```bash
# Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'expire_trials';

# If not, apply migration 31 first
```

---

### **Issue: Cron job not visible**

**Error:** No rows returned from `cron.job`

**Fix:** pg_cron extension not enabled
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

---

### **Issue: Manual trigger returns error**

**Check function exists:**
```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('trigger_auto_refresh_now', 'trigger_trial_expiration_now');
```

**If missing:** Re-run migrations 34 and 35

---

## 📚 Full Documentation

- **Overview**: `CRON_SYSTEMS_OVERVIEW.md`
- **Auto-Refresh Guide**: `AUTO_REFRESH_CRON_GUIDE.md`
- **Auto-Refresh Summary**: `AUTO_REFRESH_SUMMARY.md`
- **Trial Implementation**: `TRIAL_IMPLEMENTATION_COMPLETE.md`
- **This Guide**: `DEPLOY_CRON_SYSTEMS.md`

---

## 🎉 You're Done!

Both automated systems are now running:

- ✅ **Auto-Refresh**: Every 15 minutes
- ✅ **Trial Expiration**: Daily at midnight
- ✅ **Zero manual work required**
- ✅ **Full monitoring in place**

**Your Sellar Pro system is production-ready!** 🚀

---

## 📞 Next Steps (Optional)

1. **Set up alerts** for cron job failures
2. **Add monitoring** to admin dashboard
3. **Configure notifications** for trials ending soon
4. **Review logs** after 24-48 hours

---

*Deployment Date: October 8, 2025*
*Migrations: 34 & 35*

