-- =============================================
-- SAFE HANDLE_NEW_USER FUNCTION
-- Create a robust function that only inserts into guaranteed fields
-- =============================================

-- Create or replace the handle_new_user function with minimal safe fields
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert basic profile with only core required fields
  INSERT INTO profiles (
    id, 
    first_name, 
    last_name, 
    full_name,
    phone, 
    location
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
    COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra')
  );
  
  -- Update additional fields if they exist (using UPDATE to avoid constraint issues)
  UPDATE profiles 
  SET 
    email = NEW.email,
    is_verified = false,
    is_business = false,
    is_active = true,
    profile_visibility = 'public',
    show_location = true,
    total_listings = 0,
    total_sales = 0,
    total_purchases = 0,
    rating_average = 0.00,
    rating_count = 0
  WHERE id = NEW.id;
  
  -- Create default user settings if the table exists
  BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN others THEN
      -- Ignore if user_settings table doesn't exist
      NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
