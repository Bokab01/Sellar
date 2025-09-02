/*
  # Notifications and User Settings

  1. New Tables
    - `notifications` - Push notifications and in-app notifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `type` (text: message, offer, like, comment, follow, system)
      - `title` (text)
      - `body` (text)
      - `data` (jsonb, additional data)
      - `is_read` (boolean)
      - `created_at` (timestamptz)

    - `user_settings` - User preferences and settings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `push_notifications` (boolean)
      - `email_notifications` (boolean)
      - `phone_visibility` (text: public, contacts, private)
      - `online_status_visibility` (boolean)
      - `theme_preference` (text: light, dark, system)
      - `language` (text)
      - `currency` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `blocked_users` - User blocking system
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, references profiles)
      - `blocked_id` (uuid, references profiles)
      - `reason` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own notifications and settings
    - Blocked users cannot interact with each other
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('message', 'offer', 'like', 'comment', 'follow', 'review', 'listing', 'system')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  push_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  phone_visibility text DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private')),
  online_status_visibility boolean DEFAULT true,
  theme_preference text DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  currency text DEFAULT 'GHS',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Blocked users policies
CREATE POLICY "Users can view own blocked list"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can manage own blocked list"
  ON blocked_users
  FOR ALL
  TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- Add updated_at trigger for user_settings
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default user settings
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default settings for new users
CREATE TRIGGER create_user_settings_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_user_settings();

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (target_user_id, notification_type, notification_title, notification_body, notification_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;