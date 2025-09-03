-- =============================================
-- FIX PROFILE CREATION TRIGGER
-- Ensure profiles are created with full_name when users sign up
-- =============================================

-- Create or replace the handle_new_user function
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
    is_business
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
    COALESCE((NEW.raw_user_meta_data->>'is_business')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing profiles that don't have full_name set
UPDATE profiles 
SET full_name = COALESCE(
  NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
  'User'
)
WHERE full_name IS NULL OR full_name = '';
