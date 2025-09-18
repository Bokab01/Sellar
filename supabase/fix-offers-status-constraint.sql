-- Fix offers status check constraint to include 'countered' status
-- This allows counter offers to properly update the original offer status

-- Drop the existing check constraint
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;

-- Add the new check constraint with 'countered' status included
ALTER TABLE offers ADD CONSTRAINT offers_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn', 'countered'));

-- Add a comment to document the status meanings
COMMENT ON COLUMN offers.status IS 'Offer status: pending (waiting for response), accepted (offer accepted), rejected (offer declined), expired (offer expired), withdrawn (offer withdrawn by buyer), countered (counter offer made)';
