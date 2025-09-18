-- =============================================
-- FIX NOTIFICATION DELETE POLICY
-- =============================================
-- This script adds the missing DELETE policy for notifications table

-- Add missing DELETE policy for notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Notification delete policy added successfully!';
END $$;
