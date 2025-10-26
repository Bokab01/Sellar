-- Create trigger to automatically queue push notifications when notifications are created

-- Function to queue push notifications
CREATE OR REPLACE FUNCTION queue_push_notification_on_notification_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue push notification if user has push enabled
    -- Check user's notification preferences
    IF EXISTS (
        SELECT 1 
        FROM notification_preferences 
        WHERE user_id = NEW.user_id 
          AND push_enabled = true
    ) THEN
        -- Insert into push notification queue
        INSERT INTO push_notification_queue (
            user_ids,
            title,
            body,
            notification_type,
            data,
            scheduled_for,
            status,
            attempts,
            max_attempts
        )
        VALUES (
            ARRAY[NEW.user_id], -- Single user as array
            NEW.title,
            NEW.body,
            NEW.type,
            NEW.data,
            NOW(), -- Send immediately
            'pending',
            0,
            3
        );
        
        RAISE NOTICE 'Queued push notification for user %', NEW.user_id;
    ELSE
        RAISE NOTICE 'Skipping push notification for user % (push disabled)', NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_queue_push_notification ON notifications;

-- Create trigger on notifications table
CREATE TRIGGER trigger_queue_push_notification
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION queue_push_notification_on_notification_insert();

-- Grant necessary permissions
GRANT INSERT ON push_notification_queue TO authenticated;
GRANT INSERT ON push_notification_queue TO service_role;

COMMENT ON TRIGGER trigger_queue_push_notification ON notifications IS 
'Automatically queues push notifications when in-app notifications are created';

