-- =============================================
-- FIX HANDLE_NEW_USER FUNCTION
-- Remove non-existent fields that are causing database errors
-- =============================================

-- Create or replace the handle_new_user function with safe field insertion
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile with only guaranteed fields
  INSERT INTO profiles (
    id, 
    first_name, 
    last_name, 
    full_name,
    phone, 
    location,
    is_verified,
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
    false,
    false
  );
  
  -- Create default user settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
