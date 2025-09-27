-- Clean up existing interactions where users have interacted with their own listings
-- This script removes any existing data that shouldn't be there

-- 1. Remove user interactions with their own listings
DELETE FROM user_interactions 
WHERE user_id IN (
    SELECT l.user_id 
    FROM listings l 
    WHERE l.id = user_interactions.listing_id
);

-- 2. Remove recently viewed items where users viewed their own listings
DELETE FROM recently_viewed 
WHERE user_id IN (
    SELECT l.user_id 
    FROM listings l 
    WHERE l.id = recently_viewed.listing_id
);

-- 3. Remove user preferences based on their own listings
DELETE FROM user_preferences 
WHERE user_id IN (
    SELECT l.user_id 
    FROM listings l 
    JOIN categories c ON l.category_id = c.id
    WHERE c.id = user_preferences.category_id
);

-- 4. Remove co-interactions where users interacted with their own listings
DELETE FROM listing_co_interactions 
WHERE primary_listing_id IN (
    SELECT l.id 
    FROM listings l 
    JOIN user_interactions ui ON l.id = ui.listing_id
    WHERE l.user_id = ui.user_id
);

-- 5. Remove co-interactions where related listings are user's own
DELETE FROM listing_co_interactions 
WHERE related_listing_id IN (
    SELECT l.id 
    FROM listings l 
    JOIN user_interactions ui ON l.id = ui.listing_id
    WHERE l.user_id = ui.user_id
);

-- 6. Show cleanup results
SELECT 'Cleanup completed' as status;

-- 7. Show remaining counts
SELECT 
    'user_interactions' as table_name,
    COUNT(*) as remaining_count
FROM user_interactions
UNION ALL
SELECT 
    'recently_viewed' as table_name,
    COUNT(*) as remaining_count
FROM recently_viewed
UNION ALL
SELECT 
    'user_preferences' as table_name,
    COUNT(*) as remaining_count
FROM user_preferences
UNION ALL
SELECT 
    'listing_co_interactions' as table_name,
    COUNT(*) as remaining_count
FROM listing_co_interactions;
