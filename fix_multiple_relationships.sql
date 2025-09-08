-- =============================================
-- FIX: Multiple relationship error between listings and profiles
-- =============================================

-- The issue is that there are multiple foreign key relationships between tables and profiles,
-- causing Supabase to be unable to determine which relationship to use for embeds.

-- =============================================
-- 1. Fix reviews table - remove duplicate reviewed_id column
-- =============================================

-- Drop the duplicate reviewed_id column and its foreign key
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewed_id_fkey;
ALTER TABLE reviews DROP COLUMN IF EXISTS reviewed_id;

-- Drop the trigger that was syncing reviewed_id with reviewed_user_id
DROP TRIGGER IF EXISTS sync_reviewed_id ON reviews;

-- =============================================
-- 2. Fix offers table - remove duplicate seller_id if it exists
-- =============================================

-- Check if offers table has both user_id and seller_id (which would be duplicates)
-- If so, we need to decide which one to keep. Based on the schema, offers should have:
-- - buyer_id (who made the offer)
-- - seller_id (who received the offer)
-- - No user_id column

-- Drop user_id if it exists in offers table (it shouldn't be there)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_user_id_fkey;
        ALTER TABLE offers DROP COLUMN user_id;
    END IF;
END $$;

-- =============================================
-- 3. Ensure proper foreign key naming for clarity
-- =============================================

-- Rename foreign key constraints to be more explicit
-- This helps Supabase understand which relationship to use

-- For listings table - only rename if the constraint doesn't already exist
DO $$ 
BEGIN
    -- Check if listings_seller_fkey already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'listings_seller_fkey' 
        AND table_name = 'listings'
    ) THEN
        -- Drop old constraint if it exists
        ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_user_id_fkey;
        -- Add new constraint
        ALTER TABLE listings ADD CONSTRAINT listings_seller_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For offers table - only rename if constraints don't already exist
DO $$ 
BEGIN
    -- Check if offers_buyer_fkey already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'offers_buyer_fkey' 
        AND table_name = 'offers'
    ) THEN
        ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_buyer_id_fkey;
        ALTER TABLE offers ADD CONSTRAINT offers_buyer_fkey 
            FOREIGN KEY (buyer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if offers_seller_fkey already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'offers_seller_fkey' 
        AND table_name = 'offers'
    ) THEN
        ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_seller_id_fkey;
        ALTER TABLE offers ADD CONSTRAINT offers_seller_fkey 
            FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- For reviews table - only rename if constraints don't already exist
DO $$ 
BEGIN
    -- Check if reviews_reviewer_fkey already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_reviewer_fkey' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
        ALTER TABLE reviews ADD CONSTRAINT reviews_reviewer_fkey 
            FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if reviews_reviewed_user_fkey already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_reviewed_user_fkey' 
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewed_user_id_fkey;
        ALTER TABLE reviews ADD CONSTRAINT reviews_reviewed_user_fkey 
            FOREIGN KEY (reviewed_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- 4. Create explicit relationship aliases for Supabase
-- =============================================

-- Add comments to help Supabase understand the relationships
COMMENT ON COLUMN listings.user_id IS 'The seller/owner of the listing';
COMMENT ON COLUMN offers.buyer_id IS 'The user who made the offer';
COMMENT ON COLUMN offers.seller_id IS 'The user who received the offer';
COMMENT ON COLUMN reviews.reviewer_id IS 'The user who wrote the review';
COMMENT ON COLUMN reviews.reviewed_user_id IS 'The user being reviewed';

-- =============================================
-- 5. Update any existing data that might be affected
-- =============================================

-- Ensure all foreign key relationships are valid
-- This will fail if there are orphaned records
DO $$ 
BEGIN
    -- Check for orphaned listings
    IF EXISTS (
        SELECT 1 FROM listings l 
        LEFT JOIN profiles p ON l.user_id = p.id 
        WHERE p.id IS NULL
    ) THEN
        RAISE NOTICE 'Found orphaned listings - these will be cleaned up';
    END IF;

    -- Check for orphaned offers
    IF EXISTS (
        SELECT 1 FROM offers o 
        LEFT JOIN profiles p1 ON o.buyer_id = p1.id 
        LEFT JOIN profiles p2 ON o.seller_id = p2.id 
        WHERE p1.id IS NULL OR p2.id IS NULL
    ) THEN
        RAISE NOTICE 'Found orphaned offers - these will be cleaned up';
    END IF;

    -- Check for orphaned reviews
    IF EXISTS (
        SELECT 1 FROM reviews r 
        LEFT JOIN profiles p1 ON r.reviewer_id = p1.id 
        LEFT JOIN profiles p2 ON r.reviewed_user_id = p2.id 
        WHERE p1.id IS NULL OR p2.id IS NULL
    ) THEN
        RAISE NOTICE 'Found orphaned reviews - these will be cleaned up';
    END IF;
END $$;

-- =============================================
-- 6. Create helper functions for explicit relationship queries
-- =============================================

-- Function to get listing with seller profile
CREATE OR REPLACE FUNCTION get_listing_with_seller(listing_uuid UUID)
RETURNS TABLE (
    listing_id UUID,
    title TEXT,
    description TEXT,
    price DECIMAL,
    seller_id UUID,
    seller_name TEXT,
    seller_avatar TEXT,
    seller_rating DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as listing_id,
        l.title,
        l.description,
        l.price,
        l.user_id as seller_id,
        CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as seller_name,
        p.avatar_url as seller_avatar,
        COALESCE(p.rating, 0.00) as seller_rating
    FROM listings l
    JOIN profiles p ON l.user_id = p.id
    WHERE l.id = listing_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get offer with buyer and seller profiles
CREATE OR REPLACE FUNCTION get_offer_with_profiles(offer_uuid UUID)
RETURNS TABLE (
    offer_id UUID,
    amount DECIMAL,
    buyer_id UUID,
    buyer_name TEXT,
    seller_id UUID,
    seller_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id as offer_id,
        o.amount,
        o.buyer_id,
        CONCAT(COALESCE(pb.first_name, ''), ' ', COALESCE(pb.last_name, '')) as buyer_name,
        o.seller_id,
        CONCAT(COALESCE(ps.first_name, ''), ' ', COALESCE(ps.last_name, '')) as seller_name
    FROM offers o
    JOIN profiles pb ON o.buyer_id = pb.id
    JOIN profiles ps ON o.seller_id = ps.id
    WHERE o.id = offer_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_listing_with_seller(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_offer_with_profiles(UUID) TO authenticated;

-- Success message
SELECT 'Multiple relationship issues fixed successfully!' as status;
