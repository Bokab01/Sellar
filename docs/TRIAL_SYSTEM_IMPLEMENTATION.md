# Sellar Pro 2-Week Free Trial System

## ✅ Implementation Complete

### 📊 Overview
A comprehensive 2-week free trial system for Sellar Pro that allows users to try premium features before committing to a paid subscription.

---

## 🗄️ Database Changes

### New Tables
1. **`subscription_trials`** - Tracks all trial usage
   - `user_id` - User who started the trial
   - `subscription_id` - Related subscription
   - `plan_id` - Plan being trialed
   - `started_at` - Trial start date
   - `ends_at` - Trial end date (14 days from start)
   - `status` - `active`, `converted`, `expired`, `cancelled`
   - `converted_at` - When trial was converted to paid
   - `cancelled_at` - When trial was cancelled
   - `cancellation_reason` - Why user cancelled

### Updated Tables
**`user_subscriptions`** - Added trial columns:
- `is_trial` - Whether subscription is in trial
- `trial_started_at` - When trial started
- `trial_ends_at` - When trial ends
- `trial_converted` - Whether trial was converted to paid

---

## 🔧 Database Functions

### 1. `has_used_trial(p_user_id, p_plan_id)`
**Purpose**: Check if user has already used their trial
**Returns**: `BOOLEAN`
**Usage**:
```sql
SELECT has_used_trial('user-uuid', 'plan-uuid');
-- Returns true if user has used trial, false if eligible
```

### 2. `start_trial(p_user_id, p_plan_id)`
**Purpose**: Start a 14-day free trial
**Returns**: `TABLE (success, subscription_id, trial_id, trial_ends_at, error)`
**Usage**:
```sql
SELECT * FROM start_trial('user-uuid', 'plan-uuid');
```

### 3. `convert_trial_to_paid(p_subscription_id, p_user_id)`
**Purpose**: Convert trial to paid subscription after payment
**Returns**: `TABLE (success, error)`
**Usage**:
```sql
SELECT * FROM convert_trial_to_paid('subscription-uuid', 'user-uuid');
```

### 4. `expire_trials()`
**Purpose**: Expire all trials that have passed their end date
**Returns**: `TABLE (expired_count)`
**Usage**:
```sql
SELECT * FROM expire_trials();
-- Run daily via cron job
```

### 5. `cancel_trial(p_subscription_id, p_user_id, p_reason)`
**Purpose**: Cancel an active trial
**Returns**: `TABLE (success, error)`
**Usage**:
```sql
SELECT * FROM cancel_trial('subscription-uuid', 'user-uuid', 'Not interested');
```

---

## 📱 Mobile App Integration

### Store Updates (`store/useMonetizationStore.ts`)

#### New State Properties
```typescript
isOnTrial: boolean          // Whether user is currently on trial
trialEndsAt: string | null  // When trial ends
hasUsedTrial: boolean       // Whether user has used their trial
```

#### New Functions

**1. Start Trial**
```typescript
const { startTrial } = useMonetizationStore();
const result = await startTrial('Sellar Pro');

if (result.success) {
  console.log('Trial ends at:', result.trialEndsAt);
  // User now has access to all Sellar Pro features
}
```

**2. Check Trial Eligibility**
```typescript
const { checkTrialEligibility } = useMonetizationStore();
const isEligible = await checkTrialEligibility();

if (isEligible) {
  // Show "Start Free Trial" button
} else {
  // Show "Subscribe" button
}
```

**3. Convert Trial to Paid**
```typescript
const { convertTrialToPaid } = useMonetizationStore();
const result = await convertTrialToPaid();

if (result.success) {
  // Redirect to payment URL
  Linking.openURL(result.paymentUrl);
}
```

**4. Cancel Trial**
```typescript
const { cancelTrial } = useMonetizationStore();
const result = await cancelTrial('Too expensive');

if (result.success) {
  // Trial cancelled, user loses access
}
```

---

## 🎨 UI Components Needed

### 1. Trial Badge
Display on dashboard when user is on trial:
```tsx
{isOnTrial && (
  <View style={styles.trialBadge}>
    <Text>Free Trial - {daysRemaining} days left</Text>
  </View>
)}
```

### 2. Trial Upgrade Prompt
Show when trial is ending:
```tsx
{isOnTrial && daysRemaining <= 3 && (
  <AppModal
    visible={true}
    title="Your Trial is Ending Soon"
    primaryAction={{
      text: 'Upgrade Now',
      onPress: () => convertTrialToPaid()
    }}
  >
    <Text>
      Your trial ends in {daysRemaining} days.
      Upgrade now to keep your premium features!
    </Text>
  </AppModal>
)}
```

### 3. Subscription Screen Updates
```tsx
const { isOnTrial, hasUsedTrial, checkTrialEligibility } = useMonetizationStore();
const [isEligible, setIsEligible] = useState(false);

useEffect(() => {
  checkTrialEligibility().then(setIsEligible);
}, []);

// Show appropriate button
{isOnTrial ? (
  <Button onPress={convertTrialToPaid}>
    Upgrade to Paid Subscription
  </Button>
) : isEligible ? (
  <Button onPress={() => startTrial('Sellar Pro')}>
    Start 14-Day Free Trial
  </Button>
) : (
  <Button onPress={() => subscribeToPlan('Sellar Pro')}>
    Subscribe Now
  </Button>
)}
```

