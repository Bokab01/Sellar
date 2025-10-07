-- Fix RLS policy to allow viewing reserved listings
-- Reserved listings should be visible to everyone (just like active listings)

-- Drop the old policy
DROP POLICY IF EXISTS "Active listings are viewable by everyone" ON listings;

-- Create new policy that includes reserved listings
CREATE POLICY "Active and reserved listings are viewable by everyone" ON listings
    FOR SELECT USING (
        status IN ('active', 'reserved') OR 
        auth.uid() = user_id OR
        auth.role() = 'service_role'
    );

COMMENT ON POLICY "Active and reserved listings are viewable by everyone" ON listings IS 
  'Allows everyone to view active and reserved listings. Reserved = offer accepted, pending transaction completion.';
