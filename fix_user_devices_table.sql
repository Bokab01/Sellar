-- =============================================
-- FIX: Create missing user_devices table for SecurityService
-- This table is separate from device_tokens and used for security tracking
-- =============================================

-- Create user_devices table for security tracking
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Device Identification
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'desktop')),
    
    -- Device Information
    device_model TEXT,
    os_version TEXT,
    browser_info TEXT,
    app_version TEXT,
    
    -- Security Information
    is_trusted BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    location_info JSONB DEFAULT '{}',
    
    -- Risk Assessment
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    suspicious_activity_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    blocked_at TIMESTAMPTZ,
    blocked_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, device_fingerprint)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_devices_is_trusted ON user_devices(is_trusted);

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own devices" ON user_devices
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices" ON user_devices
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices" ON user_devices
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own devices" ON user_devices
    FOR DELETE USING (user_id = auth.uid());

-- Create function to get user devices (referenced in SecurityService)
CREATE OR REPLACE FUNCTION get_user_devices(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    device_fingerprint TEXT,
    device_name TEXT,
    platform TEXT,
    device_model TEXT,
    os_version TEXT,
    browser_info TEXT,
    app_version TEXT,
    is_trusted BOOLEAN,
    last_seen TIMESTAMPTZ,
    ip_address INET,
    location_info JSONB,
    risk_score INTEGER,
    suspicious_activity_count INTEGER,
    is_active BOOLEAN,
    blocked_at TIMESTAMPTZ,
    blocked_reason TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ud.id,
        ud.user_id,
        ud.device_fingerprint,
        ud.device_name,
        ud.platform,
        ud.device_model,
        ud.os_version,
        ud.browser_info,
        ud.app_version,
        ud.is_trusted,
        ud.last_seen,
        ud.ip_address,
        ud.location_info,
        ud.risk_score,
        ud.suspicious_activity_count,
        ud.is_active,
        ud.blocked_at,
        ud.blocked_reason,
        ud.created_at,
        ud.updated_at
    FROM user_devices ud
    WHERE ud.user_id = p_user_id
    AND ud.is_active = true
    ORDER BY ud.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_devices(UUID) TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_devices_updated_at
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_user_devices_updated_at();
