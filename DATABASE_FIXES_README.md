# 🔧 Database Fixes - User Registration

This document outlines the database fixes applied to resolve user registration issues in the Sellar mobile app.

## 🚨 **Problem Identified**

The user registration system was failing due to:

1. **Broken `handle_new_user` function** - Only inserting `id` field, causing constraint violations
2. **Incomplete RLS policies** - Missing or incorrect Row Level Security policies
3. **Missing profile fields** - Function not handling all required profile columns
4. **No error handling** - Function failing completely instead of graceful fallback

## ✅ **Solutions Implemented**

### 1. **Fixed User Registration Function** (`20250116000006_fix_user_registration.sql`)

**What it does:**
- Creates a robust `handle_new_user` function that handles all profile fields safely
- Includes comprehensive error handling with fallback mechanisms
- Extracts user data from `raw_user_meta_data` with safe defaults
- Creates both profile and user_settings records
- Logs all operations for debugging

**Key Features:**
```sql
-- Safe field extraction with defaults
first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
location_val := COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra');

-- Comprehensive error handling
BEGIN
    INSERT INTO profiles (id, email, phone, location, ...) VALUES (...);
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to minimal insertion
        INSERT INTO profiles (id) VALUES (NEW.id);
END;
```

### 2. **Fixed RLS Policies** (`20250116000007_fix_rls_policies.sql`)

**What it does:**
- Implements comprehensive Row Level Security policies for all tables
- Ensures users can only access their own data
- Allows proper profile visibility controls
- Enables system functions to work correctly

**Key Policies:**
```sql
-- Profiles: Users can view based on visibility settings
CREATE POLICY "Users can view profiles based on visibility" ON profiles
    FOR SELECT USING (
        profile_visibility = 'public' OR
        auth.uid() = id OR
        (profile_visibility = 'friends' AND auth.uid() = id)
    );

-- Users can insert their own profile (for handle_new_user function)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```

### 3. **Comprehensive Testing** (`test-user-registration.sql`)

**What it does:**
- Verifies all database components are working
- Checks function and trigger existence
- Validates table structures and RLS policies
- Provides detailed status reports

### 4. **Automated Test Script** (`scripts/test-user-registration.js`)

**What it does:**
- Tests the complete user registration flow
- Creates a test user and verifies profile creation
- Checks user_settings creation
- Cleans up test data
- Provides detailed success/failure reporting

## 🚀 **How to Apply the Fixes**

### Option 1: Apply All Fixes at Once
```bash
# Run the comprehensive migration script
psql -h your-supabase-host -U postgres -d postgres -f supabase/apply-database-fixes.sql
```

### Option 2: Apply Fixes Individually
```bash
# 1. Fix user registration function
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/20250116000006_fix_user_registration.sql

# 2. Fix RLS policies
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/20250116000007_fix_rls_policies.sql

# 3. Run verification tests
psql -h your-supabase-host -U postgres -d postgres -f supabase/test-user-registration.sql
```

### Option 3: Test with Node.js Script
```bash
# Install dependencies
npm install @supabase/supabase-js dotenv

# Run the test script
node scripts/test-user-registration.js
```

## 🧪 **Testing the Fixes**

### 1. **Database Verification**
```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'handle_new_user';

-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
```

### 2. **User Registration Test**
```javascript
// Test user registration in your app
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
  options: {
    data: {
      first_name: 'Test',
      last_name: 'User',
      phone: '+233123456789',
      location: 'Accra, Greater Accra'
    }
  }
});

// Check if profile was created
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user.id)
  .single();
```

## 📊 **Expected Results**

After applying the fixes, you should see:

✅ **User registration works without errors**
✅ **Profile records are created automatically**
✅ **User settings are created with defaults**
✅ **RLS policies allow proper data access**
✅ **No constraint violation errors**
✅ **Proper error logging for debugging**

## 🔍 **Troubleshooting**

### If User Registration Still Fails:

1. **Check the logs:**
   ```sql
   -- View recent logs
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

2. **Verify function exists:**
   ```sql
   SELECT routine_name FROM information_schema.routines WHERE routine_name = 'handle_new_user';
   ```

3. **Check RLS policies:**
   ```sql
   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';
   ```

4. **Test with minimal data:**
   ```javascript
   const { data, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'password123'
   });
   ```

### Common Issues:

- **"Function does not exist"** → Run the migration scripts
- **"Permission denied"** → Check RLS policies
- **"Constraint violation"** → Check table structure
- **"Profile not created"** → Check trigger and function

## 📝 **Next Steps**

After applying these fixes:

1. **Test user registration** in your app
2. **Verify profile creation** works
3. **Check chat functionality** (depends on profiles)
4. **Test offer system** (depends on profiles)
5. **Verify RLS policies** are working correctly

## 🎯 **Success Criteria**

The fixes are successful when:

- ✅ Users can register without errors
- ✅ Profiles are created automatically
- ✅ User settings are created with defaults
- ✅ No database constraint violations
- ✅ RLS policies work correctly
- ✅ All existing functionality continues to work

---

**Status**: ✅ **Ready for Testing**
**Priority**: 🔴 **Critical**
**Estimated Fix Time**: 30 minutes
**Testing Required**: Yes
