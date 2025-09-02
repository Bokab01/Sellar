/*
  Security Tables RLS Policies
  
  This migration adds Row Level Security policies for the security tables
  that were missing from the previous migration.
*/

-- =============================================
-- ENABLE RLS ON SECURITY TABLES
-- =============================================

-- Enable RLS on user_devices table
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Enable RLS on security_events table  
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_privacy_settings table
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on blocked_users table
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on content_flags table
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;

-- Enable RLS on moderation_queue table
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

-- Enable RLS on rate_limit_tracking table
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER DEVICES POLICIES
-- =============================================

-- Users can view their own devices
CREATE POLICY "Users can view own devices" ON user_devices
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own devices
CREATE POLICY "Users can insert own devices" ON user_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own devices
CREATE POLICY "Users can update own devices" ON user_devices
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own devices
CREATE POLICY "Users can delete own devices" ON user_devices
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SECURITY EVENTS POLICIES
-- =============================================

-- Users can view their own security events
CREATE POLICY "Users can view own security events" ON security_events
    FOR SELECT USING (auth.uid() = user_id);

-- Allow inserting security events for any user (for system logging)
-- But only authenticated users can insert
CREATE POLICY "Authenticated users can insert security events" ON security_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- No updates or deletes allowed on security events (audit trail)
-- Only service role can delete for cleanup
CREATE POLICY "No updates on security events" ON security_events
    FOR UPDATE USING (false);

CREATE POLICY "Service role can delete security events" ON security_events
    FOR DELETE USING (auth.role() = 'service_role');

-- =============================================
-- USER PRIVACY SETTINGS POLICIES
-- =============================================

-- Users can view their own privacy settings
CREATE POLICY "Users can view own privacy settings" ON user_privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own privacy settings
CREATE POLICY "Users can insert own privacy settings" ON user_privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update own privacy settings" ON user_privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own privacy settings
CREATE POLICY "Users can delete own privacy settings" ON user_privacy_settings
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- BLOCKED USERS POLICIES
-- =============================================

-- Users can view their own blocked users
CREATE POLICY "Users can view own blocked users" ON blocked_users
    FOR SELECT USING (auth.uid() = blocker_id);

-- Users can insert their own blocks
CREATE POLICY "Users can insert own blocks" ON blocked_users
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can delete their own blocks
CREATE POLICY "Users can delete own blocks" ON blocked_users
    FOR DELETE USING (auth.uid() = blocker_id);

-- =============================================
-- CONTENT FLAGS POLICIES
-- =============================================

-- Users can view flags on their own content
CREATE POLICY "Users can view flags on own content" ON content_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid()
        )
    );

-- System can insert content flags
CREATE POLICY "System can insert content flags" ON content_flags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update content flags (no role system)
CREATE POLICY "Authenticated users can update content flags" ON content_flags
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =============================================
-- MODERATION QUEUE POLICIES
-- =============================================

-- Authenticated users can view moderation queue (no role system)
CREATE POLICY "Authenticated users can view moderation queue" ON moderation_queue
    FOR SELECT USING (auth.role() = 'authenticated');

-- System can insert into moderation queue
CREATE POLICY "System can insert moderation queue" ON moderation_queue
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update moderation queue (no role system)
CREATE POLICY "Authenticated users can update moderation queue" ON moderation_queue
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =============================================
-- RATE LIMIT TRACKING POLICIES
-- =============================================

-- System can manage rate limiting (no user access needed)
CREATE POLICY "System can manage rate limits" ON rate_limit_tracking
    FOR ALL USING (auth.role() IN ('authenticated', 'service_role'));



-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Ensure authenticated users have access to these tables
GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated;
GRANT SELECT, INSERT ON security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_privacy_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON blocked_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON content_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE ON moderation_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_tracking TO authenticated;
