/*
  # Notifications, Settings and Moderation System

  1. New Tables
    - `notifications` - Push and in-app notifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `type` (text, notification category)
      - `title`, `body` (text, notification content)
      - `data` (jsonb, additional notification data)
      - `is_read` (boolean, read status)
      - `created_at` (timestamp)

    - `user_settings` - User preferences and privacy settings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `push_notifications`, `email_notifications` (boolean toggles)
      - `phone_visibility` (text, enum: public, contacts, private)
      - `online_status_visibility` (boolean)
      - `theme_preference` (text, enum: light, dark, system)
      - `language` (text, default: 'en')
      - `currency` (text, default: 'GHS')
      - `created_at`, `updated_at` (timestamps)

    - `blocked_users` - User blocking system
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, references profiles)
      - `blocked_id` (uuid, references profiles)
      - `reason` (text, optional blocking reason)
      - `created_at` (timestamp)

    - `reports` - Content reporting and moderation
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references profiles)
      - `reported_user_id` (uuid, optional references profiles)
      - `listing_id`, `post_id`, `comment_id`, `message_id` (uuid, content references)
      - `reason` (text, report category)
      - `description` (text, optional details)
      - `status` (text, enum: pending, reviewed, resolved, dismissed)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can manage their own notifications and settings
    - Users can manage their own blocked list
    - Users can create reports for content moderation
    - Automatic user settings creation on profile creation

  3. Functions
    - `create_notification()` - Helper function for creating notifications
    - Automatic settings creation trigger
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('message', 'offer', 'like', 'comment', 'follow', 'review', 'listing', 'system')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  CHECK (blocker_id != blocked_id),
  UNIQUE(blocker_id, blocked_id)
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  comment_id uuid REFERENCES comments(id) ON DELETE SET NULL,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

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

-- Reports policies
CREATE POLICY "Users can view own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Create notification helper function
CREATE OR REPLACE FUNCTION create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_body text,
  notification_data jsonb DEFAULT '{}'
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

-- Create triggers
CREATE OR REPLACE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();