-- =============================================
-- SELLAR MOBILE APP - TERMS ACCEPTANCE TRACKING
-- Migration 39: Add terms and privacy policy acceptance tracking
-- =============================================

-- Add terms acceptance fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS privacy_policy_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT DEFAULT '1.0';

-- Create index for terms acceptance queries
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted 
ON profiles(terms_accepted_at) 
WHERE terms_accepted_at IS NOT NULL;

-- Create index for privacy policy acceptance queries
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_accepted 
ON profiles(privacy_policy_accepted_at) 
WHERE privacy_policy_accepted_at IS NOT NULL;

-- Create function to update terms acceptance
CREATE OR REPLACE FUNCTION update_terms_acceptance(
    p_user_id UUID,
    p_terms_version TEXT DEFAULT '1.0',
    p_privacy_version TEXT DEFAULT '1.0'
)
RETURNS JSON AS $$
BEGIN
    UPDATE profiles 
    SET 
        terms_accepted_at = NOW(),
        privacy_policy_accepted_at = NOW(),
        terms_version = p_terms_version,
        privacy_policy_version = p_privacy_version,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Terms acceptance updated successfully',
            'accepted_at', NOW()
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_terms_acceptance TO authenticated;

-- Create function to check if user has accepted current terms
CREATE OR REPLACE FUNCTION check_terms_acceptance(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_profile RECORD;
    v_current_terms_version TEXT := '1.0';
    v_current_privacy_version TEXT := '1.0';
BEGIN
    SELECT 
        terms_accepted_at,
        privacy_policy_accepted_at,
        terms_version,
        privacy_policy_version
    INTO v_profile
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'terms_accepted', v_profile.terms_accepted_at IS NOT NULL,
        'privacy_accepted', v_profile.privacy_policy_accepted_at IS NOT NULL,
        'terms_current', COALESCE(v_profile.terms_version, '1.0') = v_current_terms_version,
        'privacy_current', COALESCE(v_profile.privacy_policy_version, '1.0') = v_current_privacy_version,
        'terms_accepted_at', v_profile.terms_accepted_at,
        'privacy_accepted_at', v_profile.privacy_policy_accepted_at,
        'terms_version', COALESCE(v_profile.terms_version, '1.0'),
        'privacy_version', COALESCE(v_profile.privacy_policy_version, '1.0')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_terms_acceptance TO authenticated;

-- Update existing users to have accepted terms (for migration purposes)
-- This assumes existing users have implicitly accepted terms by using the app
UPDATE profiles 
SET 
    terms_accepted_at = created_at,
    privacy_policy_accepted_at = created_at,
    terms_version = '1.0',
    privacy_policy_version = '1.0'
WHERE terms_accepted_at IS NULL;

-- Verification
DO $$
BEGIN
    -- Check if columns were added
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'terms_accepted_at'
    ) THEN
        RAISE NOTICE 'SUCCESS: Terms acceptance columns added to profiles table';
    ELSE
        RAISE EXCEPTION 'FAILED: Terms acceptance columns were not added';
    END IF;
    
    -- Check if functions were created
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'update_terms_acceptance'
    ) THEN
        RAISE NOTICE 'SUCCESS: update_terms_acceptance function created';
    ELSE
        RAISE EXCEPTION 'FAILED: update_terms_acceptance function was not created';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'check_terms_acceptance'
    ) THEN
        RAISE NOTICE 'SUCCESS: check_terms_acceptance function created';
    ELSE
        RAISE EXCEPTION 'FAILED: check_terms_acceptance function was not created';
    END IF;
END $$;
