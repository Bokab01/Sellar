-- =============================================
-- FIX REVIEWS-LISTINGS RELATIONSHIP
-- Ensure proper foreign key relationships exist
-- =============================================

-- First, ensure the listings table exists with proper structure
-- This will create the table if it doesn't exist, or do nothing if it does
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
    description TEXT NOT NULL CHECK (length(description) >= 10 AND length(description) <= 5000),
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency IN ('GHS', 'USD', 'EUR', 'GBP')),
    category_id UUID,
    condition TEXT NOT NULL CHECK (condition IN ('new', 'like-new', 'good', 'fair', 'poor')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    location TEXT NOT NULL CHECK (length(location) >= 2 AND length(location) <= 200),
    images JSONB DEFAULT '[]'::jsonb,
    accept_offers BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive', 'pending')),
    views INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMPTZ,
    boost_level INTEGER DEFAULT 0 CHECK (boost_level >= 0 AND boost_level <= 3),
    boost_until TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT listings_title_not_empty CHECK (trim(title) != ''),
    CONSTRAINT listings_description_not_empty CHECK (trim(description) != ''),
    CONSTRAINT listings_location_not_empty CHECK (trim(location) != '')
);

-- Ensure the reviews table exists with proper foreign key to listings
-- This should already exist from the review system migration, but we'll ensure it's correct
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_listing_id_fkey' 
        AND table_name = 'reviews'
    ) THEN
        -- Add the foreign key constraint if it doesn't exist
        ALTER TABLE reviews 
        ADD CONSTRAINT reviews_listing_id_fkey 
        FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON reviews(listing_id);

-- Refresh the schema cache to ensure Supabase recognizes the relationships
NOTIFY pgrst, 'reload schema';

-- Verify the relationship exists
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'reviews'
    AND kcu.column_name = 'listing_id';
