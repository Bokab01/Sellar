# 🚀 Physical Shop Feature - Phase 1 Deployment Guide

## 📋 Overview
This guide covers deploying the Phase 1 foundation for the Physical Shop feature.

**Migration File:** `20250201000001_add_physical_shop_features.sql`

---

## ⚠️ Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Test migration on local/staging environment
- [ ] Verify TypeScript types are updated
- [ ] Confirm no active deployments in progress
- [ ] Schedule deployment during low-traffic period
- [ ] Notify team of deployment window

---

## 🔧 Deployment Steps

### Step 1: Test Migration Locally (REQUIRED)

```bash
# Navigate to project directory
cd C:\Users\oseik\Desktop\Sellar-mobile-app

# Reset local database (if needed)
npx supabase db reset

# Or apply migration only
npx supabase migration up
```

**Verify:**
- [ ] Migration completes without errors
- [ ] All tables created successfully
- [ ] Indexes created
- [ ] Functions executable
- [ ] RLS policies active

### Step 2: Test on Staging (REQUIRED)

```bash
# Push to staging
npx supabase db push --db-url <STAGING_DATABASE_URL>

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste migration content
# 3. Run
```

**Verify:**
- [ ] No data loss
- [ ] Existing features still work
- [ ] App loads without errors
- [ ] Can query new tables/columns

### Step 3: Deploy to Production

```bash
# Option A: Via Supabase CLI
npx supabase db push

# Option B: Via Supabase Dashboard
# 1. Database > Migrations
# 2. Upload migration file
# 3. Run migration
```

### Step 4: Verify Production Deployment

Run these queries in SQL Editor to confirm:

```sql
-- 1. Check profiles table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name LIKE 'business_%';

-- Expected: 13 new columns

-- 2. Check business_photos table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'business_photos';

-- Expected: 1 row

-- 3. Check listings table has pickup columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'listings' 
  AND column_name LIKE 'pickup_%';

-- Expected: 4 new columns

-- 4. Test helper functions
SELECT calculate_distance(5.6037, -0.1870, 5.5560, -0.1969) as distance_km;
-- Expected: ~5.5 km (Accra Central to Airport)

SELECT * FROM find_nearby_shops(5.6037, -0.1870, 10, 10);
-- Expected: Empty result (no shops configured yet)

SELECT is_shop_open('00000000-0000-0000-0000-000000000000'::uuid);
-- Expected: false

-- 5. Check indexes created
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('profiles', 'business_photos', 'listings')
  AND indexname LIKE '%shop%' OR indexname LIKE '%pickup%' OR indexname LIKE '%business_photos%';

-- Expected: 6 indexes
```

---

## 🎯 Rollback Plan

If issues arise, rollback with:

```sql
-- ROLLBACK SCRIPT (USE WITH CAUTION)

-- Drop new table
DROP TABLE IF EXISTS business_photos CASCADE;

-- Drop new functions
DROP FUNCTION IF EXISTS calculate_distance CASCADE;
DROP FUNCTION IF EXISTS find_nearby_shops CASCADE;
DROP FUNCTION IF EXISTS is_shop_open CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_business_photos_updated_at ON business_photos;
DROP TRIGGER IF EXISTS trigger_update_has_physical_shop_flag ON profiles;

-- Remove columns from profiles
ALTER TABLE profiles 
DROP COLUMN IF EXISTS business_address,
DROP COLUMN IF EXISTS business_address_line_2,
DROP COLUMN IF EXISTS business_city,
DROP COLUMN IF EXISTS business_state,
DROP COLUMN IF EXISTS business_postal_code,
DROP COLUMN IF EXISTS business_latitude,
DROP COLUMN IF EXISTS business_longitude,
DROP COLUMN IF EXISTS business_map_verified,
DROP COLUMN IF EXISTS business_directions_note,
DROP COLUMN IF EXISTS accepts_pickup,
DROP COLUMN IF EXISTS accepts_walkin,
DROP COLUMN IF EXISTS has_physical_shop;

-- Remove columns from listings
ALTER TABLE listings 
DROP COLUMN IF EXISTS pickup_available,
DROP COLUMN IF EXISTS pickup_location_override,
DROP COLUMN IF EXISTS pickup_preparation_time,
DROP COLUMN IF EXISTS pickup_instructions;

-- Drop constraints
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_latitude_range;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_longitude_range;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS check_pickup_requires_location;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS check_pickup_preparation_time;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_location;
DROP INDEX IF EXISTS idx_profiles_accepts_pickup;
DROP INDEX IF EXISTS idx_business_photos_user_id;
DROP INDEX IF EXISTS idx_business_photos_primary;
DROP INDEX IF EXISTS idx_business_photos_display_order;
DROP INDEX IF EXISTS idx_business_photos_one_primary_per_user;
DROP INDEX IF EXISTS idx_listings_pickup_available;

-- Drop view
DROP VIEW IF EXISTS physical_shops;
```

