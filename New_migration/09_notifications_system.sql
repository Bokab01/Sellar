-- =============================================
-- SELLAR MOBILE APP - NOTIFICATIONS SYSTEM
-- Migration 09: Push notifications and device tokens
-- =============================================

-- =============================================
-- DEVICE TOKENS TABLE
-- =============================================

CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Token Information
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    
    -- Device Information
    device_id TEXT,
    device_name TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(token)
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    
    -- Notification Type
    type TEXT NOT NULL CHECK (type IN (
        'message', 'offer', 'listing_update', 'review', 'follow',
        'verification', 'payment', 'promotion', 'system', 'reminder'
    )),
    
    -- Related Content
    related_type TEXT CHECK (related_type IN ('listing', 'message', 'offer', 'review', 'user')),
    related_id UUID,
    
    -- Delivery Information
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled')),
    delivery_method TEXT DEFAULT 'push' CHECK (delivery_method IN ('push', 'email', 'sms', 'in_app')),
    
    -- Push Notification Data
    push_data JSONB DEFAULT '{}',
    
    -- Read Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Global Settings
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    
    -- Notification Type Preferences
    messages_push BOOLEAN DEFAULT true,
    messages_email BOOLEAN DEFAULT false,
    
    offers_push BOOLEAN DEFAULT true,
    offers_email BOOLEAN DEFAULT true,
    
    listing_updates_push BOOLEAN DEFAULT true,
    listing_updates_email BOOLEAN DEFAULT false,
    
    reviews_push BOOLEAN DEFAULT true,
    reviews_email BOOLEAN DEFAULT true,
    
    follows_push BOOLEAN DEFAULT true,
    follows_email BOOLEAN DEFAULT false,
    
    verification_push BOOLEAN DEFAULT true,
    verification_email BOOLEAN DEFAULT true,
    
    payments_push BOOLEAN DEFAULT true,
    payments_email BOOLEAN DEFAULT true,
    
    promotions_push BOOLEAN DEFAULT false,
    promotions_email BOOLEAN DEFAULT false,
    
    system_push BOOLEAN DEFAULT true,
    system_email BOOLEAN DEFAULT true,
    
    -- Quiet Hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Device tokens indexes
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
CREATE INDEX idx_device_tokens_platform ON device_tokens(platform);
CREATE INDEX idx_device_tokens_is_active ON device_tokens(is_active);
CREATE INDEX idx_device_tokens_last_used_at ON device_tokens(last_used_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_related ON notifications(related_type, related_id);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Notification preferences indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on device_tokens
CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on notifications
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- NOTIFICATION FUNCTIONS
-- =============================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_type TEXT,
    p_related_type TEXT DEFAULT NULL,
    p_related_id UUID DEFAULT NULL,
    p_push_data JSONB DEFAULT '{}',
    p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, title, body, type, related_type, related_id, 
        push_data, scheduled_for
    )
    VALUES (
        p_user_id, p_title, p_body, p_type, p_related_type, p_related_id,
        p_push_data, COALESCE(p_scheduled_for, NOW())
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS notification_preferences AS $$
DECLARE
    prefs notification_preferences;
BEGIN
    SELECT * INTO prefs FROM notification_preferences WHERE user_id = p_user_id;
    
    -- If no preferences exist, create default ones
    IF prefs IS NULL THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (p_user_id)
        RETURNING * INTO prefs;
    END IF;
    
    RETURN prefs;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user should receive notification
CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_delivery_method TEXT DEFAULT 'push'
)
RETURNS BOOLEAN AS $$
DECLARE
    prefs notification_preferences;
    current_time TIME;
    should_send BOOLEAN := false;
BEGIN
    -- Get user preferences
    prefs := get_user_notification_preferences(p_user_id);
    
    -- Check global settings
    IF p_delivery_method = 'push' AND NOT prefs.push_enabled THEN
        RETURN false;
    ELSIF p_delivery_method = 'email' AND NOT prefs.email_enabled THEN
        RETURN false;
    ELSIF p_delivery_method = 'sms' AND NOT prefs.sms_enabled THEN
        RETURN false;
    END IF;
    
    -- Check quiet hours
    IF prefs.quiet_hours_enabled AND p_delivery_method = 'push' THEN
        current_time := CURRENT_TIME;
        IF (prefs.quiet_hours_start <= prefs.quiet_hours_end AND 
            current_time >= prefs.quiet_hours_start AND 
            current_time <= prefs.quiet_hours_end) OR
           (prefs.quiet_hours_start > prefs.quiet_hours_end AND 
            (current_time >= prefs.quiet_hours_start OR 
             current_time <= prefs.quiet_hours_end)) THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Check type-specific preferences
    should_send := CASE p_notification_type
        WHEN 'message' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.messages_push
                WHEN 'email' THEN prefs.messages_email
                ELSE true
            END
        WHEN 'offer' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.offers_push
                WHEN 'email' THEN prefs.offers_email
                ELSE true
            END
        WHEN 'listing_update' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.listing_updates_push
                WHEN 'email' THEN prefs.listing_updates_email
                ELSE true
            END
        WHEN 'review' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.reviews_push
                WHEN 'email' THEN prefs.reviews_email
                ELSE true
            END
        WHEN 'follow' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.follows_push
                WHEN 'email' THEN prefs.follows_email
                ELSE true
            END
        WHEN 'verification' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.verification_push
                WHEN 'email' THEN prefs.verification_email
                ELSE true
            END
        WHEN 'payment' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.payments_push
                WHEN 'email' THEN prefs.payments_email
                ELSE true
            END
        WHEN 'promotion' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.promotions_push
                WHEN 'email' THEN prefs.promotions_email
                ELSE true
            END
        WHEN 'system' THEN 
            CASE p_delivery_method 
                WHEN 'push' THEN prefs.system_push
                WHEN 'email' THEN prefs.system_email
                ELSE true
            END
        ELSE true
    END;
    
    RETURN should_send;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id AND is_read = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Notifications system tables created successfully!' as status;
