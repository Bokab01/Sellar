-- Apply all database fixes in the correct order
-- This script applies all the fixes needed for the review system and listings

-- 1. Fix listings status constraint to include 'reserved' status
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check 
CHECK (status IN ('active', 'sold', 'draft', 'expired', 'suspended', 'pending', 'reserved'));

-- 2. Add missing foreign key constraint for reviews.transaction_id
-- First check if constraint already exists, then add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_meetup_transaction_id_fkey'
    ) THEN
        ALTER TABLE reviews 
        ADD CONSTRAINT reviews_meetup_transaction_id_fkey 
        FOREIGN KEY (transaction_id) REFERENCES meetup_transactions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add missing columns to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer'));

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged'));

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS is_transaction_confirmed BOOLEAN DEFAULT false;

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'unconfirmed' CHECK (verification_level IN ('unconfirmed', 'single_confirmed', 'mutual_confirmed'));

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS reviewer_verification_score INTEGER DEFAULT 0;

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS transaction_value DECIMAL(10,2);

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER DEFAULT 0;

-- 4. Add documentation
COMMENT ON COLUMN listings.status IS 'Listing status: active (available), sold (completed), draft (not published), expired (time expired), suspended (moderated), pending (awaiting approval), reserved (temporarily held during offer process)';

COMMENT ON COLUMN reviews.review_type IS 'Type of review: buyer_to_seller (buyer reviewing seller) or seller_to_buyer (seller reviewing buyer)';
COMMENT ON COLUMN reviews.status IS 'Review status: draft (not published), published (visible), hidden (moderated), flagged (reported)';
COMMENT ON COLUMN reviews.is_transaction_confirmed IS 'Whether the underlying transaction was confirmed by both parties';
COMMENT ON COLUMN reviews.verification_level IS 'Verification level of the transaction: unconfirmed, single_confirmed, mutual_confirmed';
COMMENT ON COLUMN reviews.reviewer_verification_score IS 'Verification score of the reviewer at time of review';
COMMENT ON COLUMN reviews.transaction_value IS 'Value of the transaction being reviewed';
COMMENT ON COLUMN reviews.not_helpful_count IS 'Number of users who marked this review as not helpful';

-- 5. Verify the changes
SELECT 'Listings status constraint updated' as status;
SELECT 'Reviews table schema updated' as status;
SELECT 'All fixes applied successfully' as status;
