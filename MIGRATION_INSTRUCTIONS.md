# Database Migration Instructions

To complete the edit profile integration, you need to add the following columns to your `profiles` table in Supabase.

## Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query

## Step 2: Execute the Following SQL

Copy and paste this SQL into the editor and run it:

```sql
-- Add professional fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professional_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;

-- Add contact preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'app' CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS response_time_expectation TEXT DEFAULT 'within_hours' CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week'));

-- Add privacy settings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_visibility TEXT DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_visibility TEXT DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_last_seen BOOLEAN DEFAULT TRUE;

-- Add business fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_business_name BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name_priority TEXT DEFAULT 'secondary' CHECK (business_name_priority IN ('primary', 'secondary', 'hidden'));

-- Add missing basic fields if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add unique constraints for data integrity
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
ON profiles (LOWER(username)) 
WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx 
ON profiles (LOWER(email)) 
WHERE email IS NOT NULL;

-- First create the phone normalization function
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all spaces and special characters except + and digits
  phone_input := REGEXP_REPLACE(phone_input, '[^+0-9]', '', 'g');
  
  -- Convert Ghana local format to international
  IF phone_input LIKE '0%' AND LENGTH(phone_input) = 10 THEN
    RETURN '+233' || SUBSTRING(phone_input FROM 2);
  END IF;
  
  -- Return as-is if already in international format
  IF phone_input LIKE '+233%' AND LENGTH(phone_input) = 13 THEN
    RETURN phone_input;
  END IF;
  
  -- Return original if format is not recognized
  RETURN phone_input;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Then create the unique index using the function
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx 
ON profiles (normalize_phone_number(phone)) 
WHERE phone IS NOT NULL;
```

## Step 3: Verify the Changes
After running the SQL, you can verify the columns were added by running:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY column_name;
```

## Step 4: Test the Integration
Once the migration is complete, the edit profile screen should work without any "column not found" errors.

## What This Enables
- ✅ Complete professional profile information
- ✅ Business profile setup and management
- ✅ Privacy settings for contact information
- ✅ Contact preferences and response time expectations
- ✅ Business name display toggle
- ✅ All form fields working without errors
