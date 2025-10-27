-- Migration: Add function to verify user password
-- This allows password verification without triggering full sign-in flow

CREATE OR REPLACE FUNCTION verify_user_password(password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the current authenticated user
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Attempt to verify password using auth.users
  -- Note: This is a simplified version. In production, you might want
  -- to use Supabase's built-in password verification if available
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = user_id
    AND encrypted_password = crypt(password, encrypted_password)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION verify_user_password TO authenticated;

-- Add comment
COMMENT ON FUNCTION verify_user_password IS 'Verifies the current user password without triggering sign-in events';

