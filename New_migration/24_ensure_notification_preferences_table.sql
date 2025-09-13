-- =============================================
-- ENSURE NOTIFICATION PREFERENCES TABLE EXISTS
-- Migration 24: Create notification_preferences table if missing and fix related functions
-- =============================================

-- Create the notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notification_preferences' 
        AND policyname = 'Users can manage their own notification preferences'
    ) THEN
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create or replace the get_user_notification_preferences function with proper return type
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

-- Create or replace the update_notification_preferences function
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_notification_preferences(UUID, JSONB) TO authenticated;

-- Create default notification preferences for existing users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles 
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Success message
SELECT 'Notification preferences table and functions created/updated successfully!' as status;