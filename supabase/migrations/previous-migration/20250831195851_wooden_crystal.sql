/*
  # Listings and Categories

  1. New Tables
    - `categories` - Product categories hierarchy
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `parent_id` (uuid, optional for subcategories)
      - `icon` (text, icon name)
      - `is_active` (boolean)
      - `sort_order` (integer)

    - `listings` - Product listings
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `price` (numeric)
      - `currency` (text, default 'GHS')
      - `category_id` (uuid, references categories)
      - `condition` (text)
      - `quantity` (integer)
      - `location` (text)
      - `images` (jsonb array of image URLs)
      - `accept_offers` (boolean)
      - `status` (text: active, sold, draft, expired)
      - `views_count` (integer)
      - `favorites_count` (integer)
      - `boost_expires_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Categories are publicly readable
    - Users can CRUD their own listings
    - Public can view active listings
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  icon text NOT NULL DEFAULT 'package',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

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
  images jsonb DEFAULT '[]'::jsonb,
  accept_offers boolean DEFAULT true,
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'draft', 'expired', 'suspended')),
  views_count integer DEFAULT 0 CHECK (views_count >= 0),
  favorites_count integer DEFAULT 0 CHECK (favorites_count >= 0),
  boost_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read)
CREATE POLICY "Categories are publicly readable"
  ON categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

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

-- Add updated_at trigger for listings
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Electronics', 'electronics', 'smartphone', 1),
  ('Fashion', 'fashion', 'shirt', 2),
  ('Home & Garden', 'home-garden', 'home', 3),
  ('Vehicles', 'vehicles', 'car', 4),
  ('Books & Media', 'books-media', 'book', 5),
  ('Sports', 'sports', 'dumbbell', 6),
  ('Services', 'services', 'briefcase', 7),
  ('Other', 'other', 'more-horizontal', 8)
ON CONFLICT (slug) DO NOTHING;