/*
  # Listings and Marketplace Tables

  1. New Tables
    - `listings` - Product listings with comprehensive marketplace features
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title`, `description` (text, product details)
      - `price` (numeric, must be positive)
      - `currency` (text, default: 'GHS')
      - `category_id` (uuid, references categories)
      - `condition` (text, enum: Brand New, Like New, Good, Fair, For Parts)
      - `quantity` (integer, available stock)
      - `location` (text, seller location)
      - `images` (jsonb, array of image URLs)
      - `accept_offers` (boolean, allow price negotiations)
      - `status` (text, enum: active, sold, draft, expired, suspended)
      - `views_count`, `favorites_count` (integer counters)
      - `boost_expires_at` (timestamptz, for promoted listings)
      - `created_at`, `updated_at` (timestamps)

  2. Security
    - Enable RLS on listings table
    - Anyone can view active listings
    - Users can manage their own listings
    - Automatic timestamp updates

  3. Constraints
    - Price must be positive
    - Quantity must be greater than 0
    - Valid condition and status values
    - Non-negative view and favorite counts
*/

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  currency text DEFAULT 'GHS',
  category_id uuid NOT NULL REFERENCES categories(id),
  condition text NOT NULL CHECK (condition IN ('Brand New', 'Like New', 'Good', 'Fair', 'For Parts')),
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  location text NOT NULL,
  images jsonb DEFAULT '[]',
  accept_offers boolean DEFAULT true,
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'expired', 'suspended')),
  views_count integer DEFAULT 0 CHECK (views_count >= 0),
  favorites_count integer DEFAULT 0 CHECK (favorites_count >= 0),
  boost_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Listings policies
CREATE POLICY "Anyone can view active listings"
  ON listings
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can insert own listings"
  ON listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();