-- Fix offers RLS policies
-- The issue is that there are conflicting UPDATE policies

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Sellers can update their offers" ON offers;
DROP POLICY IF EXISTS "Buyers can update their own offers" ON offers;

-- Create a single, clear UPDATE policy
CREATE POLICY "Users can update offers they're involved in" ON offers 
FOR UPDATE USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- Also ensure we have proper policies for other operations
DROP POLICY IF EXISTS "Users can view offers they're involved in" ON offers;
CREATE POLICY "Users can view offers they're involved in" ON offers 
FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
);

DROP POLICY IF EXISTS "Users can create offers" ON offers;
CREATE POLICY "Users can create offers" ON offers 
FOR INSERT WITH CHECK (
    auth.uid() = buyer_id AND auth.uid() != seller_id
);

-- Add DELETE policy if needed
DROP POLICY IF EXISTS "Users can delete their own offers" ON offers;
CREATE POLICY "Users can delete their own offers" ON offers 
FOR DELETE USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
);
