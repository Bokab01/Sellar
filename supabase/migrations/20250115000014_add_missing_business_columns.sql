-- Add missing business columns to profiles table
-- This migration adds the business_email column that was incomplete in the previous migration

DO $$
BEGIN
    -- Add business_email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_email') THEN
        ALTER TABLE profiles ADD COLUMN business_email TEXT;
    END IF;
    
    -- Add business_description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_description') THEN
        ALTER TABLE profiles ADD COLUMN business_description TEXT;
    END IF;
    
    -- Add display_business_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_business_name') THEN
        ALTER TABLE profiles ADD COLUMN display_business_name BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add business_name_priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_name_priority') THEN
        ALTER TABLE profiles ADD COLUMN business_name_priority TEXT DEFAULT 'secondary' CHECK (business_name_priority IN ('primary', 'secondary', 'hidden'));
    END IF;
    
    -- Add professional_title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'professional_title') THEN
        ALTER TABLE profiles ADD COLUMN professional_title TEXT;
    END IF;
    
    -- Add years_of_experience column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'years_of_experience') THEN
        ALTER TABLE profiles ADD COLUMN years_of_experience INTEGER;
    END IF;
    
    -- Add preferred_contact_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_contact_method') THEN
        ALTER TABLE profiles ADD COLUMN preferred_contact_method TEXT DEFAULT 'app' CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp'));
    END IF;
    
    -- Add response_time_expectation column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'response_time_expectation') THEN
        ALTER TABLE profiles ADD COLUMN response_time_expectation TEXT DEFAULT 'within_hours' CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week'));
    END IF;
    
    -- Add phone_visibility column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_visibility') THEN
        ALTER TABLE profiles ADD COLUMN phone_visibility TEXT DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private'));
    END IF;
    
    -- Add email_visibility column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_visibility') THEN
        ALTER TABLE profiles ADD COLUMN email_visibility TEXT DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private'));
    END IF;
    
    -- Add show_online_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_online_status') THEN
        ALTER TABLE profiles ADD COLUMN show_online_status BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Add show_last_seen column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_last_seen') THEN
        ALTER TABLE profiles ADD COLUMN show_last_seen BOOLEAN DEFAULT TRUE;
    END IF;

END $$;

-- Update the updated_at trigger to include the new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists on profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
