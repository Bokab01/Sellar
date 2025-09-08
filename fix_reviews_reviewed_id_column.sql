-- =============================================
-- FIX: Add missing reviewed_id column to reviews table
-- =============================================

-- Add reviewed_id column to reviews table if it doesn't exist
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS reviewed_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Update existing records to populate reviewed_id from reviewed_user_id
UPDATE reviews 
SET reviewed_id = reviewed_user_id 
WHERE reviewed_id IS NULL AND reviewed_user_id IS NOT NULL;

-- Make reviewed_id NOT NULL after populating it
ALTER TABLE reviews 
ALTER COLUMN reviewed_id SET NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN reviews.reviewed_id IS 'ID of the user being reviewed (alias for reviewed_user_id for frontend compatibility)';

-- Add foreign key constraint name for frontend compatibility
-- The frontend expects: reviews_reviewed_id_fkey
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_reviewed_id_fkey' 
        AND table_name = 'reviews'
    ) THEN
        -- Add the constraint with the expected name
        ALTER TABLE reviews 
        ADD CONSTRAINT reviews_reviewed_id_fkey 
        FOREIGN KEY (reviewed_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create function to sync reviewed_id with reviewed_user_id
CREATE OR REPLACE FUNCTION sync_reviewed_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Always keep reviewed_id in sync with reviewed_user_id
    NEW.reviewed_id = NEW.reviewed_user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync reviewed_id
DROP TRIGGER IF EXISTS sync_reviewed_id_trigger ON reviews;
CREATE TRIGGER sync_reviewed_id_trigger
    BEFORE INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION sync_reviewed_id();

-- Success message
SELECT 'reviewed_id column added to reviews table successfully!' as status;
