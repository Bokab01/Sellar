-- =============================================
-- CRITICAL FIX: FUNCTIONS AND TRIGGERS CORRECTED
-- This replaces 13_functions_and_triggers.sql with corrected field references
-- =============================================

-- =============================================
-- AUTHENTICATION TRIGGER FUNCTION (CORRECTED)
-- =============================================

-- Function to handle new user registration (corrected to match exact app fields)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile for new user with EXACT field names the app expects
    INSERT INTO profiles (
        id,
        first_name,
        last_name,
        full_name,
        email,
        phone,
        location,
        is_business,
        credit_balance,
        rating,
        total_sales,
        total_reviews,
        is_verified,
        is_online,
        last_seen,
        response_time
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'firstName',
        NEW.raw_user_meta_data->>'lastName',
        COALESCE(
            NULLIF(TRIM(CONCAT(
                COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
                ' ',
                COALESCE(NEW.raw_user_meta_data->>'lastName', '')
            )), ''),
            'User'
        ),
        NEW.email,
        normalize_phone_number(NEW.raw_user_meta_data->>'phone'),
        COALESCE(NEW.raw_user_meta_data->>'location', 'Accra, Greater Accra'),
        COALESCE((NEW.raw_user_meta_data->>'is_business')::boolean, false),
        0, -- credit_balance starts at 0
        0.00, -- rating starts at 0
        0, -- total_sales starts at 0
        0, -- total_reviews starts at 0
        false, -- is_verified starts as false
        true, -- is_online starts as true
        NOW(), -- last_seen is now
        'within_hours' -- default response_time
    );
    
    -- Generate unique username
    UPDATE profiles 
    SET username = generate_unique_username(
        COALESCE(
            NEW.raw_user_meta_data->>'firstName',
            split_part(NEW.email, '@', 1)
        )
    )
    WHERE id = NEW.id;
    
    -- Create user settings with defaults
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id);
    
    -- Create user credits record
    INSERT INTO user_credits (user_id, balance)
    VALUES (NEW.id, 0);
    
    -- Create notification preferences
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id);
    
    -- Create user reputation record
    INSERT INTO user_reputation (user_id)
    VALUES (NEW.id);
    
    -- Log security event
    INSERT INTO security_events (
        user_id,
        event_type,
        email,
        metadata
    )
    VALUES (
        NEW.id,
        'signup_attempt',
        NEW.email,
        jsonb_build_object(
            'email_confirmed', NEW.email_confirmed_at IS NOT NULL,
            'signup_method', 'email'
        )
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        INSERT INTO security_events (
            user_id,
            event_type,
            email,
            metadata
        )
        VALUES (
            NEW.id,
            'signup_attempt',
            NEW.email,
            jsonb_build_object(
                'error', SQLERRM,
                'error_code', SQLSTATE
            )
        );
        
        -- Still return NEW to allow user creation in auth.users
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =============================================
-- PROFILE UPDATE FUNCTIONS (CORRECTED)
-- =============================================

-- Function to update profile completion percentage (corrected field names)
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 20;
BEGIN
    -- Calculate completion score based on filled fields (using correct field names)
    IF NEW.first_name IS NOT NULL AND NEW.first_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.last_name IS NOT NULL AND NEW.last_name != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.email IS NOT NULL AND NEW.email != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '' THEN
        completion_score := completion_score + 2; -- Avatar is worth more
    END IF;
    
    IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.location IS NOT NULL AND NEW.location != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.date_of_birth IS NOT NULL THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.gender IS NOT NULL THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.professional_title IS NOT NULL AND NEW.professional_title != '' THEN
        completion_score := completion_score + 1;
    END IF;
    
    IF NEW.years_of_experience IS NOT NULL THEN
        completion_score := completion_score + 1;
    END IF;
    
    -- Verification bonuses
    IF NEW.phone_verified = true THEN
        completion_score := completion_score + 2;
    END IF;
    
    IF NEW.email_verified = true THEN
        completion_score := completion_score + 2;
    END IF;
    
    IF NEW.identity_verified = true THEN
        completion_score := completion_score + 3;
    END IF;
    
    -- Business profile bonuses
    IF NEW.is_business = true THEN
        IF NEW.business_name IS NOT NULL AND NEW.business_name != '' THEN
            completion_score := completion_score + 1;
        END IF;
        
        IF NEW.business_type IS NOT NULL AND NEW.business_type != '' THEN
            completion_score := completion_score + 1;
        END IF;
        
        IF NEW.business_description IS NOT NULL AND NEW.business_description != '' THEN
            completion_score := completion_score + 1;
        END IF;
        
        IF NEW.business_verified = true THEN
            completion_score := completion_score + 3;
        END IF;
    END IF;
    
    -- Calculate percentage (cap at 100%)
    -- Note: We don't have profile_completion_percentage in the corrected schema
    -- but we can add it if needed or store it elsewhere
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profile completion
CREATE TRIGGER update_profile_completion_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- =============================================
-- LISTING MANAGEMENT FUNCTIONS (CORRECTED)
-- =============================================

-- Function to update listing counts (corrected field names)
CREATE OR REPLACE FUNCTION update_listing_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment user's listing count (using correct field names)
        UPDATE profiles 
        SET 
            listings_count = listings_count + 1,
            total_sales = total_sales + 1
        WHERE id = NEW.user_id;
        
        -- Log user activity
        PERFORM log_user_activity(
            NEW.user_id,
            'create_listing',
            'listing',
            NEW.id,
            jsonb_build_object('title', NEW.title, 'category_id', NEW.category_id)
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
                -- Increment sales count (using correct field name)
                UPDATE profiles 
                SET total_sales = total_sales + 1
                WHERE id = NEW.user_id;
                
                -- Log activity
                PERFORM log_user_activity(
                    NEW.user_id,
                    'listing_sold',
                    'listing',
                    NEW.id,
                    jsonb_build_object('title', NEW.title, 'price', NEW.price)
                );
            END IF;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement user's listing count
        UPDATE profiles 
        SET listings_count = listings_count - 1
        WHERE id = OLD.user_id;
        
        -- Log activity
        PERFORM log_user_activity(
            OLD.user_id,
            'delete_listing',
            'listing',
            OLD.id,
            jsonb_build_object('title', OLD.title)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for listing counts
CREATE TRIGGER update_listing_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_counts();

-- =============================================
-- REVIEW SYSTEM FUNCTIONS (CORRECTED)
-- =============================================

-- Function to update user ratings (corrected field names)
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Calculate new average rating (using correct field name: reviewed_id)
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*)
        INTO avg_rating, review_count
        FROM reviews 
        WHERE reviewed_id = NEW.reviewed_id 
        AND status = 'published';
        
        -- Update profile (using correct field names: rating, total_reviews)
        UPDATE profiles 
        SET 
            rating = COALESCE(avg_rating, 0),
            total_reviews = review_count
        WHERE id = NEW.reviewed_id;
        
        -- Log activity
        PERFORM log_user_activity(
            NEW.reviewer_id,
            'review',
            'user',
            NEW.reviewed_id,
            jsonb_build_object('rating', NEW.rating, 'listing_id', NEW.listing_id)
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Recalculate if rating changed or status changed
        IF OLD.rating != NEW.rating OR OLD.status != NEW.status THEN
            SELECT 
                ROUND(AVG(rating), 2),
                COUNT(*)
            INTO avg_rating, review_count
            FROM reviews 
            WHERE reviewed_id = NEW.reviewed_id 
            AND status = 'published';
            
            UPDATE profiles 
            SET 
                rating = COALESCE(avg_rating, 0),
                total_reviews = review_count
            WHERE id = NEW.reviewed_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Recalculate after deletion
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*)
        INTO avg_rating, review_count
        FROM reviews 
        WHERE reviewed_id = OLD.reviewed_id 
        AND status = 'published';
        
        UPDATE profiles 
        SET 
            rating = COALESCE(avg_rating, 0),
            total_reviews = review_count
        WHERE id = OLD.reviewed_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for user ratings
CREATE TRIGGER update_user_ratings_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ratings();

-- =============================================
-- CONVERSATION FUNCTIONS (CORRECTED)
-- =============================================

-- Function to update conversation last message (corrected field names)
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the conversation with the new message info (using correct field names)
    UPDATE conversations 
    SET 
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        last_message_preview = CASE 
            WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 100)
            WHEN NEW.message_type = 'image' THEN '📷 Image'
            WHEN NEW.message_type = 'file' THEN '📎 File'
            WHEN NEW.message_type = 'offer' THEN '💰 Offer'
            WHEN NEW.message_type = 'location' THEN '📍 Location'
            ELSE 'Message'
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation last message
CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function to update unread counts (corrected field names)
CREATE OR REPLACE FUNCTION update_unread_counts()
RETURNS TRIGGER AS $$
DECLARE
    conv_record RECORD;
BEGIN
    -- Get conversation details (using correct field names)
    SELECT * INTO conv_record FROM conversations WHERE id = NEW.conversation_id;
    
    -- Increment unread count for the recipient (using correct field names)
    IF NEW.sender_id = conv_record.participant_1 THEN
        UPDATE conversations 
        SET participant_2_unread_count = participant_2_unread_count + 1
        WHERE id = NEW.conversation_id;
    ELSE
        UPDATE conversations 
        SET participant_1_unread_count = participant_1_unread_count + 1
        WHERE id = NEW.conversation_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update unread counts
CREATE TRIGGER update_unread_counts_trigger
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_unread_counts();

-- Function to get or create conversation (corrected field names)
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    user1_id UUID, 
    user2_id UUID, 
    listing_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
    ordered_user1_id UUID;
    ordered_user2_id UUID;
BEGIN
    -- Ensure consistent ordering of participants
    IF user1_id < user2_id THEN
        ordered_user1_id := user1_id;
        ordered_user2_id := user2_id;
    ELSE
        ordered_user1_id := user2_id;
        ordered_user2_id := user1_id;
    END IF;
    
    -- Try to find existing conversation (using correct field names)
    SELECT id INTO conv_id 
    FROM conversations 
    WHERE 
        participant_1 = ordered_user1_id 
        AND participant_2 = ordered_user2_id
        AND (listing_id IS NULL OR conversations.listing_id = listing_id);
    
    -- If not found, create new conversation (using correct field names)
    IF conv_id IS NULL THEN
        INSERT INTO conversations (participant_1, participant_2, listing_id)
        VALUES (ordered_user1_id, ordered_user2_id, listing_id)
        RETURNING id INTO conv_id;
    END IF;
    
    RETURN conv_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SOCIAL FUNCTIONS (CORRECTED)
-- =============================================

-- Function to update follow counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count for the followed user
        UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
        -- Increment following count for the follower
        UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count for the unfollowed user
        UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
        -- Decrement following count for the unfollower
        UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for follow counts
CREATE TRIGGER update_follow_counts_trigger
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_counts();

-- Function to update post counts (corrected field names)
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for post counts
CREATE TRIGGER update_post_counts_trigger
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_counts();

-- Function to update like counts (corrected field names)
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF NEW.comment_id IS NOT NULL THEN
            UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.post_id IS NOT NULL THEN
            UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        ELSIF OLD.comment_id IS NOT NULL THEN
            UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for like counts
CREATE TRIGGER update_like_counts_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_counts();

-- Function to update comment counts (corrected field names)
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment counts
CREATE TRIGGER update_comment_counts_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_counts();

-- Success message
SELECT 'CRITICAL FIX: Functions and triggers corrected for exact field name matches!' as status;
