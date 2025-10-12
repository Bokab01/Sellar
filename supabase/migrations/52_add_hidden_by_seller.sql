-- Add hidden_by_seller column to listings table
-- This distinguishes between seller-hidden and moderation-hidden listings

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS hidden_by_seller BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN listings.hidden_by_seller IS 'TRUE if seller manually hid the listing, FALSE if hidden by moderation';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_listings_hidden_by_seller 
ON listings(hidden_by_seller) 
WHERE status = 'hidden';

