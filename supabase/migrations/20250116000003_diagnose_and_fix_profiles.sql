-- =============================================
-- DIAGNOSE AND FIX PROFILES TABLE ISSUES
-- Create a bulletproof handle_new_user function
-- =============================================

-- First, let's create a function that only uses absolutely guaranteed fields
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists (prevent duplicate key errors)
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN NEW;
    END IF;
    
    -- Try the most basic insertion first
    BEGIN
        INSERT INTO profiles (id) VALUES (NEW.id);
    EXCEPTION
        WHEN OTHERS THEN
            -- If even basic insertion fails, log and return
            RAISE LOG 'Failed to create basic profile for user %: %', NEW.id, SQLERRM;
            RETURN NEW;
    END;
    
    -- Now try to update with additional fields one by one
    -- This approach prevents the entire operation from failing if one field doesn't exist
    
    -- Update first_name
    BEGIN
        UPDATE profiles SET first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', 'User') WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update first_name for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Update last_name
    BEGIN
        UPDATE profiles SET last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', '') WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update last_name for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Update full_name
    BEGIN
        UPDATE profiles SET full_name = COALESCE(
            TRIM(CONCAT(
                COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
                ' ',
                COALESCE(NEW.raw_user_meta_data->>'last_name', '')
            )),
            'User'
        ) WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update full_name for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Update phone
    BEGIN
        UPDATE profiles SET phone = NEW.raw_user_meta_data->>'phone' WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update phone for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Update location
    BEGIN
        UPDATE profiles SET location = COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra') WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update location for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Update email
    BEGIN
        UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update email for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Update is_business
    BEGIN
        UPDATE profiles SET is_business = COALESCE((NEW.raw_user_meta_data->>'is_business')::boolean, false) WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update is_business for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Update is_verified
    BEGIN
        UPDATE profiles SET is_verified = false WHERE id = NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not update is_verified for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Try to create user settings (completely optional)
    BEGIN
        INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'Could not create user_settings for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a diagnostic function to check what fields exist
CREATE OR REPLACE FUNCTION check_profiles_schema()
RETURNS TABLE(column_name TEXT, data_type TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::TEXT,
        c.data_type::TEXT
    FROM information_schema.columns c
    WHERE c.table_name = 'profiles' 
    AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Log the current schema for debugging
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE LOG 'Current profiles table schema:';
    FOR col_record IN SELECT * FROM check_profiles_schema() LOOP
        RAISE LOG 'Column: % (Type: %)', col_record.column_name, col_record.data_type;
    END LOOP;
END $$;
