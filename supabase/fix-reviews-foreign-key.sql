-- Fix missing foreign key constraint for reviews.transaction_id
-- This should reference meetup_transactions table

-- Add the foreign key constraint (check if it already exists first)
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

-- Add comment to clarify the relationship
COMMENT ON COLUMN reviews.transaction_id IS 'References meetup_transactions.id for verified purchase reviews';
