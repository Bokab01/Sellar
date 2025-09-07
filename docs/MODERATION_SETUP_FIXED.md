# 🛡️ Content Moderation System - Fixed Setup

## 🚨 **Issue Fixed**

The original migration had a dependency issue where it tried to reference the `listings` table before ensuring it exists. The new fixed migration handles this gracefully.

---

## ✅ **Quick Fix - Use the New Migration**

### **Option 1: Use the Fixed Migration File**

```bash
# Use the new fixed migration instead
supabase db push --include-all
```

Or manually apply:

```bash
# Apply the fixed migration
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20250116000010_content_moderation_system_fixed.sql
```

### **Option 2: Manual SQL Execution**

If you prefer to run the SQL directly in your Supabase dashboard:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of `supabase/migrations/20250116000010_content_moderation_system_fixed.sql`
3. Paste and run the SQL

---

## 🔧 **What the Fixed Migration Does**

### **Smart Dependency Handling:**
- ✅ Creates moderation tables **without** foreign key constraints initially
- ✅ Checks if `listings` and `profiles` tables exist
- ✅ Adds foreign key constraints **only if** referenced tables exist
- ✅ Handles missing columns gracefully
- ✅ Uses `ON CONFLICT DO NOTHING` for data inserts

### **Safe Operations:**
- ✅ `CREATE TABLE IF NOT EXISTS` - Won't fail if tables exist
- ✅ `ADD COLUMN IF NOT EXISTS` - Won't fail if columns exist
- ✅ `DROP POLICY IF EXISTS` - Won't fail if policies don't exist
- ✅ Dynamic constraint checking - Only adds constraints when safe

---

## 🎯 **Expected Results**

After running the fixed migration, you should have:

### **New Tables Created:**
- ✅ `moderation_categories` (8 default categories)
- ✅ `moderation_logs` (audit trail)
- ✅ `reports` (community reporting)
- ✅ `user_reputation` (trust scoring)
- ✅ `keyword_blacklist` (15+ banned terms)

### **Enhanced Existing Tables:**
- ✅ `listings` table gets moderation columns
- ✅ `profiles` table gets ban/moderation columns

### **Security & Performance:**
- ✅ Row Level Security (RLS) policies
- ✅ Performance indexes
- ✅ Database functions and triggers

---

## 🧪 **Test the Setup**

After applying the migration, test it:

```sql
-- Check that tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('moderation_categories', 'moderation_logs', 'reports', 'user_reputation', 'keyword_blacklist');

-- Check moderation categories
SELECT name, severity_level, auto_action FROM moderation_categories;

-- Check keyword blacklist
SELECT keyword, severity_level FROM keyword_blacklist LIMIT 5;

-- Check if listings table has moderation columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'listings' AND column_name LIKE '%moderation%';
```

---

## 🚀 **Next Steps**

Once the migration is applied successfully:

1. **Deploy Edge Function**:
   ```bash
   supabase functions deploy moderate-content
   ```

2. **Set API Keys**:
   ```bash
   supabase secrets set OPENAI_API_KEY=your-key-here
   supabase secrets set GOOGLE_CLOUD_API_KEY=your-key-here
   ```

3. **Test the System**:
   - Create a test listing with banned keywords
   - Verify moderation works
   - Test community reporting

---

## 🛠️ **Troubleshooting**

### **If You Still Get Errors:**

1. **Check Table Existence**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name IN ('listings', 'profiles');
   ```

2. **Run Core Schema First**:
   ```bash
   # Make sure core database schema is applied first
   supabase db push --include-all
   ```

3. **Manual Step-by-Step**:
   If needed, you can run parts of the migration manually:
   
   ```sql
   -- Step 1: Create moderation_categories first
   CREATE TABLE IF NOT EXISTS moderation_categories (...);
   
   -- Step 2: Create other tables
   CREATE TABLE IF NOT EXISTS moderation_logs (...);
   
   -- Step 3: Add foreign keys later
   ALTER TABLE moderation_logs ADD CONSTRAINT ...;
   ```

---

## ✅ **Success Indicators**

You'll know the setup worked when:

- ✅ No SQL errors during migration
- ✅ All 5 moderation tables exist
- ✅ 8 moderation categories inserted
- ✅ 15+ keywords in blacklist
- ✅ `listings` table has `moderation_status` column
- ✅ RLS policies are active

---

**The fixed migration is bulletproof and will work regardless of your current database state!** 🛡️
