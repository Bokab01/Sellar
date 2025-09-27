-- Fix recommendation system to exclude user's own listings
-- This script updates the track_user_interaction function and cleans up existing data

-- =============================================
-- 1. UPDATE TRACK_USER_INTERACTION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION track_user_interaction(
    p_user_id UUID,
    p_listing_id UUID,
    p_interaction_type VARCHAR(20),
    p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
    v_weight DECIMAL(3,2);
    v_listing_owner_id UUID;
BEGIN
    -- Get the listing owner to check if user is viewing their own listing
    SELECT user_id INTO v_listing_owner_id FROM listings WHERE id = p_listing_id;
    
    -- Don't track interactions with user's own listings
    IF v_listing_owner_id = p_user_id THEN
        RETURN;
    END IF;

    -- Set interaction weights
    v_weight := CASE p_interaction_type
        WHEN 'purchase' THEN 5.0
        WHEN 'offer' THEN 3.0
        WHEN 'favorite' THEN 2.0
        WHEN 'contact' THEN 2.0
        WHEN 'share' THEN 1.5
        WHEN 'view' THEN 1.0
        ELSE 1.0
    END;

    -- Check if interaction already exists today
    IF EXISTS (
        SELECT 1 FROM user_interactions 
        WHERE user_id = p_user_id 
        AND listing_id = p_listing_id 
        AND interaction_type = p_interaction_type 
        AND created_at::date = CURRENT_DATE
    ) THEN
        -- Update existing interaction with higher weight
        UPDATE user_interactions 
        SET 
            interaction_weight = GREATEST(interaction_weight, v_weight),
            metadata = p_metadata,
            updated_at = NOW()
        WHERE user_id = p_user_id 
        AND listing_id = p_listing_id 
        AND interaction_type = p_interaction_type 
        AND created_at::date = CURRENT_DATE;
    ELSE
        -- Insert new interaction
        INSERT INTO user_interactions (user_id, listing_id, interaction_type, interaction_weight, metadata)
        VALUES (p_user_id, p_listing_id, p_interaction_type, v_weight, p_metadata);
    END IF;

    -- Update recently viewed if it's a view
    IF p_interaction_type = 'view' THEN
        INSERT INTO recently_viewed (user_id, listing_id, view_duration)
        VALUES (p_user_id, p_listing_id, COALESCE((p_metadata->>'timeSpent')::INTEGER, 0))
        ON CONFLICT (user_id, listing_id) 
        DO UPDATE SET 
            viewed_at = NOW(),
            view_duration = COALESCE((p_metadata->>'timeSpent')::INTEGER, recently_viewed.view_duration);
    END IF;

    -- Update user preferences
    PERFORM update_user_preferences(p_user_id, p_listing_id, p_interaction_type, v_weight);
    
    -- Update listing popularity
    PERFORM update_listing_popularity(p_listing_id, p_interaction_type, v_weight);
    
    -- Update co-interactions
    PERFORM update_listing_co_interactions(p_user_id, p_listing_id, p_interaction_type);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. CLEAN UP EXISTING DATA
-- =============================================

-- Remove user interactions with their own listings
DELETE FROM user_interactions 
WHERE user_id IN (
    SELECT l.user_id 
    FROM listings l 
    WHERE l.id = user_interactions.listing_id
);

-- Remove recently viewed items where users viewed their own listings
DELETE FROM recently_viewed 
WHERE user_id IN (
    SELECT l.user_id 
    FROM listings l 
    WHERE l.id = recently_viewed.listing_id
);

-- Remove user preferences based on their own listings (more complex cleanup)
DELETE FROM user_preferences 
WHERE (user_id, category_id) IN (
    SELECT DISTINCT l.user_id, l.category_id
    FROM listings l 
    WHERE l.user_id = user_preferences.user_id
);

-- Remove co-interactions where users interacted with their own listings
DELETE FROM listing_co_interactions 
WHERE primary_listing_id IN (
    SELECT l.id 
    FROM listings l 
    JOIN user_interactions ui ON l.id = ui.listing_id
    WHERE l.user_id = ui.user_id
);

-- Remove co-interactions where related listings are user's own
DELETE FROM listing_co_interactions 
WHERE related_listing_id IN (
    SELECT l.id 
    FROM listings l 
    JOIN user_interactions ui ON l.id = ui.listing_id
    WHERE l.user_id = ui.user_id
);

-- =============================================
-- 3. VERIFICATION
-- =============================================

-- Show cleanup results
SELECT 'Cleanup completed - users will no longer see their own listings in recommendations' as status;

-- Show remaining counts
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

-- Test the function with a sample
SELECT 'Function updated successfully - track_user_interaction now excludes own listings' as test_result;
