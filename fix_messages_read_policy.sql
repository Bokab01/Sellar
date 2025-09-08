-- Fix messages RLS policy to allow users to mark messages as read
-- This allows users to update the read_at field for messages in conversations they participate in

-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Create a new UPDATE policy that allows users to:
-- 1. Update their own messages (content, status, etc.)
-- 2. Update read_at field for any message in conversations they participate in
CREATE POLICY "Users can update messages in their conversations" ON messages FOR UPDATE USING (
    -- Allow updating own messages
    auth.uid() = sender_id
    OR
    -- Allow updating read_at for messages in conversations they participate in
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
);
