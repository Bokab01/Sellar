-- =============================================
-- FIX REVIEW COUNTS AND ADD AUTOMATIC UPDATES
-- =============================================

-- First, let's update all existing profile total_reviews to match actual published reviews
UPDATE profiles 
SET total_reviews = (
    SELECT COUNT(*) 
    FROM reviews 
    WHERE reviews.reviewed_user_id = profiles.id 
    AND reviews.status = 'published'
);

-- Update all existing profile ratings to match actual published reviews
UPDATE profiles 
SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM reviews 
    WHERE reviews.reviewed_user_id = profiles.id 
    AND reviews.status = 'published'
)
WHERE id IN (
    SELECT DISTINCT reviewed_user_id 
    FROM reviews 
    WHERE status = 'published'
);

-- Set rating to 0 for users with no published reviews
UPDATE profiles 
SET rating = 0
WHERE id NOT IN (
    SELECT DISTINCT reviewed_user_id 
    FROM reviews 
    WHERE status = 'published'
);

-- Create a function to update user review statistics
CREATE OR REPLACE FUNCTION update_user_review_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_reviews INTEGER;
    v_average_rating DECIMAL(3,1);
BEGIN
    -- Get count of published reviews
    SELECT COUNT(*) INTO v_total_reviews
    FROM reviews 
    WHERE reviewed_user_id = p_user_id 
    AND status = 'published';
    
    -- Get average rating of published reviews
    SELECT ROUND(AVG(rating)::numeric, 1) INTO v_average_rating
    FROM reviews 
    WHERE reviewed_user_id = p_user_id 
    AND status = 'published';
    
    -- Update profile with new stats
    UPDATE profiles 
    SET 
        total_reviews = v_total_reviews,
        rating = COALESCE(v_average_rating, 0)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically update review stats
CREATE OR REPLACE FUNCTION trigger_update_user_review_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stats for the reviewed user
    PERFORM update_user_review_stats(COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id));
    
    -- If this is an update that changes the status, also update the reviewer's stats
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM update_user_review_stats(COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update review stats when reviews change
DROP TRIGGER IF EXISTS trigger_reviews_update_user_stats ON reviews;
CREATE TRIGGER trigger_reviews_update_user_stats
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_user_review_stats();

-- Verify the fix by showing some sample data
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.total_reviews as profile_total_reviews,
    p.rating as profile_rating,
    COUNT(r.id) as actual_published_reviews,
    ROUND(AVG(r.rating)::numeric, 1) as actual_average_rating
FROM profiles p
LEFT JOIN reviews r ON p.id = r.reviewed_user_id AND r.status = 'published'
GROUP BY p.id, p.first_name, p.last_name, p.total_reviews, p.rating
HAVING COUNT(r.id) > 0
ORDER BY actual_published_reviews DESC
LIMIT 10;

-- Show summary of the fix
SELECT 
    'Review Count Fix Summary' as status,
    COUNT(*) as total_profiles,
    SUM(CASE WHEN total_reviews > 0 THEN 1 ELSE 0 END) as profiles_with_reviews,
    AVG(total_reviews) as average_reviews_per_profile
FROM profiles;
