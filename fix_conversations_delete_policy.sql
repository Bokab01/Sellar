-- Fix conversations RLS policy to allow users to delete conversations they participate in

-- Add DELETE policy for conversations
CREATE POLICY "Users can delete conversations they participate in" ON conversations
    FOR DELETE USING (
        auth.uid() = participant_1 OR 
        auth.uid() = participant_2
    );
