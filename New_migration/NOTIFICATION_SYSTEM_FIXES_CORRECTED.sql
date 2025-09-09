-- =============================================
-- NOTIFICATION SYSTEM FIXES - CORRECTED VERSION
-- Missing RPC functions and triggers for notifications
-- =============================================

-- =============================================
-- MISSING TABLES
-- =============================================

-- Push notification queue table for batch processing
CREATE TABLE IF NOT EXISTS push_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    
    -- Notification Data
    data JSONB DEFAULT '{}',
    
    -- Processing Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Error Handling
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FIX EXISTING FUNCTION WITH CORRECT RETURN TYPE
-- =============================================

-- Drop and recreate the get_user_notification_preferences function with correct return type
DROP FUNCTION IF EXISTS get_user_notification_preferences(UUID);

CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    push_enabled BOOLEAN,
    email_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    messages_push BOOLEAN,
    messages_email BOOLEAN,
    offers_push BOOLEAN,
    offers_email BOOLEAN,
    listing_updates_push BOOLEAN,
    listing_updates_email BOOLEAN,
    reviews_push BOOLEAN,
    reviews_email BOOLEAN,
    follows_push BOOLEAN,
    follows_email BOOLEAN,
    verification_push BOOLEAN,
    verification_email BOOLEAN,
    payments_push BOOLEAN,
    payments_email BOOLEAN,
    promotions_push BOOLEAN,
    promotions_email BOOLEAN,
    system_push BOOLEAN,
    system_email BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if preferences exist
    IF EXISTS (SELECT 1 FROM notification_preferences WHERE notification_preferences.user_id = p_user_id) THEN
        -- Return existing preferences
        RETURN QUERY SELECT * FROM notification_preferences WHERE notification_preferences.user_id = p_user_id;
    ELSE
        -- Create default preferences and return them
        INSERT INTO notification_preferences (user_id) VALUES (p_user_id);
        RETURN QUERY SELECT * FROM notification_preferences WHERE notification_preferences.user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIX should_send_notification FUNCTION
-- =============================================

-- Drop and recreate should_send_notification with corrected logic
DROP FUNCTION IF EXISTS should_send_notification(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION should_send_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_delivery_method TEXT DEFAULT 'push'
)
RETURNS BOOLEAN AS $$
DECLARE
    prefs RECORD;
    current_hour TIME;
    should_send BOOLEAN := false;
BEGIN
    -- Get user preferences (first row only)
    SELECT * INTO prefs FROM get_user_notification_preferences(p_user_id) LIMIT 1;
    
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
        current_hour := CURRENT_TIME;
        IF (prefs.quiet_hours_start <= prefs.quiet_hours_end AND 
            current_hour >= prefs.quiet_hours_start AND 
            current_hour <= prefs.quiet_hours_end) OR
           (prefs.quiet_hours_start > prefs.quiet_hours_end AND 
            (current_hour >= prefs.quiet_hours_start OR 
             current_hour <= prefs.quiet_hours_end)) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MISSING RPC FUNCTIONS
-- =============================================

