/*
  Security Tables Migration
  
  This migration adds security-related tables for:
  1. Device tracking and management
  2. Security event logging
  3. User privacy settings
  4. Content moderation
  5. Rate limiting
*/

-- =============================================
-- DEVICE TRACKING TABLES
-- =============================================

-- User devices table for device fingerprinting and management
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    platform TEXT,
    user_agent TEXT,
    ip_address INET,
    location TEXT,
    is_trusted BOOLEAN DEFAULT FALSE,
    is_current BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, device_fingerprint)
);

-- Security events table for logging security-related activities
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login', 'failed_login', 'logout', 'password_change', 
        'email_change', 'profile_update', 'suspicious_activity',
        'device_change', 'mfa_enabled', 'mfa_disabled', 'account_locked'
    )),
    device_fingerprint TEXT,
    ip_address INET,
    user_agent TEXT,
    location TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PRIVACY AND SETTINGS TABLES
-- =============================================

-- Enhanced user settings with privacy controls
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Privacy Controls
    phone_visibility TEXT DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private')),
    email_visibility TEXT DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private')),
    online_status_visible BOOLEAN DEFAULT TRUE,
    last_seen_visible BOOLEAN DEFAULT TRUE,
    profile_searchable BOOLEAN DEFAULT TRUE,
    show_in_suggestions BOOLEAN DEFAULT TRUE,
    
    -- Communication Preferences
    allow_messages_from TEXT DEFAULT 'everyone' CHECK (allow_messages_from IN ('everyone', 'contacts', 'none')),
    allow_calls_from TEXT DEFAULT 'contacts' CHECK (allow_calls_from IN ('everyone', 'contacts', 'none')),
    
    -- Data Preferences
    data_processing_consent BOOLEAN DEFAULT FALSE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    analytics_consent BOOLEAN DEFAULT TRUE,
    
    -- Security Settings
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    login_notifications BOOLEAN DEFAULT TRUE,
    suspicious_activity_alerts BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CONTENT MODERATION TABLES
-- =============================================

-- Content moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('listing', 'post', 'comment', 'message', 'profile')),
    content_id UUID NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Content details
    content_text TEXT,
    content_images TEXT[],
    
    -- Moderation details
    flagged_reason TEXT[] DEFAULT '{}',
    auto_flagged BOOLEAN DEFAULT FALSE,
    manual_review_required BOOLEAN DEFAULT FALSE,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automated content flags
CREATE TABLE IF NOT EXISTS content_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    flag_type TEXT NOT NULL CHECK (flag_type IN (
        'profanity', 'spam', 'inappropriate', 'suspicious_links', 
        'personal_info', 'copyright', 'harassment', 'fake'
    )),
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    auto_generated BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RATE LIMITING TABLES
-- =============================================

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- Could be user_id, IP, device_fingerprint
    action_type TEXT NOT NULL, -- login, message, post, etc.
    attempt_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT now(),
    window_end TIMESTAMPTZ,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(identifier, action_type, window_start)
);

-- =============================================
-- BLOCKED USERS AND CONTENT
-- =============================================

