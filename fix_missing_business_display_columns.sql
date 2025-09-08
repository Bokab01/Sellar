-- =============================================
-- FIX: Add missing business display columns to profiles table
-- =============================================

-- Add display_business_name column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_business_name BOOLEAN DEFAULT false;

-- Add business_name_priority column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_name_priority TEXT DEFAULT 'secondary' 
CHECK (business_name_priority IN ('primary', 'secondary', 'hidden'));

-- Add comments to document the columns
COMMENT ON COLUMN profiles.display_business_name IS 'Whether to display business name in user interface';
COMMENT ON COLUMN profiles.business_name_priority IS 'Controls how business name is displayed: primary (show only business name), secondary (show "Name • Business"), hidden (show only personal name)';

-- Update existing business profiles to have default values
UPDATE profiles 
SET display_business_name = false, business_name_priority = 'secondary' 
WHERE is_business = true AND (display_business_name IS NULL OR business_name_priority IS NULL);

-- Success message
SELECT 'Business display columns (display_business_name, business_name_priority) added to profiles table successfully!' as status;
