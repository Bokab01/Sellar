-- =============================================
-- ENHANCE APP SETTINGS TABLE
-- =============================================
-- Enhance existing app_settings table for comprehensive configuration management

-- Add missing columns to app_settings
ALTER TABLE app_settings 
  ADD COLUMN IF NOT EXISTS value_type VARCHAR(20) CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'array')),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- Set default value_type for existing rows
UPDATE app_settings SET value_type = 'json' WHERE value_type IS NULL;
UPDATE app_settings SET category = 'general' WHERE category IS NULL;
UPDATE app_settings SET is_active = true WHERE is_active IS NULL;
UPDATE app_settings SET is_public = false WHERE is_public IS NULL;

-- Make value_type NOT NULL after setting defaults
ALTER TABLE app_settings ALTER COLUMN value_type SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN category SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category, is_active);
CREATE INDEX IF NOT EXISTS idx_app_settings_public ON app_settings(is_public, is_active);

-- Insert/Update default app settings (using UPSERT pattern)
INSERT INTO app_settings (key, value, value_type, category, description, is_public) VALUES
-- Business Rules
('max_listing_images', '8', 'number', 'business_rules', 'Maximum images for regular users', true),
('max_listing_images_pro', '15', 'number', 'business_rules', 'Maximum images for Sellar Pro users', true),
('max_free_listings', '5', 'number', 'business_rules', 'Maximum active listings for free users', true),
('additional_listing_fee', '5', 'number', 'business_rules', 'Fee in credits for each listing beyond the limit', true),
('listing_expiry_days', '90', 'number', 'business_rules', 'Days before listing expires', true),
('auto_refresh_interval_hours', '2', 'number', 'business_rules', 'Auto-refresh interval for Pro users in hours', true),

-- Feature Flags
('enable_video_uploads', 'true', 'boolean', 'feature_flags', 'Enable video uploads for Sellar Pro users', true),
('enable_chat', 'true', 'boolean', 'feature_flags', 'Enable chat feature', true),
('enable_offers', 'true', 'boolean', 'feature_flags', 'Enable offer/negotiation feature', true),
('enable_reservations', 'true', 'boolean', 'feature_flags', 'Enable item reservation feature', true),
('enable_events', 'true', 'boolean', 'feature_flags', 'Enable events/marketplace events', true),
('enable_community', 'true', 'boolean', 'feature_flags', 'Enable community/social features', true),

-- Payment & Credits
('min_withdrawal_amount', '50', 'number', 'payments', 'Minimum withdrawal amount in GHS', false),
('platform_commission_rate', '0.10', 'number', 'payments', 'Platform commission rate (10%)', false),
('credit_to_ghs_rate', '0.167', 'number', 'payments', 'Credit to GHS conversion rate', true),

-- Search & Discovery
('featured_listings_count', '10', 'number', 'discovery', 'Number of featured listings to show on homepage', true),
('trending_threshold_hours', '24', 'number', 'discovery', 'Hours to consider for trending calculations', true),
('search_results_per_page', '20', 'number', 'discovery', 'Number of search results per page', true),

-- User Limits
('max_chat_messages_per_day', '100', 'number', 'limits', 'Max chat messages per day for free users', false),
('max_offers_per_listing', '5', 'number', 'limits', 'Max active offers per listing', true),
('max_favorites', '500', 'number', 'limits', 'Max favorites for users', true),
('max_profile_bio_length', '500', 'number', 'limits', 'Max characters in profile bio', true),

-- Content Moderation
('auto_moderation_enabled', 'true', 'boolean', 'moderation', 'Enable automatic content moderation', false),
('profanity_filter_enabled', 'true', 'boolean', 'moderation', 'Enable profanity filter', false),
('min_listing_title_length', '5', 'number', 'moderation', 'Minimum listing title length', true),
('max_listing_title_length', '100', 'number', 'moderation', 'Maximum listing title length', true),
('min_listing_price', '1', 'number', 'moderation', 'Minimum listing price in GHS', true),

-- Notifications
('enable_push_notifications', 'true', 'boolean', 'notifications', 'Enable push notifications', true),
('enable_email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications', true),
('notification_batch_interval_minutes', '5', 'number', 'notifications', 'Batch similar notifications within X minutes', false),

-- UI Configuration
('show_trending_section', 'true', 'boolean', 'ui_config', 'Show trending section on homepage', true),
('show_recommended_section', 'true', 'boolean', 'ui_config', 'Show recommended section on homepage', true),
('show_business_listings', 'true', 'boolean', 'ui_config', 'Show business listings section', true),
('homepage_banner_enabled', 'false', 'boolean', 'ui_config', 'Enable promotional banner on homepage', true),

-- App Maintenance
('maintenance_mode', 'false', 'boolean', 'system', 'Enable maintenance mode', true),
('maintenance_message', '"We are currently performing maintenance. Please check back soon."', 'string', 'system', 'Message to show during maintenance', true),
('min_app_version_android', '"1.0.0"', 'string', 'system', 'Minimum required app version for Android', true),
('min_app_version_ios', '"1.0.0"', 'string', 'system', 'Minimum required app version for iOS', true),
('force_update_android', 'false', 'boolean', 'system', 'Force update for Android users', true),
('force_update_ios', 'false', 'boolean', 'system', 'Force update for iOS users', true),

