-- =============================================
-- FIX PROFILES TABLE NAME FIELDS
-- Add missing first_name and last_name fields to match frontend expectations
-- =============================================

-- Add the missing name fields to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update existing profiles to split full_name into first_name and last_name
UPDATE profiles 
SET 
    first_name = CASE 
        WHEN full_name IS NOT NULL AND full_name != '' THEN
            CASE 
                WHEN position(' ' in full_name) > 0 THEN
                    split_part(full_name, ' ', 1)
                ELSE full_name
            END
        ELSE 'User'
    END,
    last_name = CASE 
        WHEN full_name IS NOT NULL AND full_name != '' THEN
            CASE 
                WHEN position(' ' in full_name) > 0 THEN
                    substring(full_name from position(' ' in full_name) + 1)
                ELSE ''
            END
        ELSE ''
    END
WHERE first_name IS NULL OR last_name IS NULL;

-- Make first_name and last_name NOT NULL with defaults
ALTER TABLE profiles 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN first_name SET DEFAULT 'User',
ALTER COLUMN last_name SET NOT NULL,
ALTER COLUMN last_name SET DEFAULT '';

-- Update the handle_new_user function to populate first_name and last_name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_full_name TEXT;
BEGIN
    -- Extract first and last names from metadata
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
    
    -- Create full name
    v_full_name := CASE 
        WHEN v_first_name != '' AND v_last_name != '' THEN v_first_name || ' ' || v_last_name
        WHEN v_first_name != '' THEN v_first_name
        WHEN v_last_name != '' THEN v_last_name
        ELSE 'User'
    END;
    
    -- Create profile for new user
    INSERT INTO profiles (
        id,
        first_name,
        last_name,
        full_name,
        email,
        phone,
        location,
        is_business
    )
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(v_first_name), ''), 'User'),
        COALESCE(NULLIF(TRIM(v_last_name), ''), ''),
        v_full_name,
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra'),
        COALESCE((NEW.raw_user_meta_data->>'is_business')::boolean, false)
    );
    
    -- Create user settings with defaults
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
    
    -- Create user credits record
    INSERT INTO user_credits (user_id, balance)
    VALUES (NEW.id, 0);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        
        -- Still return NEW to allow user creation in auth.users
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions for the updated function
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Add a trigger to automatically update full_name when first_name or last_name changes
CREATE OR REPLACE FUNCTION update_full_name_from_parts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update full_name when first_name or last_name changes
    NEW.full_name := CASE 
        WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN
            NEW.first_name || ' ' || NEW.last_name
        WHEN NEW.first_name IS NOT NULL AND NEW.first_name != '' THEN
            NEW.first_name
        WHEN NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN
            NEW.last_name
        ELSE 'User'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic full_name updates
DROP TRIGGER IF EXISTS update_full_name_trigger ON profiles;
CREATE TRIGGER update_full_name_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_full_name_from_parts();

-- Verify the changes
SELECT 
    'Profiles table updated successfully' as status,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as profiles_with_first_name,
    COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as profiles_with_last_name,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as profiles_with_full_name
FROM profiles;