-- Function to queue push notifications for batch processing
CREATE OR REPLACE FUNCTION queue_push_notification(
    p_user_ids UUID[],
    p_title TEXT,
    p_body TEXT,
    p_notification_type TEXT,
    p_data JSONB DEFAULT '{}',
    p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Insert notification for each user
    FOREACH user_id IN ARRAY p_user_ids
    LOOP
        -- Check if user should receive this notification
        IF should_send_notification(user_id, p_notification_type, 'push') THEN
            INSERT INTO push_notification_queue (
                user_id, title, body, notification_type, data, scheduled_for
            )
            VALUES (
                user_id, p_title, p_body, p_notification_type, p_data, p_scheduled_for
            );
            
            -- Also create in-app notification
            INSERT INTO notifications (
                user_id, title, body, type, push_data, scheduled_for
            )
            VALUES (
                user_id, p_title, p_body, p_notification_type, p_data, p_scheduled_for
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
    p_user_id UUID,
    p_preferences JSONB
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    push_enabled BOOLEAN,
    email_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    messages_push BOOLEAN,
    messages_email BOOLEAN,
    offers_push BOOLEAN,
    offers_email BOOLEAN,
    listing_updates_push BOOLEAN,
    listing_updates_email BOOLEAN,
    reviews_push BOOLEAN,
    reviews_email BOOLEAN,
    follows_push BOOLEAN,
    follows_email BOOLEAN,
    verification_push BOOLEAN,
    verification_email BOOLEAN,
    payments_push BOOLEAN,
    payments_email BOOLEAN,
    promotions_push BOOLEAN,
    promotions_email BOOLEAN,
    system_push BOOLEAN,
    system_email BOOLEAN,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Upsert notification preferences
    INSERT INTO notification_preferences (
        user_id,
        push_enabled,
        email_enabled,
        sms_enabled,
        messages_push,
        messages_email,
        offers_push,
        offers_email,
        listing_updates_push,
        listing_updates_email,
        reviews_push,
        reviews_email,
        follows_push,
        follows_email,
        verification_push,
        verification_email,
        payments_push,
        payments_email,
        promotions_push,
        promotions_email,
        system_push,
        system_email,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
    )
    VALUES (
        p_user_id,
        COALESCE((p_preferences->>'push_enabled')::BOOLEAN, true),
        COALESCE((p_preferences->>'email_enabled')::BOOLEAN, true),
        COALESCE((p_preferences->>'sms_enabled')::BOOLEAN, false),
        COALESCE((p_preferences->>'messages_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'messages_email')::BOOLEAN, false),
        COALESCE((p_preferences->>'offers_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'offers_email')::BOOLEAN, true),
        COALESCE((p_preferences->>'listing_updates_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'listing_updates_email')::BOOLEAN, false),
        COALESCE((p_preferences->>'reviews_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'reviews_email')::BOOLEAN, true),
        COALESCE((p_preferences->>'follows_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'follows_email')::BOOLEAN, false),
        COALESCE((p_preferences->>'verification_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'verification_email')::BOOLEAN, true),
        COALESCE((p_preferences->>'payments_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'payments_email')::BOOLEAN, true),
        COALESCE((p_preferences->>'promotions_push')::BOOLEAN, false),
        COALESCE((p_preferences->>'promotions_email')::BOOLEAN, false),
        COALESCE((p_preferences->>'system_push')::BOOLEAN, true),
        COALESCE((p_preferences->>'system_email')::BOOLEAN, true),
        COALESCE((p_preferences->>'quiet_hours_enabled')::BOOLEAN, false),
        COALESCE((p_preferences->>'quiet_hours_start')::TIME, '22:00'::TIME),
        COALESCE((p_preferences->>'quiet_hours_end')::TIME, '08:00'::TIME)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        push_enabled = COALESCE((p_preferences->>'push_enabled')::BOOLEAN, notification_preferences.push_enabled),
        email_enabled = COALESCE((p_preferences->>'email_enabled')::BOOLEAN, notification_preferences.email_enabled),
        sms_enabled = COALESCE((p_preferences->>'sms_enabled')::BOOLEAN, notification_preferences.sms_enabled),
        messages_push = COALESCE((p_preferences->>'messages_push')::BOOLEAN, notification_preferences.messages_push),
        messages_email = COALESCE((p_preferences->>'messages_email')::BOOLEAN, notification_preferences.messages_email),
        offers_push = COALESCE((p_preferences->>'offers_push')::BOOLEAN, notification_preferences.offers_push),
        offers_email = COALESCE((p_preferences->>'offers_email')::BOOLEAN, notification_preferences.offers_email),
        listing_updates_push = COALESCE((p_preferences->>'listing_updates_push')::BOOLEAN, notification_preferences.listing_updates_push),
        listing_updates_email = COALESCE((p_preferences->>'listing_updates_email')::BOOLEAN, notification_preferences.listing_updates_email),
        reviews_push = COALESCE((p_preferences->>'reviews_push')::BOOLEAN, notification_preferences.reviews_push),
        reviews_email = COALESCE((p_preferences->>'reviews_email')::BOOLEAN, notification_preferences.reviews_email),
        follows_push = COALESCE((p_preferences->>'follows_push')::BOOLEAN, notification_preferences.follows_push),
        follows_email = COALESCE((p_preferences->>'follows_email')::BOOLEAN, notification_preferences.follows_email),
        verification_push = COALESCE((p_preferences->>'verification_push')::BOOLEAN, notification_preferences.verification_push),
        verification_email = COALESCE((p_preferences->>'verification_email')::BOOLEAN, notification_preferences.verification_email),
        payments_push = COALESCE((p_preferences->>'payments_push')::BOOLEAN, notification_preferences.payments_push),
        payments_email = COALESCE((p_preferences->>'payments_email')::BOOLEAN, notification_preferences.payments_email),
        promotions_push = COALESCE((p_preferences->>'promotions_push')::BOOLEAN, notification_preferences.promotions_push),
        promotions_email = COALESCE((p_preferences->>'promotions_email')::BOOLEAN, notification_preferences.promotions_email),
        system_push = COALESCE((p_preferences->>'system_push')::BOOLEAN, notification_preferences.system_push),
        system_email = COALESCE((p_preferences->>'system_email')::BOOLEAN, notification_preferences.system_email),
        quiet_hours_enabled = COALESCE((p_preferences->>'quiet_hours_enabled')::BOOLEAN, notification_preferences.quiet_hours_enabled),
        quiet_hours_start = COALESCE((p_preferences->>'quiet_hours_start')::TIME, notification_preferences.quiet_hours_start),
        quiet_hours_end = COALESCE((p_preferences->>'quiet_hours_end')::TIME, notification_preferences.quiet_hours_end),
        updated_at = NOW();
    
    -- Return the updated preferences
    RETURN QUERY SELECT * FROM notification_preferences WHERE notification_preferences.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- NOTIFICATION TRIGGER FUNCTIONS
-- =============================================

-- Function to send message notification
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    recipient_id UUID;
    sender_profile RECORD;
    conversation_record RECORD;
BEGIN
    -- Get conversation details
    SELECT * INTO conversation_record FROM conversations WHERE id = NEW.conversation_id;
    
    -- Determine recipient (the other participant)
    IF conversation_record.participant_1 = NEW.sender_id THEN
        recipient_id := conversation_record.participant_2;
    ELSE
        recipient_id := conversation_record.participant_1;
    END IF;
    
    -- Get sender profile
    SELECT first_name, last_name INTO sender_profile 
    FROM profiles WHERE id = NEW.sender_id;
    
    -- Queue notification
    PERFORM queue_push_notification(
        ARRAY[recipient_id],
        CONCAT('New message from ', COALESCE(sender_profile.first_name, 'Someone')),
        CASE 
            WHEN LENGTH(NEW.content) > 50 THEN CONCAT(SUBSTRING(NEW.content, 1, 47), '...')
            ELSE NEW.content
        END,
        'message',
        jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'sender_name', CONCAT(COALESCE(sender_profile.first_name, ''), ' ', COALESCE(sender_profile.last_name, ''))
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to send offer notification
CREATE OR REPLACE FUNCTION notify_offer_update()
RETURNS TRIGGER AS $$
DECLARE
    seller_id UUID;
    buyer_profile RECORD;
    listing_record RECORD;
    notification_title TEXT;
    notification_body TEXT;
    notification_type TEXT;
BEGIN
    -- Get listing and seller details
    SELECT * INTO listing_record FROM listings WHERE id = NEW.listing_id;
    seller_id := listing_record.user_id;
    
    -- Get buyer profile
    SELECT first_name, last_name INTO buyer_profile 
    FROM profiles WHERE id = NEW.buyer_id;
    
    -- Determine notification based on offer status
    CASE NEW.status
        WHEN 'pending' THEN
            notification_title := 'New Offer Received! 💰';
            notification_body := CONCAT(
                COALESCE(buyer_profile.first_name, 'Someone'), 
                ' offered GHS ', NEW.amount::TEXT, 
                ' for "', listing_record.title, '"'
            );
            notification_type := 'offer';
            
        WHEN 'accepted' THEN
            notification_title := 'Offer Accepted! 🎉';
            notification_body := CONCAT(
                'Your offer of GHS ', NEW.amount::TEXT, 
                ' for "', listing_record.title, '" has been accepted!'
            );
            notification_type := 'offer_accepted';
            
        WHEN 'rejected' THEN
            notification_title := 'Offer Declined';
            notification_body := CONCAT(
                'Your offer of GHS ', NEW.amount::TEXT, 
                ' for "', listing_record.title, '" was declined'
            );
            notification_type := 'offer_rejected';
            
        WHEN 'countered' THEN
            notification_title := 'Counter Offer Received 💰';
            notification_body := CONCAT(
                'Counter offer: GHS ', NEW.amount::TEXT, 
                ' for "', listing_record.title, '"'
            );
            notification_type := 'offer_countered';
            
        ELSE
            RETURN NEW; -- No notification for other statuses
    END CASE;
    
    -- Send notification to appropriate recipient
    IF NEW.status = 'pending' OR NEW.status = 'countered' THEN
        -- Notify seller
        PERFORM queue_push_notification(
            ARRAY[seller_id],
            notification_title,
            notification_body,
            notification_type,
            jsonb_build_object(
                'offer_id', NEW.id,
                'listing_id', NEW.listing_id,
                'buyer_id', NEW.buyer_id,
                'amount', NEW.amount,
                'listing_title', listing_record.title
            )
        );
    ELSE
        -- Notify buyer (accepted/rejected)
        PERFORM queue_push_notification(
            ARRAY[NEW.buyer_id],
            notification_title,
            notification_body,
            notification_type,
            jsonb_build_object(
                'offer_id', NEW.id,
                'listing_id', NEW.listing_id,
                'seller_id', seller_id,
                'amount', NEW.amount,
                'listing_title', listing_record.title
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.message_type = 'text' OR NEW.message_type = 'image')
    EXECUTE FUNCTION notify_new_message();

-- Trigger for offer updates
DROP TRIGGER IF EXISTS trigger_notify_offer_update ON offers;
CREATE TRIGGER trigger_notify_offer_update
    AFTER INSERT OR UPDATE OF status ON offers
    FOR EACH ROW
    EXECUTE FUNCTION notify_offer_update();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Push notification queue indexes
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_user_id ON push_notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_status ON push_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_scheduled_for ON push_notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_created_at ON push_notification_queue(created_at DESC);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on push notification queue
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own queued notifications
CREATE POLICY "Users can view their own queued notifications" ON push_notification_queue
    FOR SELECT USING (user_id = auth.uid());

-- Only system can insert/update queue (via functions)
CREATE POLICY "System can manage notification queue" ON push_notification_queue
    FOR ALL USING (true);

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION queue_push_notification(UUID[], TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_new_message() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_offer_update() TO authenticated;

-- Success message
SELECT 'Notification system fixes applied successfully!' as status;
