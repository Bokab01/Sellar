/*
  # Create reports and shares tables for community features

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references profiles)
      - `reported_user_id` (uuid, references profiles, nullable)
      - `listing_id` (uuid, references listings, nullable)
      - `post_id` (uuid, references posts, nullable)
      - `comment_id` (uuid, references comments, nullable)
      - `message_id` (uuid, references messages, nullable)
      - `reason` (text, required)
      - `description` (text, nullable)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)

    - `shares`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `post_id` (uuid, references posts)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    - Add constraints for data validation

  3. Indexes
    - Performance indexes for common queries
*/

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'inappropriate_content', 'fake_listing',
    'scam', 'violence', 'hate_speech', 'copyright', 'other'
  )),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Reports policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reports' AND policyname = 'Users can create reports'
  ) THEN
    CREATE POLICY "Users can create reports"
      ON reports
      FOR INSERT
      TO authenticated
      WITH CHECK (uid() = reporter_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reports' AND policyname = 'Users can view own reports'
  ) THEN
    CREATE POLICY "Users can view own reports"
      ON reports
      FOR SELECT
      TO authenticated
      USING (uid() = reporter_id);
  END IF;
END $$;

-- Shares policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shares' AND policyname = 'Users can manage own shares'
  ) THEN
    CREATE POLICY "Users can manage own shares"
      ON shares
      FOR ALL
      TO authenticated
      USING (uid() = user_id)
      WITH CHECK (uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shares' AND policyname = 'Anyone can view shares'
  ) THEN
    CREATE POLICY "Anyone can view shares"
      ON shares
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at);
CREATE INDEX IF NOT EXISTS shares_post_id_idx ON shares(post_id);
CREATE INDEX IF NOT EXISTS shares_user_id_idx ON shares(user_id);

-- Add constraint to ensure at least one target is specified for reports
ALTER TABLE reports ADD CONSTRAINT reports_target_check 
CHECK (
  (reported_user_id IS NOT NULL)::int + 
  (listing_id IS NOT NULL)::int + 
  (post_id IS NOT NULL)::int + 
  (comment_id IS NOT NULL)::int + 
  (message_id IS NOT NULL)::int = 1
);