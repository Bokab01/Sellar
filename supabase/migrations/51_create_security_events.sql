-- =============================================
-- SECURITY EVENTS TABLE & RLS POLICIES
-- =============================================
-- This migration creates the security_events table for logging
-- authentication and security-related events

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login', 
        'failed_login', 
        'password_change', 
        'suspicious_activity', 
        'device_change', 
        'logout'
    )),
    device_fingerprint TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    location TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_device ON security_events(device_fingerprint);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their own security events
CREATE POLICY "Users can insert their own security events"
ON security_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own security events
CREATE POLICY "Users can view their own security events"
ON security_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage all security events"
ON security_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE security_events IS 
'Logs security-related events such as logins, failed attempts, and suspicious activity';

COMMENT ON COLUMN security_events.event_type IS 
'Type of security event: login, failed_login, password_change, suspicious_activity, device_change, logout';

COMMENT ON COLUMN security_events.device_fingerprint IS 
'Unique device identifier for tracking which device initiated the event';

COMMENT ON COLUMN security_events.metadata IS 
'Additional context about the event (JSON format)';

