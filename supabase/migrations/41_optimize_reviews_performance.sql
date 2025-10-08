-- Migration 41: Optimize reviews table for faster queries
-- This migration adds indexes and optimizations for the reviews system

-- ============================================================================
-- 1. Add Performance Indexes for Reviews
-- ============================================================================

-- Index for fetching user's received reviews (most common query)
CREATE INDEX IF NOT EXISTS idx_reviews_user_status_date 
ON reviews(reviewed_user_id, status, created_at DESC)
WHERE status = 'published';

-- Index for fetching user's given reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_status_date 
ON reviews(reviewer_id, status, created_at DESC)
WHERE status = 'published';

-- Index for listing reviews
CREATE INDEX IF NOT EXISTS idx_reviews_listing_status_date 
ON reviews(listing_id, status, created_at DESC)
WHERE status = 'published' AND listing_id IS NOT NULL;

-- Index for review stats calculations
CREATE INDEX IF NOT EXISTS idx_reviews_rating_user 
ON reviews(reviewed_user_id, rating, status)
WHERE status = 'published';

-- ============================================================================
-- 2. Optimize review_helpful_votes Table
-- ============================================================================

-- Index for checking if user voted (used in every review fetch)
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_user_review 
ON review_helpful_votes(user_id, review_id);

-- Index for counting helpful votes per review
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review 
ON review_helpful_votes(review_id);

-- ============================================================================
-- 3. Add Composite Index for Common Query Pattern
-- ============================================================================

-- Composite index for the exact query pattern used in the app
CREATE INDEX IF NOT EXISTS idx_reviews_composite 
ON reviews(reviewed_user_id, status, created_at DESC, reviewer_id)
WHERE status = 'published';

-- ============================================================================
-- 4. Analyze Tables
-- ============================================================================

-- Update statistics for query planner
ANALYZE reviews;
ANALYZE review_helpful_votes;

-- ============================================================================
-- 5. Add Helpful Comments
-- ============================================================================

COMMENT ON INDEX idx_reviews_user_status_date IS 
'Optimizes fetching received reviews for a user';

COMMENT ON INDEX idx_reviews_reviewer_status_date IS 
'Optimizes fetching given reviews by a user';

COMMENT ON INDEX idx_review_helpful_votes_user_review IS 
'Critical for checking if user has voted on reviews - prevents N+1 queries';

