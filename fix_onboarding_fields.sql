-- =============================================
-- ADD ONBOARDING COMPLETION FIELDS TO PROFILES TABLE
-- Add fields to track when users complete onboarding
-- =============================================

-- Add onboarding completion fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Update existing users who have been using the app to mark them as having completed onboarding
-- This prevents them from seeing the welcome screen again
UPDATE profiles 
SET 
    onboarding_completed = true,
    onboarding_completed_at = created_at
WHERE 
    onboarding_completed = false 
    AND created_at < NOW() - INTERVAL '1 day';

-- Verify the changes
SELECT 
    id,
    full_name,
    onboarding_completed,
    onboarding_completed_at,
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;
