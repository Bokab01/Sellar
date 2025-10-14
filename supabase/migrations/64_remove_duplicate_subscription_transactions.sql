-- Remove duplicate subscription payment transactions
-- Keep only the first transaction for each unique paystack reference

-- First, identify duplicates and keep only the oldest one
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        user_id,
        metadata->>'paystack_reference',
        metadata->>'subscription_id'
      ORDER BY created_at ASC
    ) as rn
  FROM credit_transactions
  WHERE type = 'subscription_payment'
    AND metadata->>'paystack_reference' IS NOT NULL
)
DELETE FROM credit_transactions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add a comment explaining the cleanup
COMMENT ON TABLE credit_transactions IS 'Stores all credit-related transactions. Duplicates for subscription payments removed by migration 64.';

-- Log the results
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Removed % duplicate subscription transaction(s)', deleted_count;
END $$;

