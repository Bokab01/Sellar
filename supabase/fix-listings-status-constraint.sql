-- Fix listings_status_check constraint to include 'reserved' status
-- This status is used when a listing is reserved during offer acceptance

-- Drop the existing constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;

-- Add the new constraint with 'reserved' status included
ALTER TABLE listings ADD CONSTRAINT listings_status_check 
CHECK (status IN ('active', 'sold', 'draft', 'expired', 'suspended', 'pending', 'reserved'));

-- Add documentation
COMMENT ON COLUMN listings.status IS 'Listing status: active (available), sold (completed), draft (not published), expired (time expired), suspended (moderated), pending (awaiting approval), reserved (temporarily held during offer process)';
