-- =============================================
-- CALLBACK REQUEST SYSTEM
-- Professional callback request feature for listings
-- =============================================

-- 1. Create callback_requests table
CREATE TABLE IF NOT EXISTS callback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    
    -- Request details
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'acknowledged', 'completed', 'cancelled', 'expired'
    )),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Contact information
    requester_phone TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    preferred_time TEXT, -- e.g., "Morning", "Afternoon", "Evening", "Anytime"
    preferred_days TEXT[], -- e.g., ["Monday", "Tuesday", "Wednesday"]
    
    -- Message and context
    message TEXT,
    callback_reason TEXT CHECK (callback_reason IN (
        'general_inquiry', 'price_negotiation', 'product_details', 
        'availability_check', 'meetup_arrangement', 'other'
    )),
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CHECK (requester_id != seller_id) -- Can't request callback from yourself
);

-- 2. Create callback_request_notifications table
CREATE TABLE IF NOT EXISTS callback_request_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    callback_request_id UUID NOT NULL REFERENCES callback_requests(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'new_request', 'request_acknowledged', 'request_completed', 
        'request_cancelled', 'request_reminder', 'request_expired'
    )),
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    
    -- Delivery channels
    push_sent BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

-- 3. Enable RLS
ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_request_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for callback_requests
CREATE POLICY "Users can view their own callback requests" ON callback_requests 
    FOR SELECT USING (requester_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "Users can create callback requests" ON callback_requests 
    FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Sellers can update their callback requests" ON callback_requests 
    FOR UPDATE USING (seller_id = auth.uid());

-- 5. Create RLS policies for callback_request_notifications
CREATE POLICY "Users can view their own callback notifications" ON callback_request_notifications 
    FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "System can manage callback notifications" ON callback_request_notifications 
    FOR ALL USING (true);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_callback_requests_requester ON callback_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_seller ON callback_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_listing ON callback_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_requests_requested_at ON callback_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_callback_requests_expires_at ON callback_requests(expires_at);

-- Note: Daily uniqueness constraint is enforced in the create_callback_request function
-- rather than using an expression index to avoid IMMUTABLE function issues

CREATE INDEX IF NOT EXISTS idx_callback_notifications_request ON callback_request_notifications(callback_request_id);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_recipient ON callback_request_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_status ON callback_request_notifications(status);
CREATE INDEX IF NOT EXISTS idx_callback_notifications_created_at ON callback_request_notifications(created_at DESC);

-- 7. Create function to create callback request
CREATE OR REPLACE FUNCTION create_callback_request(
    p_requester_id UUID,
    p_seller_id UUID,
    p_listing_id UUID,
    p_requester_phone TEXT,
    p_requester_name TEXT,
    p_message TEXT DEFAULT NULL,
    p_callback_reason TEXT DEFAULT 'general_inquiry',
    p_preferred_time TEXT DEFAULT NULL,
    p_preferred_days TEXT[] DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_listing_title TEXT;
    v_seller_name TEXT;
BEGIN
    -- Check if user already has a request for this listing today (any status)
    IF EXISTS (
        SELECT 1 FROM callback_requests 
        WHERE requester_id = p_requester_id 
        AND listing_id = p_listing_id 
        AND requested_at >= CURRENT_DATE
        AND requested_at < CURRENT_DATE + INTERVAL '1 day'
    ) THEN
        RAISE EXCEPTION 'You already have a callback request for this listing today';
    END IF;
    
    -- Get listing and seller details
    SELECT l.title, p.full_name
    INTO v_listing_title, v_seller_name
    FROM listings l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.id = p_listing_id AND p.id = p_seller_id;
    
    -- Create the callback request
    INSERT INTO callback_requests (
        requester_id, seller_id, listing_id, requester_phone, requester_name,
        message, callback_reason, preferred_time, preferred_days, priority
    ) VALUES (
        p_requester_id, p_seller_id, p_listing_id, p_requester_phone, p_requester_name,
        p_message, p_callback_reason, p_preferred_time, p_preferred_days, p_priority
    ) RETURNING id INTO v_request_id;
    
    -- Create notification for seller
    INSERT INTO callback_request_notifications (
        callback_request_id, recipient_id, notification_type, title, message
    ) VALUES (
        v_request_id, p_seller_id, 'new_request',
        'New Callback Request',
        format('%s requested a callback for "%s"', p_requester_name, v_listing_title)
    );
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to update callback request status
CREATE OR REPLACE FUNCTION update_callback_request_status(
    p_request_id UUID,
    p_new_status TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_request callback_requests%ROWTYPE;
    v_notification_type TEXT;
    v_notification_title TEXT;
    v_notification_message TEXT;
    v_recipient_id UUID;
BEGIN
    -- Get the request details
    SELECT * INTO v_request FROM callback_requests WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Callback request not found';
    END IF;
    
    -- Check permissions (only seller can update)
    IF v_request.seller_id != p_user_id THEN
        RAISE EXCEPTION 'Only the seller can update this callback request';
    END IF;
    
    -- Update the request
    UPDATE callback_requests 
    SET status = p_new_status,
        acknowledged_at = CASE WHEN p_new_status = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
        completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END
    WHERE id = p_request_id;
    
    -- Determine notification details
    CASE p_new_status
        WHEN 'acknowledged' THEN
            v_notification_type := 'request_acknowledged';
            v_notification_title := 'Callback Request Acknowledged';
            v_notification_message := 'The seller has acknowledged your callback request and will contact you soon';
            v_recipient_id := v_request.requester_id;
        WHEN 'completed' THEN
            v_notification_type := 'request_completed';
            v_notification_title := 'Callback Completed';
            v_notification_message := 'Your callback request has been completed';
            v_recipient_id := v_request.requester_id;
        WHEN 'cancelled' THEN
            v_notification_type := 'request_cancelled';
            v_notification_title := 'Callback Request Cancelled';
            v_notification_message := 'Your callback request has been cancelled';
            v_recipient_id := v_request.requester_id;
        ELSE
            -- No notification needed for other statuses
            RETURN true;
    END CASE;
    
    -- Create notification
    INSERT INTO callback_request_notifications (
        callback_request_id, recipient_id, notification_type, title, message
    ) VALUES (
        p_request_id, v_recipient_id, v_notification_type, v_notification_title, v_notification_message
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get callback requests for seller
CREATE OR REPLACE FUNCTION get_seller_callback_requests(
    p_seller_id UUID,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_requests JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', cr.id,
            'requester', json_build_object(
                'id', cr.requester_id,
                'name', cr.requester_name,
                'phone', cr.requester_phone,
                'avatar_url', rp.avatar_url
            ),
            'listing', json_build_object(
                'id', cr.listing_id,
                'title', l.title,
                'price', l.price,
                'image', CASE WHEN l.images IS NOT NULL AND array_length(l.images, 1) > 0 
                             THEN l.images[1] ELSE NULL END
            ),
            'status', cr.status,
            'priority', cr.priority,
            'message', cr.message,
            'callback_reason', cr.callback_reason,
            'preferred_time', cr.preferred_time,
            'preferred_days', cr.preferred_days,
            'requested_at', cr.requested_at,
            'acknowledged_at', cr.acknowledged_at,
            'completed_at', cr.completed_at,
            'expires_at', cr.expires_at
        )
        ORDER BY cr.requested_at DESC
    ) INTO v_requests
    FROM callback_requests cr
    JOIN profiles rp ON cr.requester_id = rp.id
    JOIN listings l ON cr.listing_id = l.id
    WHERE cr.seller_id = p_seller_id
    AND (p_status IS NULL OR cr.status = p_status)
    LIMIT p_limit OFFSET p_offset;
    
    RETURN COALESCE(v_requests, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to get callback request stats
CREATE OR REPLACE FUNCTION get_callback_request_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    -- Stats for sellers (requests they received)
    WITH seller_stats AS (
        SELECT 
            COUNT(*) as total_received,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE requested_at >= NOW() - INTERVAL '7 days') as this_week,
            COUNT(*) FILTER (WHERE requested_at >= NOW() - INTERVAL '30 days') as this_month
        FROM callback_requests
        WHERE seller_id = p_user_id
    ),
    requester_stats AS (
        SELECT 
            COUNT(*) as total_sent,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_sent,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_sent,
            COUNT(*) FILTER (WHERE requested_at >= NOW() - INTERVAL '7 days') as sent_this_week
        FROM callback_requests
        WHERE requester_id = p_user_id
    )
    SELECT json_build_object(
        'as_seller', json_build_object(
            'total_received', COALESCE(ss.total_received, 0),
            'pending', COALESCE(ss.pending, 0),
            'acknowledged', COALESCE(ss.acknowledged, 0),
            'completed', COALESCE(ss.completed, 0),
            'this_week', COALESCE(ss.this_week, 0),
            'this_month', COALESCE(ss.this_month, 0),
            'response_rate', CASE 
                WHEN COALESCE(ss.total_received, 0) > 0 
                THEN ROUND((COALESCE(ss.acknowledged, 0) + COALESCE(ss.completed, 0))::DECIMAL / ss.total_received * 100, 1)
                ELSE 0 
            END
        ),
        'as_requester', json_build_object(
            'total_sent', COALESCE(rs.total_sent, 0),
            'pending_sent', COALESCE(rs.pending_sent, 0),
            'completed_sent', COALESCE(rs.completed_sent, 0),
            'sent_this_week', COALESCE(rs.sent_this_week, 0),
            'success_rate', CASE 
                WHEN COALESCE(rs.total_sent, 0) > 0 
                THEN ROUND(COALESCE(rs.completed_sent, 0)::DECIMAL / rs.total_sent * 100, 1)
                ELSE 0 
            END
        )
    ) INTO v_stats
    FROM seller_stats ss
    FULL OUTER JOIN requester_stats rs ON true;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger to expire old requests
CREATE OR REPLACE FUNCTION expire_old_callback_requests()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-expire requests that are past their expiry date
    UPDATE callback_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs periodically (you might want to set up a cron job instead)
-- This is just for demonstration - in production, use a scheduled job
CREATE OR REPLACE FUNCTION cleanup_expired_callback_requests()
RETURNS void AS $$
BEGIN
    UPDATE callback_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    -- Optionally create notifications for expired requests
    INSERT INTO callback_request_notifications (
        callback_request_id, recipient_id, notification_type, title, message
    )
    SELECT 
        cr.id, cr.requester_id, 'request_expired',
        'Callback Request Expired',
        'Your callback request has expired. You can create a new one if still interested.'
    FROM callback_requests cr
    WHERE cr.status = 'expired'
    AND NOT EXISTS (
        SELECT 1 FROM callback_request_notifications crn 
        WHERE crn.callback_request_id = cr.id 
        AND crn.notification_type = 'request_expired'
    );
END;
$$ LANGUAGE plpgsql;

-- 12. Grant permissions
GRANT EXECUTE ON FUNCTION create_callback_request TO authenticated;
GRANT EXECUTE ON FUNCTION update_callback_request_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_seller_callback_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_callback_request_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_callback_requests TO authenticated;

-- Success message
SELECT 'Callback request system created successfully!' as status;
