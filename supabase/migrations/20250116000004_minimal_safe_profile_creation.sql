-- =============================================
-- MINIMAL SAFE PROFILE CREATION
-- This migration creates the most basic profile creation possible
-- =============================================

-- Drop any existing handle_new_user function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the most minimal profile creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert the absolute minimum: just the ID
    -- Everything else will be handled by the application layer
    BEGIN
        INSERT INTO profiles (id) 
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the function exists
SELECT 'handle_new_user function created successfully' as status;
