-- =============================================
-- FIX DUPLICATE EMAIL SIGNUP ISSUE
-- This script helps understand the Supabase behavior
-- =============================================

-- The issue is not in the database, but in how Supabase handles duplicate email signups
-- Supabase intentionally doesn't return an error for existing emails to prevent email enumeration attacks
-- Instead, it returns data.user = null and data.session = null

-- However, we can create a function to check if an email exists before signup
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if email exists in auth.users table
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = email_to_check
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;

-- Test the function
SELECT 'Email check function created successfully' as status;

-- Note: The main fix needs to be implemented in the client-side code
-- The app should check data.user and data.session to determine if signup was successful