---

## 🔄 User Flow

### Starting a Trial
```
1. User taps "Start Free Trial"
    ↓
2. checkTrialEligibility() → true
    ↓
3. startTrial('Sellar Pro')
    ↓
4. Database creates:
   - user_subscriptions record (is_trial=true)
   - subscription_trials record
    ↓
5. User gets 14 days of Sellar Pro features
    ↓
6. isOnTrial = true
    ↓
7. User can upload videos, get analytics, etc.
```

### Converting Trial to Paid
```
1. User on day 10 of trial
    ↓
2. App shows "Upgrade" prompt
    ↓
3. User taps "Upgrade Now"
    ↓
4. convertTrialToPaid()
    ↓
5. Paystack payment initialized
    ↓
6. User completes payment
    ↓
7. Webhook calls convert_trial_to_paid()
    ↓
8. is_trial = false, trial_converted = true
    ↓
9. New billing period starts (30 days)
```

### Trial Expiration
```
1. Day 15 arrives (trial ended)
    ↓
2. Cron job runs expire_trials()
    ↓
3. Subscription status → 'expired'
    ↓
4. User loses Sellar Pro access
    ↓
5. App shows "Trial Expired" message
    ↓
6. User can subscribe to regain access
```

---

## ⚙️ Setup Instructions

### 1. Run Migration
```bash
# Apply the migration
psql -d your_database -f supabase/migrations/31_sellar_pro_trial_system.sql
```

### 2. Set Up Cron Job
Using Supabase Edge Function + cron-job.org:

**Create Edge Function** (`supabase/functions/expire-trials/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data, error } = await supabase.rpc('expire_trials');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ expired_count: data[0].expired_count }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Configure cron-job.org**:
- URL: `https://your-project.supabase.co/functions/v1/expire-trials`
- Schedule: Daily at midnight (0 0 * * *)
- Header: `Authorization: Bearer YOUR_ANON_KEY`

### 3. Update Payment Webhook
Add trial conversion handling to Paystack webhook:
```typescript
if (event.data.metadata.purpose === 'trial_conversion') {
  const subscriptionId = event.data.metadata.purpose_id;
  const userId = event.data.metadata.user_id;
  
  await supabase.rpc('convert_trial_to_paid', {
    p_subscription_id: subscriptionId,
    p_user_id: userId,
  });
}
```

---

## 📊 Analytics & Tracking

### Key Metrics to Track
1. **Trial Starts** - How many users start trials
2. **Trial Conversions** - How many trials convert to paid
3. **Trial Cancellations** - How many users cancel
4. **Conversion Rate** - % of trials that become paid
5. **Days to Convert** - How long before users upgrade
6. **Cancellation Reasons** - Why users don't convert

### Queries for Analytics
```sql
-- Trial conversion rate
SELECT 
  COUNT(CASE WHEN status = 'converted' THEN 1 END)::FLOAT / 
  COUNT(*)::FLOAT * 100 AS conversion_rate
FROM subscription_trials;

-- Average days to conversion
SELECT AVG(EXTRACT(DAY FROM (converted_at - started_at))) AS avg_days
FROM subscription_trials
WHERE status = 'converted';

-- Cancellation reasons
SELECT cancellation_reason, COUNT(*) AS count
FROM subscription_trials
WHERE status = 'cancelled'
GROUP BY cancellation_reason
ORDER BY count DESC;
```

---

## 🎯 Next Steps

### Immediate
1. ✅ Database migration applied
2. ✅ Store functions implemented
3. ⏳ Update subscription screens to show trial option
4. ⏳ Add trial badge to dashboard
5. ⏳ Implement trial ending notifications
6. ⏳ Set up cron job for expiration

### Future Enhancements
- Trial extension for specific users
- Different trial lengths for different plans
- Trial analytics dashboard
- A/B testing trial lengths
- Personalized trial offers

---

## 🚨 Important Notes

1. **One Trial Per User** - Users can only use trial once
2. **14-Day Duration** - Fixed at 14 days, can be adjusted in migration
3. **Full Feature Access** - Trial users get all Sellar Pro features
4. **Auto-Expiration** - Trials expire automatically after 14 days
5. **No Payment Required** - Users can start trial without payment info
6. **Conversion Required** - Must pay to continue after trial ends

---

## 🔒 Security Considerations

1. **RLS Policies** - Users can only view/modify their own trials
2. **Service Role** - Cron job uses service role for expiration
3. **Validation** - Functions validate user ownership
4. **Unique Constraint** - Prevents duplicate trials per user/plan

---

## 📞 Support

For issues or questions:
1. Check migration logs for errors
2. Verify RPC functions are created
3. Test with a test user account
4. Monitor trial metrics in database

**Trial system is ready to go! 🎉**