---

## 🧪 Post-Deployment Testing

### Test 1: Profile Update (Mobile App)
```typescript
// Test updating profile with new fields
const { error } = await supabase
  .from('profiles')
  .update({
    business_address: '123 Oxford Street',
    business_city: 'Accra',
    business_latitude: 5.6037,
    business_longitude: -0.1870,
  })
  .eq('id', userId);

// Expected: No error, has_physical_shop auto-set to true
```

### Test 2: Business Photo Upload
```typescript
const { error } = await supabase
  .from('business_photos')
  .insert({
    user_id: userId,
    photo_url: 'https://...',
    photo_type: 'storefront',
    is_primary: true,
  });

// Expected: No error
```

### Test 3: Listing with Pickup
```typescript
const { error } = await supabase
  .from('listings')
  .update({
    pickup_available: true,
    pickup_instructions: 'Call on arrival',
    pickup_preparation_time: 30,
  })
  .eq('id', listingId);

// Expected: No error
```

### Test 4: Distance Calculation
```typescript
const { data, error } = await supabase
  .rpc('calculate_distance', {
    lat1: 5.6037,
    lon1: -0.1870,
    lat2: 5.5560,
    lon2: -0.1969,
  });

// Expected: ~5.5
```

### Test 5: Existing Features Still Work
- [ ] User can sign in/out
- [ ] User can create listing (without pickup)
- [ ] User can edit profile (existing fields)
- [ ] Chat works
- [ ] Search works
- [ ] Favorites work

---

## 📊 Monitoring

After deployment, monitor:

### Database Metrics
- Query performance (should be unchanged)
- Storage usage (minimal increase expected)
- Index usage (new indexes should show in stats after use)

### Application Metrics
- Error rates (should be unchanged)
- Load times (should be unchanged)
- API response times (should be unchanged)

### Supabase Dashboard
- Database > Performance
- Database > Table Statistics
- Logs > Database Logs (for any errors)

---

## 🚨 Known Issues & Solutions

### Issue 1: Migration Fails on Constraint
**Error:** "constraint check_pickup_requires_location violates"

**Solution:**
```sql
-- Temporarily disable constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS check_pickup_requires_location;

-- Re-apply after fixing data
ALTER TABLE listings
ADD CONSTRAINT check_pickup_requires_location
CHECK (
    pickup_available = false OR 
    pickup_location_override IS NOT NULL OR
    EXISTS (...)
);
```

### Issue 2: Spatial Index Slow to Create
**Error:** Long execution time on large profiles table

**Solution:**
```sql
-- Create index concurrently (doesn't block writes)
CREATE INDEX CONCURRENTLY idx_profiles_location 
ON profiles (business_latitude, business_longitude) 
WHERE business_latitude IS NOT NULL;
```

### Issue 3: RLS Policy Blocks Queries
**Error:** "new row violates row-level security policy"

**Solution:** Verify user is authenticated and owns the record

---

## 📈 Success Metrics

After deployment, confirm:

✅ **Zero Data Loss**
- All existing profiles intact
- All existing listings intact
- All existing business_hours intact

✅ **Zero Downtime**
- App remained accessible during migration
- No 500 errors logged

✅ **Type Safety**
- No TypeScript errors in codebase
- Auto-complete works for new fields

✅ **Performance**
- No regression in query times
- Indexes used by planner

---

## 📞 Support Contacts

If issues arise:

- **Database Admin:** [Your DBA]
- **DevOps:** [Your DevOps Team]
- **On-call Engineer:** [Your On-call]

---

## ✅ Deployment Sign-off

After successful deployment:

- [ ] All tests passed
- [ ] Monitoring shows green
- [ ] Team notified of completion
- [ ] Documentation updated
- [ ] Ready for Phase 2

**Deployed By:** _______________  
**Date:** _______________  
**Time:** _______________  
**Environment:** Production / Staging  

---

## 📝 Notes

Add any deployment-specific notes here:

```
- 
- 
- 
```

---

**Next Step:** Proceed to Phase 2 - Seller Setup Experience

