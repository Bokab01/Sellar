-- =============================================
-- ADD MISSING FIELDS TO USER_VERIFICATION TABLE
-- =============================================
-- Issue: useVerification hook references non-existent columns in 'user_verification' table
-- Solution: Add device_info, user_agent, ip_address, submitted_data, approved_at, expires_at
-- =============================================

-- Add missing columns to user_verification table
ALTER TABLE user_verification 
ADD COLUMN IF NOT EXISTS submitted_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN user_verification.submitted_data IS 'Data submitted by user for verification (e.g., phone number, email, documents)';
COMMENT ON COLUMN user_verification.ip_address IS 'IP address from which the verification request was made';
COMMENT ON COLUMN user_verification.user_agent IS 'Browser/device user agent string';
COMMENT ON COLUMN user_verification.device_info IS 'Additional device information (model, OS version, etc.)';
COMMENT ON COLUMN user_verification.approved_at IS 'Timestamp when verification was approved';
COMMENT ON COLUMN user_verification.expires_at IS 'When the verification request expires (if applicable)';
COMMENT ON COLUMN user_verification.verification_code IS 'Code sent to user for phone/email verification (6-10 digits)';
COMMENT ON COLUMN user_verification.verification_code_expires_at IS 'When the verification code expires (typically 10-15 minutes)';
COMMENT ON COLUMN user_verification.verification_attempts IS 'Number of times user has attempted to verify with incorrect code';

-- Create indexes for expiration cleanup and verification code lookups
CREATE INDEX IF NOT EXISTS idx_user_verification_expires 
ON user_verification(expires_at) 
WHERE status = 'pending' AND expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_verification_code_expires 
ON user_verification(verification_code_expires_at) 
WHERE verification_code IS NOT NULL AND verification_code_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_verification_code 
ON user_verification(verification_code, verification_type) 
WHERE verification_code IS NOT NULL AND status = 'pending';

COMMENT ON INDEX idx_user_verification_expires IS 'Optimize cleanup queries for expired verification requests';

COMMENT ON INDEX idx_user_verification_code_expires IS 'Optimize cleanup queries for expired verification codes';

COMMENT ON INDEX idx_user_verification_code IS 'Optimize verification code lookups for phone/email verification';

