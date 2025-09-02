/*
  # Reviews, Favorites, and User Interactions

  1. New Tables
    - `reviews` - User reviews and ratings
      - `id` (uuid, primary key)
      - `reviewer_id` (uuid, references profiles)
      - `reviewed_id` (uuid, references profiles)
      - `listing_id` (uuid, optional references listings)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `is_verified_purchase` (boolean)
      - `helpful_count` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `favorites` - User saved/favorited listings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `listing_id` (uuid, references listings)
      - `created_at` (timestamptz)

    - `listing_views` - Track listing views for analytics
      - `id` (uuid, primary key)
      - `listing_id` (uuid, references listings)
      - `user_id` (uuid, optional references profiles)
      - `ip_address` (text, optional)
      - `user_agent` (text, optional)
      - `created_at` (timestamptz)

    - `reports` - Content reporting system
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references profiles)
      - `reported_user_id` (uuid, optional references profiles)
      - `listing_id` (uuid, optional references listings)
      - `post_id` (uuid, optional references posts)
      - `comment_id` (uuid, optional references comments)
      - `message_id` (uuid, optional references messages)
      - `reason` (text)
      - `description` (text)
      - `status` (text: pending, reviewed, resolved, dismissed)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can manage their own favorites and reviews
    - Reports are restricted to authenticated users
    - Views tracking for analytics
*/

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  is_verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(reviewer_id, reviewed_id, listing_id)
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Create listing_views table
CREATE TABLE IF NOT EXISTS listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fraud', 'harassment', 'fake', 'other')),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  CHECK (
    (reported_user_id IS NOT NULL) OR
    (listing_id IS NOT NULL) OR
    (post_id IS NOT NULL) OR
    (comment_id IS NOT NULL) OR
    (message_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id AND reviewer_id != reviewed_id);

CREATE POLICY "Users can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
  ON favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Listing views policies (for analytics)
CREATE POLICY "Anyone can create listing views"
  ON listing_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own listing views"
  ON listing_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Reports policies
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Add updated_at triggers
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user rating when new review is added
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS trigger AS $$
DECLARE
  avg_rating numeric;
  review_count integer;
BEGIN
  -- Calculate new average rating and count
  SELECT AVG(rating), COUNT(*)
  INTO avg_rating, review_count
  FROM reviews
  WHERE reviewed_id = COALESCE(NEW.reviewed_id, OLD.reviewed_id);

  -- Update user profile
  UPDATE profiles
  SET 
    rating = COALESCE(avg_rating, 0),
    total_reviews = review_count
  WHERE id = COALESCE(NEW.reviewed_id, OLD.reviewed_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user rating on review changes
CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Function to update favorites count
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE listings SET favorites_count = favorites_count + 1 WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE listings SET favorites_count = favorites_count - 1 WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update favorites count
CREATE TRIGGER update_favorites_count_trigger
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorites_count();