-- Fix notifications table body column constraint
-- The body column should be nullable to prevent comment submission errors

-- First, let's check the current constraint
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' AND column_name = 'body';

-- Make the body column nullable
ALTER TABLE notifications ALTER COLUMN body DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN notifications.body IS 'Notification body text - nullable to support system notifications that may not have a body';

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' AND column_name = 'body';
