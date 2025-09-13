-- =============================================
-- ENSURE COMPLETE NOTIFICATIONS TABLE
-- Migration 25: Create/update notifications table with all required columns
-- =============================================

-- Create the notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
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

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add push_data column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'push_data'
    ) THEN
        ALTER TABLE notifications ADD COLUMN push_data JSONB DEFAULT '{}';
    END IF;

    -- Add delivery_method column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'delivery_method'
    ) THEN
        ALTER TABLE notifications ADD COLUMN delivery_method TEXT DEFAULT 'push' CHECK (delivery_method IN ('push', 'email', 'sms', 'in_app'));
    END IF;

    -- Add scheduled_for column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'scheduled_for'
    ) THEN
        ALTER TABLE notifications ADD COLUMN scheduled_for TIMESTAMPTZ;
    END IF;

    -- Add sent_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN sent_at TIMESTAMPTZ;
    END IF;

    -- Add related_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'related_type'
    ) THEN
        ALTER TABLE notifications ADD COLUMN related_type TEXT CHECK (related_type IN ('listing', 'message', 'offer', 'review', 'user'));
    END IF;

    -- Add related_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'related_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN related_id UUID;
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'status'
    ) THEN
        ALTER TABLE notifications ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'cancelled'));
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can view their own notifications'
    ) THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own notifications" ON notifications
            FOR SELECT USING (user_id = auth.uid());
            
        CREATE POLICY "Users can update their own notifications" ON notifications
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

-- Create or replace the create_notification function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the mark_notification_as_read function
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id AND is_read = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the queue_push_notification function if it doesn't exist
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
        -- Create in-app notification (simplified version without preference check for now)
        INSERT INTO notifications (
            user_id, title, body, type, push_data, scheduled_for
        )
        VALUES (
            user_id, p_title, p_body, p_notification_type, p_data, p_scheduled_for
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION queue_push_notification(UUID[], TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;

-- Create trigger for updating updated_at timestamp if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_notifications_updated_at'
    ) THEN
        CREATE TRIGGER update_notifications_updated_at
            BEFORE UPDATE ON notifications
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Success message
SELECT 'Complete notifications table and functions created/updated successfully!' as status;
