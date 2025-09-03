-- =============================================
-- ADD UNIQUE CONSTRAINTS FOR USER DATA
-- Ensure username, email, and phone uniqueness
-- =============================================

-- Add unique constraint for username (case-insensitive)
-- First, let's create a unique index that handles case-insensitivity
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx 
ON profiles (LOWER(username)) 
WHERE username IS NOT NULL;

-- Add unique constraint for email (case-insensitive)
-- Email should be unique across the platform
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx 
ON profiles (LOWER(email)) 
WHERE email IS NOT NULL;

-- Add unique constraint for phone numbers
-- This handles both formats: 0241234567 and +233241234567
-- We'll use a functional index with the normalize_phone_number function
-- First, let's create the function, then the index

-- Add a function to normalize phone numbers for consistency
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

-- Now create the phone unique index using the function
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx 
ON profiles (normalize_phone_number(phone)) 
WHERE phone IS NOT NULL;

-- Create a trigger to automatically normalize phone numbers on insert/update
CREATE OR REPLACE FUNCTION normalize_profile_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize phone number if provided
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone := normalize_phone_number(NEW.phone);
  END IF;
  
  -- Normalize username to lowercase for consistency
  IF NEW.username IS NOT NULL AND NEW.username != '' THEN
    NEW.username := LOWER(TRIM(NEW.username));
  END IF;
  
  -- Normalize email to lowercase for consistency
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    NEW.email := LOWER(TRIM(NEW.email));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS normalize_profile_data ON profiles;

-- Create trigger for phone/username/email normalization
CREATE TRIGGER normalize_profile_data
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION normalize_profile_phone();

-- Update existing data to ensure consistency
UPDATE profiles 
SET 
  phone = normalize_phone_number(phone),
  username = LOWER(TRIM(username)),
  email = LOWER(TRIM(email))
WHERE phone IS NOT NULL OR username IS NOT NULL OR email IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX profiles_username_unique_idx IS 'Ensures usernames are unique (case-insensitive)';
COMMENT ON INDEX profiles_email_unique_idx IS 'Ensures email addresses are unique (case-insensitive)';
COMMENT ON INDEX profiles_phone_unique_idx IS 'Ensures phone numbers are unique (normalized format)';
COMMENT ON FUNCTION normalize_phone_number(TEXT) IS 'Normalizes phone numbers to consistent international format';
COMMENT ON FUNCTION normalize_profile_phone() IS 'Trigger function to normalize phone, username, and email on insert/update';
