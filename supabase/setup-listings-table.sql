-- Comprehensive SQL setup for listings table and related tables
-- This script ensures all constraints are properly handled

-- First, let's create the categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories based on your constants
INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Electronics & Technology', 'electronics', 'smartphone', 1),
  ('00000000-0000-4000-8000-000000000002', 'Fashion & Beauty', 'fashion', 'shirt', 2),
  ('00000000-0000-4000-8000-000000000003', 'Home & Garden', 'home-garden', 'home', 3),
  ('00000000-0000-4000-8000-000000000004', 'Vehicles & Transportation', 'vehicles', 'car', 4),
  ('00000000-0000-4000-8000-000000000005', 'Health & Sports', 'health-sports', 'heart', 5),
  ('00000000-0000-4000-8000-000000000006', 'Business & Industrial', 'business', 'briefcase', 6),
  ('00000000-0000-4000-8000-000000000007', 'Education & Books', 'education', 'book', 7),
  ('00000000-0000-4000-8000-000000000008', 'Entertainment & Media', 'entertainment', 'music', 8),
  ('00000000-0000-4000-8000-000000000009', 'Food & Agriculture', 'food', 'coffee', 9),
  ('00000000-0000-4000-8000-000000000010', 'Services', 'services', 'tool', 10),
  ('00000000-0000-4000-8000-000000000000', 'General/Other', 'general', 'tag', 99)
ON CONFLICT (slug) DO NOTHING;

-- Create or update the listings table with proper constraints
DROP TABLE IF EXISTS listings CASCADE;

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
  description TEXT NOT NULL CHECK (length(description) >= 10 AND length(description) <= 5000),
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency IN ('GHS', 'USD', 'EUR', 'GBP')),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT DEFAULT '00000000-0000-4000-8000-000000000000',
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like-new', 'good', 'fair', 'poor')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  location TEXT NOT NULL CHECK (length(location) >= 2 AND length(location) <= 200),
  images JSONB DEFAULT '[]'::jsonb,
  accept_offers BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive', 'pending')),
  views INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP WITH TIME ZONE,
  boost_level INTEGER DEFAULT 0 CHECK (boost_level >= 0 AND boost_level <= 3),
  boost_until TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT listings_title_not_empty CHECK (trim(title) != ''),
  CONSTRAINT listings_description_not_empty CHECK (trim(description) != ''),
  CONSTRAINT listings_location_not_empty CHECK (trim(location) != '')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING gin(to_tsvector('english', location));
CREATE INDEX IF NOT EXISTS idx_listings_title_search ON listings USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_listings_description_search ON listings USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(featured, created_at DESC) WHERE featured = true;

-- Enable Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for listings
DROP POLICY IF EXISTS "Users can view active listings" ON listings;
DROP POLICY IF EXISTS "Users can insert own listings" ON listings;
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON listings;

-- Public can view active listings
CREATE POLICY "Users can view active listings" ON listings
  FOR SELECT USING (status = 'active');

-- Authenticated users can insert their own listings
CREATE POLICY "Users can insert own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "Users can update own listings" ON listings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "Users can delete own listings" ON listings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (is_active = true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a function to increment view count
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE listings 
    SET views = views + 1 
    WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON categories TO anon, authenticated;
GRANT ALL ON listings TO authenticated;
GRANT SELECT ON listings TO anon;

-- Insert some sample data for testing (optional)
-- Uncomment if you want sample listings
/*
INSERT INTO listings (user_id, title, description, price, category_id, condition, location, images, accept_offers) VALUES
  (
    (SELECT id FROM auth.users LIMIT 1), -- Use first user or replace with actual user ID
    'Sample iPhone 13',
    'Brand new iPhone 13 in excellent condition. Never used, still in original packaging.',
    2500.00,
    '00000000-0000-4000-8000-000000000001', -- Electronics category
    'new',
    'Accra, Ghana',
    '["https://example.com/image1.jpg"]'::jsonb,
    true
  );
*/

-- Verify the setup
SELECT 'Categories table created with ' || COUNT(*) || ' categories' as status FROM categories;
SELECT 'Listings table created successfully' as status;

-- Show table information (instead of \d commands)
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('listings', 'categories') 
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
