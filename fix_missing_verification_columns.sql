-- =============================================
-- FIX: Add missing verification columns to profiles table
-- =============================================

-- Add verification_badges column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_badges TEXT[] DEFAULT '{}';

-- Add trust_score column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;

-- Add trust_score_updated_at column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments to document the columns
COMMENT ON COLUMN profiles.verification_badges IS 'Array of verification badges earned by the user (e.g., verified_email, verified_phone, verified_identity)';
COMMENT ON COLUMN profiles.trust_score IS 'User trust score based on verification status and activity (0-100)';
COMMENT ON COLUMN profiles.trust_score_updated_at IS 'Timestamp when the trust score was last updated';

-- Success message
SELECT 'All missing verification columns added to profiles table successfully!' as status;
