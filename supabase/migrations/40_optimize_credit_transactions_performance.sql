-- Migration 40: Optimize credit_transactions table for faster queries
-- This migration adds indexes to speed up transaction history queries

-- ============================================================================
-- 1. Add Performance Indexes
-- ============================================================================

-- Index for user transactions ordered by date (most common query)
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_date 
ON credit_transactions(user_id, created_at DESC);

-- Index for user transactions by type
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type 
ON credit_transactions(user_id, type, created_at DESC);

-- Index for reference lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference 
ON credit_transactions(reference_id, reference_type) 
WHERE reference_id IS NOT NULL;

-- Index for amount range queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_amount 
ON credit_transactions(user_id, amount, created_at DESC);

-- ============================================================================
-- 2. Optimize the table structure
-- ============================================================================

-- Analyze table to update statistics for query planner
ANALYZE credit_transactions;

-- ============================================================================
-- 3. Add helpful comments
-- ============================================================================

COMMENT ON INDEX idx_credit_transactions_user_date IS 
'Optimizes the most common query: fetching user transactions ordered by date';

COMMENT ON INDEX idx_credit_transactions_user_type IS 
'Speeds up queries filtering by transaction type (earned/spent)';

COMMENT ON INDEX idx_credit_transactions_reference IS 
'Improves performance when looking up transactions by reference (e.g., feature_id, listing_id)';

