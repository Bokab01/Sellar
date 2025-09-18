-- Add missing columns to reviews table
-- These columns are needed for the transaction-based review system

-- Add the review_type column
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) CHECK (review_type IN ('buyer_to_seller', 'seller_to_buyer'));

-- Add status column for review moderation
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden', 'flagged'));

-- Add transaction confirmation tracking
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS is_transaction_confirmed BOOLEAN DEFAULT false;

-- Add verification level tracking
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'unconfirmed' CHECK (verification_level IN ('unconfirmed', 'single_confirmed', 'mutual_confirmed'));

-- Add reviewer verification score
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS reviewer_verification_score INTEGER DEFAULT 0;

-- Add transaction value for context
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS transaction_value DECIMAL(10,2);

-- Add not helpful count for review quality tracking
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER DEFAULT 0;

-- Add comments to document the columns
COMMENT ON COLUMN reviews.review_type IS 'Type of review: buyer_to_seller (buyer reviewing seller) or seller_to_buyer (seller reviewing buyer)';
COMMENT ON COLUMN reviews.status IS 'Review status: draft (not published), published (visible), hidden (moderated), flagged (reported)';
COMMENT ON COLUMN reviews.is_transaction_confirmed IS 'Whether the underlying transaction was confirmed by both parties';
COMMENT ON COLUMN reviews.verification_level IS 'Verification level of the transaction: unconfirmed, single_confirmed, mutual_confirmed';
COMMENT ON COLUMN reviews.reviewer_verification_score IS 'Verification score of the reviewer at time of review';
COMMENT ON COLUMN reviews.transaction_value IS 'Value of the transaction being reviewed';
COMMENT ON COLUMN reviews.not_helpful_count IS 'Number of users who marked this review as not helpful';
