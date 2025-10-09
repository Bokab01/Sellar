-- =============================================
-- ADD PRIVACY AND SECURITY FIELDS TO USER_SETTINGS
-- =============================================
-- Issue: MFASetup and PrivacySettings components reference non-existent 'user_privacy_settings' table
-- Solution: Add all privacy and security fields to existing user_settings table
-- =============================================

-- Add privacy and security columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS email_visibility VARCHAR(20) DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private')),
ADD COLUMN IF NOT EXISTS last_seen_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_searchable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_in_suggestions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_messages_from VARCHAR(20) DEFAULT 'everyone' CHECK (allow_messages_from IN ('everyone', 'contacts', 'none')),
ADD COLUMN IF NOT EXISTS allow_calls_from VARCHAR(20) DEFAULT 'contacts' CHECK (allow_calls_from IN ('everyone', 'contacts', 'none')),
ADD COLUMN IF NOT EXISTS data_processing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS login_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS suspicious_activity_alerts BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN user_settings.email_visibility IS 'Controls who can see the user email: public, contacts, or private. Defaults to private.';
COMMENT ON COLUMN user_settings.last_seen_visible IS 'Whether to show when the user was last active. Defaults to true.';
COMMENT ON COLUMN user_settings.profile_searchable IS 'Whether the profile appears in search results. Defaults to true.';
COMMENT ON COLUMN user_settings.show_in_suggestions IS 'Whether to show user in friend/connection suggestions. Defaults to true.';
COMMENT ON COLUMN user_settings.allow_messages_from IS 'Who can send messages: everyone, contacts, or none. Defaults to everyone.';
COMMENT ON COLUMN user_settings.allow_calls_from IS 'Who can call: everyone, contacts, or none. Defaults to contacts.';
COMMENT ON COLUMN user_settings.data_processing_consent IS 'Whether user has consented to data processing. Defaults to false.';
COMMENT ON COLUMN user_settings.marketing_consent IS 'Whether user has consented to marketing communications. Defaults to false.';
COMMENT ON COLUMN user_settings.analytics_consent IS 'Whether user has consented to analytics tracking. Defaults to true.';
COMMENT ON COLUMN user_settings.two_factor_enabled IS 'Whether two-factor authentication (MFA) is enabled. Defaults to false.';
COMMENT ON COLUMN user_settings.login_notifications IS 'Whether to send notifications for new logins. Defaults to true.';
COMMENT ON COLUMN user_settings.suspicious_activity_alerts IS 'Whether to send alerts for suspicious activity. Defaults to true.';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_settings_two_factor 
ON user_settings(user_id, two_factor_enabled) 
WHERE two_factor_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_settings_privacy 
ON user_settings(user_id, profile_searchable, show_in_suggestions);

COMMENT ON INDEX idx_user_settings_two_factor IS 'Optimize queries for users with MFA enabled';
COMMENT ON INDEX idx_user_settings_privacy IS 'Optimize privacy-related queries';

