-- Enable push notifications for all users (for testing)
UPDATE notification_preferences 
SET push_enabled = true,
    messages_enabled = true,
    instant_notifications = true
WHERE push_enabled = false OR push_enabled IS NULL;

-- Check results
SELECT 
    user_id,
    push_enabled,
    messages_enabled,
    instant_notifications
FROM notification_preferences;

