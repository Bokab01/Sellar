-- =============================================
-- FIX SECURITY EVENTS TABLE
-- Handles existing policies and creates missing components
-- =============================================

-- 1. Create the check_email_exists function (if not exists)
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = LOWER(TRIM(email_to_check))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for check_email_exists function
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;

-- 2. Create the security_events table (if not exists)
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Event Information
    event_type TEXT NOT NULL CHECK (event_type IN (
        'signup_attempt', 'login_attempt', 'login', 'failed_login', 'logout',
        'password_reset', 'password_change', 'email_verification', 'email_change',
        'profile_update', 'suspicious_activity', 'rate_limit_exceeded',
        'account_lockout', 'account_locked', 'device_change',
        'mfa_enabled', 'mfa_disabled', 'input_threat'
    )),
    
    -- Context Information
    email TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    
    -- Event Details
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on security_events table (if not already enabled)
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own security events" ON security_events;
DROP POLICY IF EXISTS "System can insert security events" ON security_events;
DROP POLICY IF EXISTS "security_events_insert_policy" ON security_events;
DROP POLICY IF EXISTS "security_events_select_policy" ON security_events;
DROP POLICY IF EXISTS "security_events_update_policy" ON security_events;

-- 5. Create RLS policies for security_events
CREATE POLICY "Users can view their own security events" ON security_events 
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert security events" ON security_events 
    FOR INSERT WITH CHECK (true);

-- 6. Create indexes for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events(ip_address);

-- 7. Grant necessary permissions
GRANT INSERT ON security_events TO anon;
GRANT INSERT ON security_events TO authenticated;
GRANT ALL ON security_events TO service_role;

-- Success message
SELECT 'Security events table and policies created/updated successfully!' as status;
