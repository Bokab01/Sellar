-- =============================================
-- FIX RLS POLICIES FOR SIGNUP
-- Allow users to create their own profiles during signup
-- =============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Create comprehensive RLS policies for profiles
-- 1. Allow anyone to view public profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT USING (TRUE);

-- 2. Allow users to insert their own profile (critical for signup)
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- 4. Allow users to delete their own profile (optional)
CREATE POLICY "Users can delete own profile" ON profiles
FOR DELETE USING (auth.uid() = id);

-- Also fix the handle_new_user function to work with RLS
-- The function needs to run with SECURITY DEFINER to bypass RLS during trigger execution
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- This is crucial - allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
    -- Insert basic profile - this will now work because of SECURITY DEFINER
    BEGIN
        INSERT INTO profiles (id) 
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;
        
        RAISE LOG 'Profile created successfully for user: %', NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE LOG 'Profile creation failed for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify RLS is enabled but with proper policies
SELECT 'RLS policies updated successfully for profiles table' as status;
