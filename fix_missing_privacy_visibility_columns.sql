-- =============================================
-- FIX: Add missing professional, contact preferences and privacy columns to profiles table
-- =============================================

-- Add professional_title column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS professional_title TEXT;

-- Add years_of_experience column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;

-- Add specializations column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';

-- Add preferred_contact_method column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'app' 
CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp'));

-- Add response_time_expectation column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS response_time_expectation TEXT DEFAULT 'within_hours' 
CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week'));

-- Add phone_visibility column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_visibility TEXT DEFAULT 'contacts' 
CHECK (phone_visibility IN ('public', 'contacts', 'private'));

-- Add email_visibility column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_visibility TEXT DEFAULT 'private' 
CHECK (email_visibility IN ('public', 'contacts', 'private'));

-- Add show_online_status column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;

-- Add show_last_seen column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_last_seen BOOLEAN DEFAULT true;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.professional_title IS 'User professional title or job position (e.g., Software Developer, Teacher)';
COMMENT ON COLUMN profiles.years_of_experience IS 'Number of years of professional experience';
COMMENT ON COLUMN profiles.specializations IS 'Array of user specializations or areas of expertise';
COMMENT ON COLUMN profiles.preferred_contact_method IS 'User preferred method of contact: app (in-app messaging), phone, email, whatsapp';
COMMENT ON COLUMN profiles.response_time_expectation IS 'Expected response time: within_minutes, within_hours, within_day, within_week';
COMMENT ON COLUMN profiles.phone_visibility IS 'Controls who can see the user phone number: public (everyone), contacts (people you have chatted with), private (no one)';
COMMENT ON COLUMN profiles.email_visibility IS 'Controls who can see the user email: public (everyone), contacts (people you have chatted with), private (no one)';
COMMENT ON COLUMN profiles.show_online_status IS 'Whether to show online status to other users';
COMMENT ON COLUMN profiles.show_last_seen IS 'Whether to show last seen timestamp to other users';

-- Update existing profiles to have default values
UPDATE profiles 
SET 
  specializations = '{}',
  preferred_contact_method = 'app',
  response_time_expectation = 'within_hours',
  phone_visibility = 'contacts',
  email_visibility = 'private',
  show_online_status = true,
  show_last_seen = true
WHERE 
  specializations IS NULL
  OR preferred_contact_method IS NULL 
  OR response_time_expectation IS NULL
  OR phone_visibility IS NULL 
  OR email_visibility IS NULL 
  OR show_online_status IS NULL 
  OR show_last_seen IS NULL;

-- Success message
SELECT 'Professional, contact preferences and privacy columns (professional_title, years_of_experience, specializations, preferred_contact_method, response_time_expectation, phone_visibility, email_visibility, show_online_status, show_last_seen) added to profiles table successfully!' as status;
