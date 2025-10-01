-- =============================================
-- FINAL MODERATION NOTIFICATIONS
-- =============================================
-- This migration creates both functions and integrates them
-- to avoid dependency issues

-- First, ensure send_moderation_notification function exists
CREATE OR REPLACE FUNCTION send_moderation_notification(
    p_listing_id UUID,
    p_action_type VARCHAR(50),
    p_reason_text VARCHAR(100),
    p_category_name VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_listing_title TEXT;
    v_user_id UUID;
    v_notification_title TEXT;
    v_notification_body TEXT;
BEGIN
    -- Get listing details
    SELECT title, user_id INTO v_listing_title, v_user_id
    FROM listings 
    WHERE id = p_listing_id;
    
    -- Return false if listing not found
    IF v_listing_title IS NULL THEN
        RETURN false;
    END IF;
    
    -- Create specific notification based on action and reason
    CASE p_action_type
        WHEN 'hide' THEN
            v_notification_title := 'Listing Hidden Due to Report ⚠️';
            v_notification_body := 'Your listing "' || v_listing_title || '" has been hidden due to a community report. Reason: ' || p_reason_text || '. Please review our community guidelines and contact support if you believe this was an error.';
        WHEN 'suspend' THEN
            v_notification_title := 'Listing Suspended ⚠️';
            v_notification_body := 'Your listing "' || v_listing_title || '" has been suspended due to policy violations. Reason: ' || p_reason_text || '. Please review our terms of service.';
        WHEN 'restore' THEN
            v_notification_title := 'Listing Restored ✅';
            v_notification_body := 'Your listing "' || v_listing_title || '" has been restored and is now visible again.';
        ELSE
            v_notification_title := 'Listing Status Changed ⚠️';
            v_notification_body := 'Your listing "' || v_listing_title || '" status has been changed. Reason: ' || p_reason_text || '.';
    END CASE;
    
    -- Insert the notification
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        v_user_id,
        'listing',
        v_notification_title,
        v_notification_body,
        jsonb_build_object(
            'listing_id', p_listing_id,
            'listing_title', v_listing_title,
            'action', p_action_type,
            'reason', p_reason_text,
            'category', p_category_name,
            'created_at', NOW(),
            'is_moderation_action', true
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Second, create/update handle_automatic_moderation function
CREATE OR REPLACE FUNCTION handle_automatic_moderation(
    p_report_id UUID,
    p_action VARCHAR(50),
    p_target_type VARCHAR(20),
    p_target_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_reported_user_id UUID;
    v_report_reason VARCHAR(100);
    v_report_category VARCHAR(50);
    v_notification_sent BOOLEAN := false;
BEGIN
    -- Get reported user ID and report details
    SELECT reported_user_id, reason, category 
    INTO v_reported_user_id, v_report_reason, v_report_category
    FROM reports 
    WHERE id = p_report_id;

    -- Apply automatic action
    CASE p_action
        WHEN 'hide' THEN
            CASE p_target_type
                WHEN 'listing' THEN
                    UPDATE listings SET status = 'hidden' WHERE id = p_target_id;
                    -- Send specific notification for listing hiding
                    SELECT send_moderation_notification(p_target_id, 'hide', v_report_reason, v_report_category) INTO v_notification_sent;
                WHEN 'post' THEN
                    UPDATE posts SET status = 'hidden' WHERE id = p_target_id;
                WHEN 'comment' THEN
                    UPDATE comments SET status = 'hidden' WHERE id = p_target_id;
            END CASE;
        WHEN 'suspend' THEN
            UPDATE user_reputation 
            SET status = 'suspended', updated_at = NOW() 
            WHERE user_id = v_reported_user_id;
            -- Send notification for user suspension
            IF p_target_type = 'listing' THEN
                SELECT send_moderation_notification(p_target_id, 'suspend', v_report_reason, v_report_category) INTO v_notification_sent;
            END IF;
        WHEN 'ban' THEN
            UPDATE user_reputation 
            SET status = 'banned', updated_at = NOW() 
            WHERE user_id = v_reported_user_id;
    END CASE;

    -- Record the action
    INSERT INTO moderation_actions (
        report_id,
        moderator_id,
        action_type,
        target_type,
        target_id,
        reason
    ) VALUES (
        p_report_id,
        NULL, -- System action
        p_action,
        p_target_type,
        p_target_id,
        'Automatic action based on report category: ' || v_report_reason
    );

    -- Update report status
    UPDATE reports 
    SET 
        status = 'resolved',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_report_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments explaining the functions
COMMENT ON FUNCTION send_moderation_notification(UUID, VARCHAR(50), VARCHAR(100), VARCHAR(50)) IS 'Creates detailed notifications for moderation actions with specific reasons and categories - fixed ambiguous column reference';
COMMENT ON FUNCTION handle_automatic_moderation(UUID, VARCHAR(50), VARCHAR(20), UUID) IS 'Enhanced automatic moderation with detailed notifications for listing owners';

-- Verify both functions exist and are working
SELECT 'send_moderation_notification function exists: ' || (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'send_moderation_notification')) as status;
SELECT 'handle_automatic_moderation function exists: ' || (SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'handle_automatic_moderation')) as status;
SELECT 'Final moderation notification system applied successfully' as status;
