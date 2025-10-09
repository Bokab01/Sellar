-- =============================================
-- FIX NOTIFICATION BODIES TO SHOW ACTUAL CONTENT
-- =============================================
-- Issue: Notifications show generic messages like "Someone sent you a message" 
--        instead of actual content preview
-- Solution: Update notification trigger functions to include content preview in body
--
-- Changes:
-- 1. ✅ Messages: Show first 50 characters of message content
-- 2. ✅ Comments: Show first 50 characters of comment text  
-- 3. ✅ Likes: Show first 40 characters of post content
-- 4. ✅ Reviews: Add notifications when users receive reviews (NEW)
-- 5. ✅ Transactions: Add notifications for transaction confirmations (NEW)
-- =============================================

-- Fix message notifications to include message preview
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    sender_username TEXT;
    sender_avatar TEXT;
    recipient_id UUID;
    conversation_id UUID;
    message_preview TEXT;
BEGIN
    -- Get sender details
    SELECT username, avatar_url INTO sender_username, sender_avatar
    FROM profiles 
    WHERE id = NEW.sender_id;
    
    -- Get conversation details to find recipient
    SELECT 
        CASE 
            WHEN participant_1 = NEW.sender_id THEN participant_2 
            ELSE participant_1 
        END,
        id
    INTO recipient_id, conversation_id
    FROM conversations 
    WHERE id = NEW.conversation_id;
    
    -- Don't notify if recipient is the same as sender (shouldn't happen)
    IF recipient_id = NEW.sender_id THEN
        RETURN NEW;
    END IF;
    
    -- Create message preview (first 50 characters)
    message_preview := LEFT(NEW.content, 50);
    IF LENGTH(NEW.content) > 50 THEN
        message_preview := message_preview || '...';
    END IF;
    
    -- Create notification with message preview in body
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        recipient_id,
        'message',
        COALESCE(sender_username, 'Someone') || ' sent you a message',
        message_preview, -- Show actual message content
        jsonb_build_object(
            'sender_id', NEW.sender_id,
            'sender_username', COALESCE(sender_username, 'Unknown User'),
            'sender_avatar', sender_avatar,
            'conversation_id', conversation_id,
            'message_id', NEW.id,
            'message_content', LEFT(NEW.content, 100),
            'sent_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix comment notifications to include comment preview
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    commenter_username TEXT;
    commenter_avatar TEXT;
    post_owner_id UUID;
    post_content TEXT;
    comment_preview TEXT;
BEGIN
    -- Get commenter details
    SELECT username, avatar_url INTO commenter_username, commenter_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, content INTO post_owner_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if user comments on their own post
    IF NEW.user_id = post_owner_id THEN
        RETURN NEW;
    END IF;
    
    -- Create comment preview (first 50 characters)
    comment_preview := LEFT(NEW.content, 50);
    IF LENGTH(NEW.content) > 50 THEN
        comment_preview := comment_preview || '...';
    END IF;
    
    -- Create notification with comment preview
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_owner_id,
        'comment',
        COALESCE(commenter_username, 'Someone') || ' commented on your post',
        comment_preview, -- Show actual comment content
        jsonb_build_object(
            'commenter_id', NEW.user_id,
            'commenter_username', COALESCE(commenter_username, 'Unknown User'),
            'commenter_avatar', commenter_avatar,
            'post_id', NEW.post_id,
            'comment_id', NEW.id,
            'comment_content', LEFT(NEW.content, 100),
            'post_preview', LEFT(post_content, 100),
            'commented_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix like notifications to include post preview
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    liker_username TEXT;
    liker_avatar TEXT;
    post_owner_id UUID;
    post_content TEXT;
    post_preview TEXT;
BEGIN
    -- Get liker details
    SELECT username, avatar_url INTO liker_username, liker_avatar
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Get post details
    SELECT user_id, content INTO post_owner_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Don't notify if user likes their own post
    IF NEW.user_id = post_owner_id THEN
        RETURN NEW;
    END IF;
    
    -- Create post preview (first 40 characters)
    post_preview := LEFT(post_content, 40);
    IF LENGTH(post_content) > 40 THEN
        post_preview := post_preview || '...';
    END IF;
    
    -- Create notification with post preview
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        post_owner_id,
        'like',
        COALESCE(liker_username, 'Someone') || ' liked your post',
        '❤️ "' || post_preview || '"', -- Show post preview
        jsonb_build_object(
            'liker_id', NEW.user_id,
            'liker_username', COALESCE(liker_username, 'Unknown User'),
            'liker_avatar', liker_avatar,
            'post_id', NEW.post_id,
            'post_content', LEFT(post_content, 100),
            'liked_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: follow_notification and listing_notification are already good as-is
-- They don't have content to preview, just the action

COMMENT ON FUNCTION create_message_notification IS 
'Creates notification for new messages with message preview in body';

COMMENT ON FUNCTION create_comment_notification IS 
'Creates notification for new comments with comment preview in body';

COMMENT ON FUNCTION create_like_notification IS 
'Creates notification for post likes with post preview in body';

-- =============================================
-- ADD REVIEW NOTIFICATIONS
-- =============================================

-- Create notification function for new reviews
CREATE OR REPLACE FUNCTION create_review_notification()
RETURNS TRIGGER AS $$
DECLARE
    reviewer_username TEXT;
    reviewer_avatar TEXT;
    review_preview TEXT;
BEGIN
    -- Only send notification if review is published (not hidden/pending)
    IF NEW.status != 'published' THEN
        RETURN NEW;
    END IF;

    -- Don't notify if reviewing yourself (edge case)
    IF NEW.reviewer_id = NEW.reviewed_user_id THEN
        RETURN NEW;
    END IF;

    -- Get reviewer details
    SELECT username, avatar_url INTO reviewer_username, reviewer_avatar
    FROM profiles 
    WHERE id = NEW.reviewer_id;
    
    -- Create review preview (first 50 chars)
    review_preview := LEFT(NEW.comment, 50);
    IF LENGTH(NEW.comment) > 50 THEN
        review_preview := review_preview || '...';
    END IF;
    
    -- Create notification for the reviewed user
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
        NEW.reviewed_user_id,
        'review',
        CASE 
            WHEN NEW.rating >= 4 THEN 'New Positive Review! ⭐'
            WHEN NEW.rating = 3 THEN 'New Review ⭐'
            ELSE 'New Review'
        END,
        COALESCE(reviewer_username, 'Someone') || ' rated you ' || NEW.rating || ' stars: "' || review_preview || '"',
        jsonb_build_object(
            'reviewer_id', NEW.reviewer_id,
            'reviewer_username', COALESCE(reviewer_username, 'Unknown User'),
            'reviewer_avatar', reviewer_avatar,
            'review_id', NEW.id,
            'rating', NEW.rating,
            'comment', NEW.comment,
            'listing_id', NEW.listing_id,
            'transaction_id', NEW.transaction_id,
            'created_at', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for review notifications
DROP TRIGGER IF EXISTS trigger_create_review_notification ON reviews;
CREATE TRIGGER trigger_create_review_notification
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION create_review_notification();

-- Also notify when hidden reviews become published
CREATE OR REPLACE FUNCTION create_review_published_notification()
RETURNS TRIGGER AS $$
DECLARE
    reviewer_username TEXT;
    reviewer_avatar TEXT;
    review_preview TEXT;
BEGIN
    -- Only notify when status changes from hidden/pending to published
    IF OLD.status != 'published' AND NEW.status = 'published' AND OLD.reviewer_id != NEW.reviewed_user_id THEN
        -- Get reviewer details
        SELECT username, avatar_url INTO reviewer_username, reviewer_avatar
        FROM profiles 
        WHERE id = NEW.reviewer_id;
        
        -- Create review preview
        review_preview := LEFT(NEW.comment, 50);
        IF LENGTH(NEW.comment) > 50 THEN
            review_preview := review_preview || '...';
        END IF;
        
        -- Create notification
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.reviewed_user_id,
            'review',
            CASE 
                WHEN NEW.rating >= 4 THEN 'New Positive Review! ⭐'
                WHEN NEW.rating = 3 THEN 'New Review ⭐'
                ELSE 'New Review'
            END,
            COALESCE(reviewer_username, 'Someone') || ' rated you ' || NEW.rating || ' stars: "' || review_preview || '"',
            jsonb_build_object(
                'reviewer_id', NEW.reviewer_id,
                'reviewer_username', COALESCE(reviewer_username, 'Unknown User'),
                'reviewer_avatar', reviewer_avatar,
                'review_id', NEW.id,
                'rating', NEW.rating,
                'comment', NEW.comment,
                'listing_id', NEW.listing_id,
                'transaction_id', NEW.transaction_id,
                'created_at', NEW.created_at
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for published reviews
DROP TRIGGER IF EXISTS trigger_review_published_notification ON reviews;
CREATE TRIGGER trigger_review_published_notification
    AFTER UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION create_review_published_notification();

-- =============================================
-- ADD TRANSACTION CONFIRMATION NOTIFICATIONS
-- =============================================

-- Create notification function for transaction confirmations
CREATE OR REPLACE FUNCTION create_transaction_confirmation_notification()
RETURNS TRIGGER AS $$
DECLARE
    buyer_username TEXT;
    seller_username TEXT;
    listing_title TEXT;
    other_party_id UUID;
    other_party_username TEXT;
    confirmer_username TEXT;
BEGIN
    -- Get transaction details
    SELECT 
        bp.username, sp.username, l.title
    INTO 
        buyer_username, seller_username, listing_title
    FROM meetup_transactions t
    LEFT JOIN profiles bp ON bp.id = t.buyer_id
    LEFT JOIN profiles sp ON sp.id = t.seller_id
    LEFT JOIN listings l ON l.id = t.listing_id
    WHERE t.id = NEW.id;

    -- Buyer confirmation notification to seller
    IF OLD.buyer_confirmed_at IS NULL AND NEW.buyer_confirmed_at IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.seller_id,
            'transaction',
            'Transaction Confirmed ✅',
            COALESCE(buyer_username, 'Buyer') || ' confirmed the transaction for "' || COALESCE(listing_title, 'your item') || '"',
            jsonb_build_object(
                'transaction_id', NEW.id,
                'listing_id', NEW.listing_id,
                'listing_title', listing_title,
                'buyer_id', NEW.buyer_id,
                'buyer_username', buyer_username,
                'confirmed_by', 'buyer',
                'amount', NEW.agreed_price,
                'both_confirmed', (NEW.seller_confirmed_at IS NOT NULL),
                'confirmed_at', NEW.buyer_confirmed_at
            )
        );
    END IF;

    -- Seller confirmation notification to buyer
    IF OLD.seller_confirmed_at IS NULL AND NEW.seller_confirmed_at IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, body, data)
        VALUES (
            NEW.buyer_id,
            'transaction',
            'Transaction Confirmed ✅',
            COALESCE(seller_username, 'Seller') || ' confirmed the transaction for "' || COALESCE(listing_title, 'the item') || '"',
            jsonb_build_object(
                'transaction_id', NEW.id,
                'listing_id', NEW.listing_id,
                'listing_title', listing_title,
                'seller_id', NEW.seller_id,
                'seller_username', seller_username,
                'confirmed_by', 'seller',
                'amount', NEW.agreed_price,
                'both_confirmed', (NEW.buyer_confirmed_at IS NOT NULL),
                'confirmed_at', NEW.seller_confirmed_at
            )
        );
    END IF;

    -- Both parties confirmed - notify both
    IF OLD.buyer_confirmed_at IS NULL OR OLD.seller_confirmed_at IS NULL THEN
        IF NEW.buyer_confirmed_at IS NOT NULL AND NEW.seller_confirmed_at IS NOT NULL THEN
            -- Notify buyer
            INSERT INTO notifications (user_id, type, title, body, data)
            VALUES (
                NEW.buyer_id,
                'transaction',
                'Transaction Complete! 🎉',
                'Both parties confirmed the transaction for "' || COALESCE(listing_title, 'the item') || '". You can now leave a review!',
                jsonb_build_object(
                    'transaction_id', NEW.id,
                    'listing_id', NEW.listing_id,
                    'listing_title', listing_title,
                    'amount', NEW.agreed_price,
                    'both_confirmed', true,
                    'can_review', true
                )
            );

            -- Notify seller
            INSERT INTO notifications (user_id, type, title, body, data)
            VALUES (
                NEW.seller_id,
                'transaction',
                'Transaction Complete! 🎉',
                'Both parties confirmed the transaction for "' || COALESCE(listing_title, 'your item') || '". You can now leave a review!',
                jsonb_build_object(
                    'transaction_id', NEW.id,
                    'listing_id', NEW.listing_id,
                    'listing_title', listing_title,
                    'amount', NEW.agreed_price,
                    'both_confirmed', true,
                    'can_review', true
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for transaction confirmations
DROP TRIGGER IF EXISTS trigger_transaction_confirmation_notification ON meetup_transactions;
CREATE TRIGGER trigger_transaction_confirmation_notification
    AFTER UPDATE ON meetup_transactions
    FOR EACH ROW
    WHEN (OLD.buyer_confirmed_at IS DISTINCT FROM NEW.buyer_confirmed_at 
       OR OLD.seller_confirmed_at IS DISTINCT FROM NEW.seller_confirmed_at)
    EXECUTE FUNCTION create_transaction_confirmation_notification();

-- =============================================
-- ADD COMMENTS
-- =============================================

COMMENT ON FUNCTION create_review_notification IS 
'Creates notification when a user receives a new review with rating and preview';

COMMENT ON FUNCTION create_review_published_notification IS 
'Creates notification when a hidden review becomes published';

COMMENT ON FUNCTION create_transaction_confirmation_notification IS 
'Creates notifications when transaction confirmations occur';

