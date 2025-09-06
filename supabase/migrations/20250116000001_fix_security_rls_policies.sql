/*
  Fix Security RLS Policies
  
  This migration adds missing INSERT policies for security tables
  that were preventing the SecurityService from working properly.
*/

-- =============================================
-- FIX MISSING INSERT POLICIES
-- =============================================

-- User devices INSERT policy (missing from original migration)
CREATE POLICY "Users can insert their own devices" ON user_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Security events INSERT policy (missing from original migration)  
CREATE POLICY "Users can insert their own security events" ON security_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ADD SERVICE ROLE POLICIES FOR SYSTEM OPERATIONS
-- =============================================

-- Allow service role to insert security events for any user (for system logging)
CREATE POLICY "Service role can insert security events" ON security_events
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Allow service role to manage devices for any user (for system operations)
CREATE POLICY "Service role can manage devices" ON user_devices
    FOR ALL WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- IMPROVE EXISTING POLICIES
-- =============================================

-- Note: ON CONFLICT logic will be handled in the upsert function below

-- =============================================
-- GRANT ADDITIONAL PERMISSIONS
-- =============================================

-- Ensure authenticated users can execute security functions
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION auto_flag_content TO authenticated;

-- =============================================
-- CREATE HELPER FUNCTIONS FOR SECURITY SERVICE
-- =============================================

-- Function to safely upsert device information
CREATE OR REPLACE FUNCTION upsert_user_device(
    p_user_id UUID,
    p_device_fingerprint TEXT,
    p_device_name TEXT DEFAULT NULL,
    p_platform TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_is_current BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    device_id UUID;
BEGIN
    -- First, mark all other devices as not current for this user
    IF p_is_current THEN
        UPDATE user_devices 
        SET is_current = FALSE 
        WHERE user_id = p_user_id AND device_fingerprint != p_device_fingerprint;
    END IF;
    
    -- Upsert the device record
    INSERT INTO user_devices (
        user_id, device_fingerprint, device_name, platform, 
        user_agent, ip_address, location, is_current, last_seen
    ) VALUES (
        p_user_id, p_device_fingerprint, p_device_name, p_platform,
        p_user_agent, p_ip_address, p_location, p_is_current, now()
    )
    ON CONFLICT (user_id, device_fingerprint)
    DO UPDATE SET
        device_name = COALESCE(EXCLUDED.device_name, user_devices.device_name),
        platform = COALESCE(EXCLUDED.platform, user_devices.platform),
        user_agent = COALESCE(EXCLUDED.user_agent, user_devices.user_agent),
        ip_address = COALESCE(EXCLUDED.ip_address, user_devices.ip_address),
        location = COALESCE(EXCLUDED.location, user_devices.location),
        is_current = EXCLUDED.is_current,
        last_seen = now()
    RETURNING id INTO device_id;
    
    RETURN device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user devices with proper security context
CREATE OR REPLACE FUNCTION get_user_devices(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    device_fingerprint TEXT,
    device_name TEXT,
    platform TEXT,
    user_agent TEXT,
    ip_address INET,
    location TEXT,
    is_trusted BOOLEAN,
    is_current BOOLEAN,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Use current user if no user_id provided
    IF p_user_id IS NULL THEN
        p_user_id := auth.uid();
    END IF;
    
    -- Ensure user can only access their own devices
    IF p_user_id != auth.uid() AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Cannot access other users devices';
    END IF;
    
    RETURN QUERY
    SELECT 
        ud.id, ud.user_id, ud.device_fingerprint, ud.device_name, ud.platform,
        ud.user_agent, ud.ip_address, ud.location, ud.is_trusted, ud.is_current,
        ud.last_seen, ud.created_at
    FROM user_devices ud
    WHERE ud.user_id = p_user_id
    ORDER BY ud.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION upsert_user_device TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_devices TO authenticated;