-- User blocking system (enhanced from existing)
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT,
    block_type TEXT DEFAULT 'full' CHECK (block_type IN ('full', 'messages', 'calls', 'listings')),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(blocker_id, blocked_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User devices indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_seen ON user_devices(last_seen DESC);

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_device ON security_events(device_fingerprint);

-- Moderation queue indexes
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON moderation_queue(priority_level DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at ON moderation_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_content ON moderation_queue(content_type, content_id);

-- Content flags indexes
CREATE INDEX IF NOT EXISTS idx_content_flags_content ON content_flags(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_type ON content_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_content_flags_confidence ON content_flags(confidence_score DESC);

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_tracking(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_action ON rate_limit_tracking(action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_start, window_end);

-- Blocked users indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all security tables
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- User devices policies
CREATE POLICY "Users can view their own devices" ON user_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" ON user_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" ON user_devices
    FOR DELETE USING (auth.uid() = user_id);

-- Security events policies
CREATE POLICY "Users can view their own security events" ON security_events
    FOR SELECT USING (auth.uid() = user_id);

-- Privacy settings policies
CREATE POLICY "Users can view their own privacy settings" ON user_privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own privacy settings" ON user_privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own privacy settings" ON user_privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Blocked users policies
CREATE POLICY "Users can view their blocked users" ON blocked_users
    FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can manage their blocked users" ON blocked_users
    FOR ALL USING (auth.uid() = blocker_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to create default privacy settings
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_privacy_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create privacy settings when profile is created
CREATE TRIGGER create_privacy_settings_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_privacy_settings();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_user_privacy_settings_updated_at
    BEFORE UPDATE ON user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moderation_queue_updated_at
    BEFORE UPDATE ON moderation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limit_tracking_updated_at
    BEFORE UPDATE ON rate_limit_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_device_fingerprint TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO security_events (
        user_id, event_type, device_fingerprint, metadata
    ) VALUES (
        p_user_id, p_event_type, p_device_fingerprint, p_metadata
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_action_type TEXT,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
    current_attempts INTEGER;
    window_start TIMESTAMPTZ;
BEGIN
    window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Get current attempt count in the window
    SELECT COALESCE(SUM(attempt_count), 0)
    INTO current_attempts
    FROM rate_limit_tracking
    WHERE identifier = p_identifier
      AND action_type = p_action_type
      AND window_start >= window_start
      AND NOT is_blocked;
    
    -- Check if limit exceeded
    IF current_attempts >= p_max_attempts THEN
        -- Mark as blocked
        UPDATE rate_limit_tracking
        SET is_blocked = TRUE
        WHERE identifier = p_identifier
          AND action_type = p_action_type
          AND window_start >= window_start;
        
        RETURN FALSE;
    END IF;
    
    -- Record this attempt
    INSERT INTO rate_limit_tracking (
        identifier, action_type, attempt_count, window_end
    ) VALUES (
        p_identifier, p_action_type, 1, now() + (p_window_minutes || ' minutes')::INTERVAL
    )
    ON CONFLICT (identifier, action_type, window_start)
    DO UPDATE SET
        attempt_count = rate_limit_tracking.attempt_count + 1,
        updated_at = now();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-flag content
CREATE OR REPLACE FUNCTION auto_flag_content(
    p_content_type TEXT,
    p_content_id UUID,
    p_content_text TEXT,
    p_flag_types TEXT[] DEFAULT ARRAY['profanity', 'spam']
)
RETURNS INTEGER AS $$
DECLARE
    flag_count INTEGER := 0;
    flag_type TEXT;
BEGIN
    -- Simple profanity check (in production, use more sophisticated methods)
    IF 'profanity' = ANY(p_flag_types) THEN
        IF p_content_text ~* '\b(damn|hell|shit|fuck|bitch)\b' THEN
            INSERT INTO content_flags (content_type, content_id, flag_type, confidence_score)
            VALUES (p_content_type, p_content_id, 'profanity', 0.8);
            flag_count := flag_count + 1;
        END IF;
    END IF;
    
    -- Simple spam check
    IF 'spam' = ANY(p_flag_types) THEN
        IF p_content_text ~* '\b(buy now|click here|limited time|free money)\b' THEN
            INSERT INTO content_flags (content_type, content_id, flag_type, confidence_score)
            VALUES (p_content_type, p_content_id, 'spam', 0.7);
            flag_count := flag_count + 1;
        END IF;
    END IF;
    
    -- If content was flagged, add to moderation queue
    IF flag_count > 0 THEN
        INSERT INTO moderation_queue (
            content_type, content_id, content_text, auto_flagged, manual_review_required
        ) VALUES (
            p_content_type, p_content_id, p_content_text, TRUE, TRUE
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN flag_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
