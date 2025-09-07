-- =============================================
-- SELLAR MOBILE APP - FUNCTIONS AND TRIGGERS
-- Migration 13: Database functions and triggers for authentication and business logic
-- =============================================

-- =============================================
-- AUTHENTICATION TRIGGER FUNCTION
-- =============================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile for new user
    INSERT INTO profiles (
        id,
        full_name,
        email,
        phone,
        location,
        is_business
    )
    VALUES (
        NEW.id,
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
        COALESCE((NEW.raw_user_meta_data->>'is_business')::boolean, false)
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
-- PROFILE UPDATE FUNCTIONS
-- =============================================

-- Function to update profile completion percentage
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 20; -- Total number of profile fields we consider
BEGIN
    -- Calculate completion score based on filled fields
    IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN
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
    NEW.profile_completion_percentage := LEAST(100, (completion_score * 100 / total_fields));
    NEW.last_profile_update := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profile completion
CREATE TRIGGER update_profile_completion_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- =============================================
-- LISTING MANAGEMENT FUNCTIONS
-- =============================================

-- Function to update listing counts
CREATE OR REPLACE FUNCTION update_listing_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment user's listing count
        UPDATE profiles 
        SET 
            listings_count = listings_count + 1,
            total_listings = total_listings + 1
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
                -- Increment sales count
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

-- Function to auto-generate listing slug
CREATE OR REPLACE FUNCTION auto_generate_listing_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_listing_slug(NEW.title, NEW.id);
    END IF;
    
    -- Set published_at when status changes to active
    IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
        NEW.published_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for listing slug generation
CREATE TRIGGER auto_generate_listing_slug_trigger
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_listing_slug();

-- =============================================
-- REVIEW SYSTEM FUNCTIONS
-- =============================================

-- Function to update user ratings
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Calculate new average rating
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*)
        INTO avg_rating, review_count
        FROM reviews 
        WHERE reviewed_user_id = NEW.reviewed_user_id 
        AND status = 'published';
        
        -- Update profile
        UPDATE profiles 
        SET 
            rating_average = COALESCE(avg_rating, 0),
            rating_count = review_count
        WHERE id = NEW.reviewed_user_id;
        
        -- Log activity
        PERFORM log_user_activity(
            NEW.reviewer_id,
            'review',
            'user',
            NEW.reviewed_user_id,
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
            WHERE reviewed_user_id = NEW.reviewed_user_id 
            AND status = 'published';
            
            UPDATE profiles 
            SET 
                rating_average = COALESCE(avg_rating, 0),
                rating_count = review_count
            WHERE id = NEW.reviewed_user_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Recalculate after deletion
        SELECT 
            ROUND(AVG(rating), 2),
            COUNT(*)
        INTO avg_rating, review_count
        FROM reviews 
        WHERE reviewed_user_id = OLD.reviewed_user_id 
        AND status = 'published';
        
        UPDATE profiles 
        SET 
            rating_average = COALESCE(avg_rating, 0),
            rating_count = review_count
        WHERE id = OLD.reviewed_user_id;
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
-- SECURITY AND AUDIT FUNCTIONS
-- =============================================

-- Function to log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes JSONB := '{}';
    old_values JSONB := '{}';
    new_values JSONB := '{}';
BEGIN
    -- Track significant changes
    IF OLD.email != NEW.email THEN
        old_values := old_values || jsonb_build_object('email', OLD.email);
        new_values := new_values || jsonb_build_object('email', NEW.email);
    END IF;
    
    IF OLD.phone != NEW.phone THEN
        old_values := old_values || jsonb_build_object('phone', OLD.phone);
        new_values := new_values || jsonb_build_object('phone', NEW.phone);
    END IF;
    
    IF OLD.full_name != NEW.full_name THEN
        old_values := old_values || jsonb_build_object('full_name', OLD.full_name);
        new_values := new_values || jsonb_build_object('full_name', NEW.full_name);
    END IF;
    
    -- Log if there are significant changes
    IF old_values != '{}' THEN
        INSERT INTO profile_activity_log (
            user_id,
            activity_type,
            description,
            old_values,
            new_values
        )
        VALUES (
            NEW.id,
            'profile_updated',
            'Profile information updated',
            old_values,
            new_values
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profile change logging
CREATE TRIGGER log_profile_changes_trigger
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_profile_changes();

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Function to cleanup expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Cleanup expired verification requests
    DELETE FROM user_verification 
    WHERE expires_at < NOW() AND status = 'pending';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Cleanup old search analytics (older than 1 year)
    DELETE FROM search_analytics 
    WHERE searched_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Cleanup old user activity logs (older than 2 years)
    DELETE FROM user_activity_log 
    WHERE created_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Cleanup old security events (older than 1 year)
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND severity IN ('info', 'warning');
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Cleanup old listing views (older than 6 months)
    DELETE FROM listing_views 
    WHERE viewed_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Cleanup expired notifications (older than 3 months)
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '3 months'
    AND is_read = true;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    -- Cleanup inactive device tokens (not used for 6 months)
    DELETE FROM device_tokens 
    WHERE last_used_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cleanup_count := cleanup_count + temp_count;
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_statistics(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_listings', COUNT(CASE WHEN l.user_id = p_user_id THEN 1 END),
        'active_listings', COUNT(CASE WHEN l.user_id = p_user_id AND l.status = 'active' THEN 1 END),
        'sold_listings', COUNT(CASE WHEN l.user_id = p_user_id AND l.status = 'sold' THEN 1 END),
        'total_views', COALESCE(SUM(l.view_count), 0),
        'total_favorites', COALESCE(SUM(l.favorite_count), 0),
        'average_rating', p.rating_average,
        'total_reviews', p.rating_count,
        'followers_count', p.followers_count,
        'following_count', p.following_count,
        'verification_level', p.verification_level,
        'trust_score', ur.trust_score,
        'member_since', p.created_at
    ) INTO stats
    FROM profiles p
    LEFT JOIN listings l ON l.user_id = p.id
    LEFT JOIN user_reputation ur ON ur.user_id = p.id
    WHERE p.id = p_user_id
    GROUP BY p.id, ur.trust_score;
    
    RETURN COALESCE(stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to search listings with filters
CREATE OR REPLACE FUNCTION search_listings(
    p_query TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_condition TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    price DECIMAL,
    currency TEXT,
    condition TEXT,
    location TEXT,
    images TEXT[],
    user_id UUID,
    username TEXT,
    user_avatar TEXT,
    user_rating DECIMAL,
    view_count INTEGER,
    favorite_count INTEGER,
    created_at TIMESTAMPTZ,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.currency,
        l.condition,
        l.location,
        l.images,
        l.user_id,
        p.username,
        p.avatar_url,
        p.rating_average,
        l.view_count,
        l.favorite_count,
        l.created_at,
        NULL::DECIMAL as distance_km -- TODO: Implement geolocation distance
    FROM listings l
    JOIN profiles p ON l.user_id = p.id
    WHERE 
        l.status = 'active'
        AND l.moderation_status = 'approved'
        AND (p_query IS NULL OR l.search_vector @@ plainto_tsquery('english', p_query))
        AND (p_category_id IS NULL OR l.category_id = p_category_id)
        AND (p_location IS NULL OR l.location ILIKE '%' || p_location || '%')
        AND (p_min_price IS NULL OR l.price >= p_min_price)
        AND (p_max_price IS NULL OR l.price <= p_max_price)
        AND (p_condition IS NULL OR l.condition = p_condition)
        AND (p_user_id IS NULL OR l.user_id != p_user_id) -- Exclude own listings
    ORDER BY 
        CASE WHEN p_query IS NOT NULL THEN ts_rank(l.search_vector, plainto_tsquery('english', p_query)) END DESC,
        l.is_featured DESC,
        l.is_boosted DESC,
        l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Functions and triggers created successfully!' as status;
