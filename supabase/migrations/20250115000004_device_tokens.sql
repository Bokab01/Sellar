-- =============================================
-- DEVICE TOKENS TABLE (Push Notification Tokens)
-- =============================================

CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Token Information
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    
    -- Device Information
    device_name TEXT,
    device_model TEXT,
    app_version TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint to prevent duplicate tokens per user
    UNIQUE(user_id, token)
);

-- Add indexes for device_tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_tokens_platform ON device_tokens(platform);

-- Add RLS policies for device_tokens
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own device tokens
CREATE POLICY "Users can view own device tokens" ON device_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens" ON device_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens" ON device_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own device tokens" ON device_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PUSH NOTIFICATION QUEUE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS push_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target Information
    user_ids UUID[] NOT NULL,
    
    -- Notification Content
    title TEXT NOT NULL CHECK (char_length(title) <= 100),
    body TEXT NOT NULL CHECK (char_length(body) <= 500),
    notification_type TEXT NOT NULL,
    
    -- Additional Data
    data JSONB DEFAULT '{}'::jsonb,
    
    -- Delivery Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Error Information
    error_message TEXT,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for push_notification_queue
CREATE INDEX IF NOT EXISTS idx_push_queue_status ON push_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_push_queue_scheduled ON push_notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_queue_created_at ON push_notification_queue(created_at DESC);

-- Add RLS policies for push_notification_queue (admin only)
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view their own queued notifications
CREATE POLICY "Users can view own queued notifications" ON push_notification_queue
    FOR SELECT USING (auth.uid() = ANY(user_ids));

-- =============================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Push Notification Preferences
    push_enabled BOOLEAN DEFAULT TRUE,
    
    -- Category Preferences
    messages_enabled BOOLEAN DEFAULT TRUE,
    offers_enabled BOOLEAN DEFAULT TRUE,
    community_enabled BOOLEAN DEFAULT TRUE,
    system_enabled BOOLEAN DEFAULT TRUE,
    
    -- Quiet Hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_start_time TIME DEFAULT '22:00:00',
    quiet_end_time TIME DEFAULT '08:00:00',
    
    -- Frequency Settings
    instant_notifications BOOLEAN DEFAULT TRUE,
    daily_digest BOOLEAN DEFAULT FALSE,
    weekly_summary BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);

-- Add RLS policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own notification preferences
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS FOR PUSH NOTIFICATIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_device_tokens_updated_at 
    BEFORE UPDATE ON device_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_queue_updated_at 
    BEFORE UPDATE ON push_notification_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RPC FUNCTIONS FOR PUSH NOTIFICATIONS
-- =============================================

-- Function to queue push notification
CREATE OR REPLACE FUNCTION queue_push_notification(
    p_user_ids UUID[],
    p_title TEXT,
    p_body TEXT,
    p_notification_type TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_scheduled_for TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO push_notification_queue (
        user_ids,
        title,
        body,
        notification_type,
        data,
        scheduled_for
    ) VALUES (
        p_user_ids,
        p_title,
        p_body,
        p_notification_type,
        p_data,
        p_scheduled_for
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS notification_preferences AS $$
DECLARE
    prefs notification_preferences;
BEGIN
    SELECT * INTO prefs 
    FROM notification_preferences 
    WHERE user_id = p_user_id;
    
    -- Create default preferences if none exist
    IF NOT FOUND THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (p_user_id)
        RETURNING * INTO prefs;
    END IF;
    
    RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
    p_user_id UUID,
    p_preferences JSONB
)
RETURNS notification_preferences AS $$
DECLARE
    updated_prefs notification_preferences;
BEGIN
    -- Upsert notification preferences
    INSERT INTO notification_preferences (
        user_id,
        push_enabled,
        messages_enabled,
        offers_enabled,
        community_enabled,
        system_enabled,
        quiet_hours_enabled,
        quiet_start_time,
        quiet_end_time,
        instant_notifications,
        daily_digest,
        weekly_summary
    ) VALUES (
        p_user_id,
        COALESCE((p_preferences->>'push_enabled')::BOOLEAN, TRUE),
        COALESCE((p_preferences->>'messages_enabled')::BOOLEAN, TRUE),
        COALESCE((p_preferences->>'offers_enabled')::BOOLEAN, TRUE),
        COALESCE((p_preferences->>'community_enabled')::BOOLEAN, TRUE),
        COALESCE((p_preferences->>'system_enabled')::BOOLEAN, TRUE),
        COALESCE((p_preferences->>'quiet_hours_enabled')::BOOLEAN, FALSE),
        COALESCE((p_preferences->>'quiet_start_time')::TIME, '22:00:00'),
        COALESCE((p_preferences->>'quiet_end_time')::TIME, '08:00:00'),
        COALESCE((p_preferences->>'instant_notifications')::BOOLEAN, TRUE),
        COALESCE((p_preferences->>'daily_digest')::BOOLEAN, FALSE),
        COALESCE((p_preferences->>'weekly_summary')::BOOLEAN, FALSE)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        push_enabled = EXCLUDED.push_enabled,
        messages_enabled = EXCLUDED.messages_enabled,
        offers_enabled = EXCLUDED.offers_enabled,
        community_enabled = EXCLUDED.community_enabled,
        system_enabled = EXCLUDED.system_enabled,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_start_time = EXCLUDED.quiet_start_time,
        quiet_end_time = EXCLUDED.quiet_end_time,
        instant_notifications = EXCLUDED.instant_notifications,
        daily_digest = EXCLUDED.daily_digest,
        weekly_summary = EXCLUDED.weekly_summary,
        updated_at = now()
    RETURNING * INTO updated_prefs;
    
    RETURN updated_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