-- In-App Announcements
('announcement_enabled', 'false', 'boolean', 'announcements', 'Show in-app announcement banner', true),
('announcement_title', '""', 'string', 'announcements', 'Announcement banner title', true),
('announcement_message', '""', 'string', 'announcements', 'Announcement banner message', true),
('announcement_type', '"info"', 'string', 'announcements', 'Announcement type: info, success, warning, error, promo', true),
('announcement_action_text', '""', 'string', 'announcements', 'Call-to-action button text (optional)', true),
('announcement_action_url', '""', 'string', 'announcements', 'Deep link or screen to navigate to (optional)', true),
('announcement_dismissible', 'true', 'boolean', 'announcements', 'Allow users to dismiss announcement', true),
('announcement_expires_at', 'null', 'string', 'announcements', 'Expiry timestamp (ISO 8601) or null for no expiry', true),

-- UI Theme Customization
('primary_color', '"#007AFF"', 'string', 'theme', 'Primary brand color (hex)', true),
('secondary_color', '"#5856D6"', 'string', 'theme', 'Secondary brand color (hex)', true),
('accent_color', '"#FF9500"', 'string', 'theme', 'Accent color for highlights (hex)', true),
('success_color', '"#34C759"', 'string', 'theme', 'Success state color (hex)', true),
('error_color', '"#FF3B30"', 'string', 'theme', 'Error state color (hex)', true),
('warning_color', '"#FF9500"', 'string', 'theme', 'Warning state color (hex)', true),
('dark_mode_enabled', 'true', 'boolean', 'theme', 'Enable dark mode support', true),
('default_theme', '"system"', 'string', 'theme', 'Default theme: light, dark, system, amoled', true),
('custom_font_enabled', 'false', 'boolean', 'theme', 'Enable custom font family', true),
('font_family', '"System"', 'string', 'theme', 'Custom font family name', true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- Create/Replace trigger for auto-update timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_settings_updated_at ON app_settings;
CREATE TRIGGER trigger_update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Add RLS policies (if not already enabled)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all users to read public app settings" ON app_settings;
DROP POLICY IF EXISTS "Allow authenticated users to read all active app settings" ON app_settings;

-- Allow all users to read public settings
CREATE POLICY "Allow all users to read public app settings"
  ON app_settings
  FOR SELECT
  USING (is_public = true AND is_active = true);

-- Allow authenticated users to read all active settings
CREATE POLICY "Allow authenticated users to read all active app settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Add comments
COMMENT ON TABLE app_settings IS 'Dynamic app-wide settings for configuration without app updates. Managed by admin dashboard.';
COMMENT ON COLUMN app_settings.key IS 'Unique setting identifier (e.g., max_listing_images)';
COMMENT ON COLUMN app_settings.value IS 'Setting value stored as JSONB for flexibility';
COMMENT ON COLUMN app_settings.value_type IS 'Type hint for proper value parsing';
COMMENT ON COLUMN app_settings.category IS 'Setting category for organization';
COMMENT ON COLUMN app_settings.is_public IS 'If true, accessible without authentication';

-- Create helper function to get setting value
CREATE OR REPLACE FUNCTION get_app_setting(setting_key VARCHAR)
RETURNS JSONB AS $$
DECLARE
  setting_value JSONB;
BEGIN
  SELECT value INTO setting_value
  FROM app_settings
  WHERE key = setting_key
    AND is_active = true;
  
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_app_setting IS 'Helper function to get app setting value by key';

-- Create helper function to get multiple settings by category
CREATE OR REPLACE FUNCTION get_app_settings_by_category(setting_category VARCHAR)
RETURNS TABLE (
  key VARCHAR,
  value JSONB,
  value_type VARCHAR,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.key,
    s.value,
    s.value_type,
    s.description
  FROM app_settings s
  WHERE s.category = setting_category
    AND s.is_active = true
  ORDER BY s.key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_app_settings_by_category IS 'Helper function to get all settings for a category';

-- Create view for easy querying of typed values
CREATE OR REPLACE VIEW app_settings_typed AS
SELECT 
  key,
  CASE 
    WHEN value_type = 'string' THEN value #>> '{}'
    WHEN value_type = 'number' THEN (value #>> '{}')::text
    WHEN value_type = 'boolean' THEN (value #>> '{}')::text
    ELSE value::text
  END AS value_text,
  CASE 
    WHEN value_type = 'number' THEN (value #>> '{}')::numeric
    ELSE NULL
  END AS value_number,
  CASE 
    WHEN value_type = 'boolean' THEN (value #>> '{}')::boolean
    ELSE NULL
  END AS value_boolean,
  value as value_json,
  value_type,
  category,
  description,
  is_public,
  updated_at
FROM app_settings
WHERE is_active = true;

COMMENT ON VIEW app_settings_typed IS 'View with typed value columns for easy querying';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'App settings table enhanced successfully with % settings', (SELECT COUNT(*) FROM app_settings WHERE is_active = true);
END $$;

