-- Enhance handle_user_block trigger to handle pending offers
-- Edge Case 2: Block user with pending offer

CREATE OR REPLACE FUNCTION handle_user_block()
RETURNS TRIGGER AS $$
BEGIN
    -- When user A blocks user B:
    
    -- 1. Mark their conversation as archived/deleted for blocker
    UPDATE conversations
    SET 
        deleted_for_participant_1 = CASE WHEN participant_1 = NEW.blocker_id THEN TRUE ELSE deleted_for_participant_1 END,
        deleted_for_participant_2 = CASE WHEN participant_2 = NEW.blocker_id THEN TRUE ELSE deleted_for_participant_2 END
    WHERE (participant_1 = NEW.blocker_id AND participant_2 = NEW.blocked_id)
       OR (participant_1 = NEW.blocked_id AND participant_2 = NEW.blocker_id);
    
    -- 2. Remove any pending notifications from blocked user
    DELETE FROM notifications
    WHERE user_id = NEW.blocker_id
    AND (data->>'sender_id')::UUID = NEW.blocked_id;
    
    -- 3. Auto-reject any pending offers between the two users (Edge Case 2)
    UPDATE offers
    SET 
        status = 'rejected',
        updated_at = NOW()
    WHERE status = 'pending'
    AND (
        -- Offers from blocked user to blocker
        (buyer_id = NEW.blocked_id AND seller_id = NEW.blocker_id)
        OR
        -- Offers from blocker to blocked user
        (buyer_id = NEW.blocker_id AND seller_id = NEW.blocked_id)
    );
    
    -- 4. Log the block for analytics (optional)
    RAISE NOTICE 'User % blocked user % - archived conversation and rejected pending offers', NEW.blocker_id, NEW.blocked_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_user_block IS 'Handles cleanup when user is blocked: archives conversation, removes notifications, and auto-rejects pending offers';

