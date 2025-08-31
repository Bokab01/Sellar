/*
  # Reviews, Favorites and User Interactions

  1. New Tables
    - `reviews` - User review and rating system
      - `id` (uuid, primary key)
      - `reviewer_id` (uuid, references profiles)
      - `reviewed_id` (uuid, references profiles)
      - `listing_id` (uuid, optional reference to listing)
      - `rating` (integer, 1-5 scale)
      - `comment` (text, review content)
      - `is_verified_purchase` (boolean, verified transaction)
      - `helpful_count` (integer, helpful votes)
      - `created_at`, `updated_at` (timestamps)

    - `favorites` - User saved listings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `listing_id` (uuid, references listings)
      - `created_at` (timestamp)

    - `listing_views` - Track listing views for analytics
      - `id` (uuid, primary key)
      - `listing_id` (uuid, references listings)
      - `user_id` (uuid, optional references profiles)
      - `ip_address` (text, for anonymous tracking)
      - `user_agent` (text, browser/app info)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can view all reviews and favorites
    - Users can manage their own reviews and favorites
    - Anonymous view tracking allowed

  3. Constraints
    - Rating must be between 1-5
    - Users cannot review themselves
    - Unique favorites per user-listing pair
    - Non-negative helpful counts
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
  CHECK (reviewer_id != reviewed_id)
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

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

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
  WITH CHECK (auth.uid() = reviewer_id);

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
CREATE POLICY "Users can view all favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own favorites"
  ON favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Listing views policies
CREATE POLICY "Anyone can create listing views"
  ON listing_views
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view listing analytics"
  ON listing_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings
      WHERE listings.id = listing_views.listing_id
      AND listings.user_id = auth.uid()
    )
  );

-- Create triggers
CREATE OR REPLACE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();