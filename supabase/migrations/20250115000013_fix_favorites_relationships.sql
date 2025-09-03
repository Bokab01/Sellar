-- =============================================
-- FIX FAVORITES RELATIONSHIPS
-- Ensure all relationships are properly established
-- =============================================

-- Ensure favorites table exists with proper relationships
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, listing_id)
);

-- Ensure categories table exists
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure listings table has proper category relationship
DO $$
BEGIN
    -- Check if category_id column exists and has proper constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%listings_category_id%' 
        AND table_name = 'listings'
    ) THEN
        -- Add foreign key constraint if it doesn't exist
        ALTER TABLE listings 
        ADD CONSTRAINT fk_listings_category_id 
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites(listing_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Insert default categories if they don't exist (handle conflicts gracefully)
DO $$
BEGIN
    -- Insert categories with exception handling to avoid conflicts
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000001', 'Electronics', 'electronics', 'smartphone', 1);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000002', 'Fashion & Clothing', 'fashion', 'shirt', 2);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000003', 'Home & Garden', 'home-garden', 'home', 3);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000004', 'Vehicles', 'vehicles', 'car', 4);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000005', 'Health & Sports', 'health-sports', 'dumbbell', 5);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000006', 'Business & Industrial', 'business', 'briefcase', 6);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000007', 'Education & Books', 'education', 'book', 7);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000008', 'Entertainment', 'entertainment', 'music', 8);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000009', 'Food & Beverages', 'food', 'utensils', 9);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000010', 'Services', 'services', 'wrench', 10);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    
    BEGIN
        INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
            ('00000000-0000-4000-8000-000000000000', 'Other', 'other', 'package', 99);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
END $$;

-- Enable RLS on favorites if not already enabled
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view favorites" ON favorites;
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;

-- Create RLS policies for favorites
CREATE POLICY "Anyone can view favorites" ON favorites
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Refresh schema cache by updating table comments
COMMENT ON TABLE favorites IS 'User favorite listings - updated at migration';
COMMENT ON TABLE listings IS 'Product listings - updated at migration';
COMMENT ON TABLE categories IS 'Product categories - updated at migration';
