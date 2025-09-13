-- =============================================
-- SELLAR MOBILE APP - FIX REVIEWS FOREIGN KEY CONSTRAINTS
-- Migration 29: Fix missing foreign key constraint names for reviews table
-- =============================================

-- The issue: Frontend code expects specific foreign key constraint names
-- but they don't exist, causing Supabase queries to fail

-- =============================================
-- 1. ENSURE REVIEWS TABLE EXISTS WITH CORRECT STRUCTURE
-- =============================================

-- Create reviews table if it doesn't exist (with all expected columns)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL,
    reviewed_user_id UUID NOT NULL,
    
    -- Link to meetup transaction (optional for backward compatibility)
    meetup_transaction_id UUID,
    listing_id UUID,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    review_type TEXT CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer')),
    
    -- Transaction verification status
    is_transaction_confirmed BOOLEAN DEFAULT false,
    verification_level TEXT DEFAULT 'unconfirmed' CHECK (verification_level IN (
        'unconfirmed', 'single_confirmed', 'mutual_confirmed'
    )),
    
    -- Trust and verification metrics
    reviewer_verification_score INTEGER DEFAULT 0,
    transaction_value DECIMAL(12,2),
    
    -- Helpful votes
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Moderation
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged', 'removed')),
    moderation_notes TEXT,
    moderated_by UUID,
    moderated_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (reviewer_id != reviewed_user_id) -- Can't review yourself
);

-- =============================================
-- 2. DROP EXISTING FOREIGN KEY CONSTRAINTS (IF ANY)
-- =============================================

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop all existing foreign key constraints on reviews table
    FOR constraint_record IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'reviews' 
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE reviews DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- =============================================
-- 3. CREATE FOREIGN KEY CONSTRAINTS WITH EXPECTED NAMES
-- =============================================

-- Add foreign key constraints with the exact names expected by frontend

-- For reviewer_id -> profiles(id)
-- Expected by useReviews.ts: reviews_reviewer_fkey
ALTER TABLE reviews 
ADD CONSTRAINT reviews_reviewer_fkey 
FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- For reviewed_user_id -> profiles(id)  
-- Expected by useReviews.ts: reviews_reviewed_user_fkey
ALTER TABLE reviews 
ADD CONSTRAINT reviews_reviewed_user_fkey 
FOREIGN KEY (reviewed_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- For meetup_transaction_id -> meetup_transactions(id)
-- Expected by useTransactionBasedReviews.ts: reviews_meetup_transaction_id_fkey
ALTER TABLE reviews 
ADD CONSTRAINT reviews_meetup_transaction_id_fkey 
FOREIGN KEY (meetup_transaction_id) REFERENCES meetup_transactions(id) ON DELETE CASCADE;

-- For listing_id -> listings(id)
ALTER TABLE reviews 
ADD CONSTRAINT reviews_listing_id_fkey 
FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;

-- For moderated_by -> profiles(id)
ALTER TABLE reviews 
ADD CONSTRAINT reviews_moderated_by_fkey 
FOREIGN KEY (moderated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_meetup_transaction_id ON reviews(meetup_transaction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_verification_level ON reviews(verification_level);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- =============================================
-- 5. ENABLE RLS AND CREATE POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;

-- Create RLS policies
CREATE POLICY "Users can view published reviews" ON reviews
    FOR SELECT USING (status = 'published');

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews" ON reviews
    FOR DELETE USING (auth.uid() = reviewer_id);

-- =============================================
-- 6. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at_trigger ON reviews;
CREATE TRIGGER update_reviews_updated_at_trigger
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- =============================================
-- 7. GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON reviews TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Success message
SELECT 'Reviews foreign key constraints fixed with correct names!' as status;
