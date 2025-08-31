/*
  # Add Reports and Shares Tables

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
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add constraints for reports
ALTER TABLE reports ADD CONSTRAINT IF NOT EXISTS reports_status_check 
  CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'));

ALTER TABLE reports ADD CONSTRAINT IF NOT EXISTS reports_reason_check 
  CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'fake_listing', 'scam', 'violence', 'hate_speech', 'copyright', 'other'));

-- Ensure at least one target is specified for reports
ALTER TABLE reports ADD CONSTRAINT IF NOT EXISTS reports_target_check 
  CHECK (
    (reported_user_id IS NOT NULL) OR 
    (listing_id IS NOT NULL) OR 
    (post_id IS NOT NULL) OR 
    (comment_id IS NOT NULL) OR 
    (message_id IS NOT NULL)
  );

-- Add unique constraint for shares to prevent duplicate shares
ALTER TABLE shares ADD CONSTRAINT IF NOT EXISTS shares_user_post_unique 
  UNIQUE (user_id, post_id);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY IF NOT EXISTS "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY IF NOT EXISTS "Users can view own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- RLS Policies for shares
CREATE POLICY IF NOT EXISTS "Users can create shares"
  ON shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view all shares"
  ON shares
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can delete own shares"
  ON shares
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Performance indexes for reports
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS reports_reported_user_id_idx ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS reports_listing_id_idx ON reports(listing_id);
CREATE INDEX IF NOT EXISTS reports_post_id_idx ON reports(post_id);
CREATE INDEX IF NOT EXISTS reports_comment_id_idx ON reports(comment_id);
CREATE INDEX IF NOT EXISTS reports_message_id_idx ON reports(message_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at);

-- Performance indexes for shares
CREATE INDEX IF NOT EXISTS shares_user_id_idx ON shares(user_id);
CREATE INDEX IF NOT EXISTS shares_post_id_idx ON shares(post_id);
CREATE INDEX IF NOT EXISTS shares_created_at_idx ON shares(created_at);