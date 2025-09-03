-- =============================================
-- SYNC EMAIL VERIFICATION WITH SUPABASE AUTH
-- Automatically mark email as verified when user confirms email
-- =============================================

-- Clean up duplicate records and add unique constraint
DO $$ 
BEGIN
  -- First, remove duplicate records, keeping only the most recent one for each user_id + verification_type
  DELETE FROM user_verification uv1
  WHERE EXISTS (
    SELECT 1 FROM user_verification uv2
    WHERE uv2.user_id = uv1.user_id 
    AND uv2.verification_type = uv1.verification_type
    AND uv2.created_at > uv1.created_at
  );
  
  -- Now add the unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_verification_user_id_verification_type_key'
  ) THEN
    ALTER TABLE user_verification 
    ADD CONSTRAINT user_verification_user_id_verification_type_key 
    UNIQUE (user_id, verification_type);
  END IF;
END $$;

-- Create or replace the handle_new_user function to include email verification
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id, 
    first_name, 
    last_name, 
    full_name,
    phone, 
    location,
    email,
    is_business,
    email_verified,
    email_verified_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      TRIM(CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      )),
      'User'
    ),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'is_business')::boolean, false),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NEW.email_confirmed_at
  );
  
  -- If email is already verified, create an email verification record
  IF NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO user_verification (
      user_id,
      verification_type,
      status,
      submitted_data,
      submitted_at,
      reviewed_at,
      approved_at
    ) VALUES (
      NEW.id,
      'email',
      'approved',
      jsonb_build_object('email_address', NEW.email),
      NEW.created_at,
      NEW.email_confirmed_at,
      NEW.email_confirmed_at
    ) ON CONFLICT (user_id, verification_type) DO UPDATE SET
      status = 'approved',
      reviewed_at = NEW.email_confirmed_at,
      approved_at = NEW.email_confirmed_at;
      
    -- Update verification badges and trust score
    PERFORM update_verification_badges(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle email confirmation updates
CREATE OR REPLACE FUNCTION handle_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile email verification status
  UPDATE profiles 
  SET 
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    email_verified_at = NEW.email_confirmed_at
  WHERE id = NEW.id;
  
  -- If email was just confirmed, create/update verification record
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO user_verification (
      user_id,
      verification_type,
      status,
      submitted_data,
      submitted_at,
      reviewed_at,
      approved_at
    ) VALUES (
      NEW.id,
      'email',
      'approved',
      jsonb_build_object('email_address', NEW.email),
      NEW.created_at,
      NEW.email_confirmed_at,
      NEW.email_confirmed_at
    ) ON CONFLICT (user_id, verification_type) DO UPDATE SET
      status = 'approved',
      reviewed_at = NEW.email_confirmed_at,
      approved_at = NEW.email_confirmed_at;
      
    -- Add to verification history
    INSERT INTO verification_history (
      verification_id,
      user_id,
      action,
      actor_type,
      details,
      notes
    ) SELECT 
      uv.id,
      NEW.id,
      'approved',
      'system',
      jsonb_build_object('method', 'supabase_auth_confirmation'),
      'Email verified through Supabase Auth confirmation'
    FROM user_verification uv 
    WHERE uv.user_id = NEW.id AND uv.verification_type = 'email';
      
    -- Update verification badges and trust score
    PERFORM update_verification_badges(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger for email confirmation updates
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_confirmation();

-- =============================================
-- SYNC EXISTING VERIFIED EMAILS
-- =============================================

-- Update existing profiles with email verification status from auth.users
UPDATE profiles 
SET 
  email_verified = (au.email_confirmed_at IS NOT NULL),
  email_verified_at = au.email_confirmed_at
FROM auth.users au 
WHERE profiles.id = au.id;

-- Create email verification records for existing verified users
INSERT INTO user_verification (
  user_id,
  verification_type,
  status,
  submitted_data,
  submitted_at,
  reviewed_at,
  approved_at
)
SELECT 
  au.id,
  'email',
  'approved',
  jsonb_build_object('email_address', au.email),
  au.created_at,
  au.email_confirmed_at,
  au.email_confirmed_at
FROM auth.users au
WHERE au.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, verification_type) DO UPDATE SET
  status = 'approved',
  reviewed_at = EXCLUDED.reviewed_at,
  approved_at = EXCLUDED.approved_at;

-- Update verification badges and trust scores for existing verified users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL
  LOOP
    PERFORM update_verification_badges(user_record.id);
  END LOOP;
END $$;

-- =============================================
-- HELPER FUNCTION TO CHECK AUTH EMAIL STATUS
-- =============================================

-- Function to get current email verification status from auth
CREATE OR REPLACE FUNCTION get_auth_email_verification_status(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_verified BOOLEAN := false;
BEGIN
  SELECT (email_confirmed_at IS NOT NULL) INTO is_verified
  FROM auth.users 
  WHERE id = user_uuid;
  
  RETURN COALESCE(is_verified, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync email verification status from auth
CREATE OR REPLACE FUNCTION sync_email_verification_from_auth(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  auth_record auth.users%ROWTYPE;
  verification_exists BOOLEAN := false;
BEGIN
  -- Get auth user record
  SELECT * INTO auth_record FROM auth.users WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update profile email verification status
  UPDATE profiles 
  SET 
    email_verified = (auth_record.email_confirmed_at IS NOT NULL),
    email_verified_at = auth_record.email_confirmed_at
  WHERE id = user_uuid;
  
  -- If email is verified in auth, ensure verification record exists
  IF auth_record.email_confirmed_at IS NOT NULL THEN
    -- Check if verification record exists
    SELECT EXISTS(
      SELECT 1 FROM user_verification 
      WHERE user_id = user_uuid AND verification_type = 'email'
    ) INTO verification_exists;
    
    -- Create or update verification record
    INSERT INTO user_verification (
      user_id,
      verification_type,
      status,
      submitted_data,
      submitted_at,
      reviewed_at,
      approved_at
    ) VALUES (
      user_uuid,
      'email',
      'approved',
      jsonb_build_object('email_address', auth_record.email),
      auth_record.created_at,
      auth_record.email_confirmed_at,
      auth_record.email_confirmed_at
    ) ON CONFLICT (user_id, verification_type) DO UPDATE SET
      status = 'approved',
      reviewed_at = auth_record.email_confirmed_at,
      approved_at = auth_record.email_confirmed_at;
      
    -- Update verification badges and trust score
    PERFORM update_verification_badges(user_uuid);
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Email verification sync migration completed successfully' as status;
