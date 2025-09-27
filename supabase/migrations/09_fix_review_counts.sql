-- =============================================
-- FIX REVIEW COUNTS AND ADD AUTOMATIC UPDATES
-- =============================================

-- This migration fixes existing review counts and adds automatic updates
-- Run this after the main schema migration to fix any existing data

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
