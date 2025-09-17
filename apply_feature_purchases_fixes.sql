-- =============================================
-- APPLY FEATURE PURCHASES FIXES TO EXISTING DATABASE
-- =============================================
-- This script applies all the fixes for feature_name column and function conflicts
-- Run this on your existing Supabase database

-- =============================================
-- 1. ADD MISSING FEATURE_NAME COLUMN
-- =============================================

-- Add feature_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_purchases' 
        AND column_name = 'feature_name'
    ) THEN
        ALTER TABLE feature_purchases ADD COLUMN feature_name VARCHAR(200);
        RAISE NOTICE 'Added feature_name column to feature_purchases table';
    ELSE
        RAISE NOTICE 'feature_name column already exists in feature_purchases table';
    END IF;
END $$;

-- =============================================
-- 2. UPDATE PURCHASE_FEATURE FUNCTION
-- =============================================

-- Update the purchase_feature function to include feature_name
CREATE OR REPLACE FUNCTION purchase_feature(
    p_user_id UUID,
    p_feature_key VARCHAR(100),
    p_credits INTEGER,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT) AS $$
DECLARE
    result_success BOOLEAN;
    result_balance INTEGER;
    result_error TEXT;
    p_listing_id UUID;
BEGIN
    -- Extract listing_id from metadata if provided
    p_listing_id := (p_metadata->>'listing_id')::UUID;
    
    -- Use the spend_user_credits function
    SELECT * INTO result_success, result_balance, result_error
    FROM spend_user_credits(
        p_user_id, 
        p_credits, 
        'Feature purchase: ' || p_feature_key,
        p_listing_id,
        'feature_purchase'
    );
    
    -- If credit deduction successful, create feature purchase record and apply effects
    IF result_success THEN
        -- Create feature purchase record
        INSERT INTO feature_purchases (
            user_id,
            listing_id,
            feature_key,
            feature_name,
            credits_spent,
            status,
            activated_at,
            expires_at,
            metadata
        ) VALUES (
            p_user_id,
            p_listing_id,
            p_feature_key,
            CASE 
                WHEN p_feature_key = 'pulse_boost_24h' THEN 'Pulse Boost'
                WHEN p_feature_key = 'mega_pulse_7d' THEN 'Mega Pulse'
                WHEN p_feature_key = 'category_spotlight_3d' THEN 'Category Spotlight'
                WHEN p_feature_key = 'listing_highlight' THEN 'Listing Highlight'
                WHEN p_feature_key = 'urgent_badge' THEN 'Urgent Badge'
                WHEN p_feature_key = 'ad_refresh' THEN 'Ad Refresh'
                ELSE p_feature_key -- Fallback to key if not mapped
            END,
            p_credits,
            'active',
            NOW(),
            CASE 
                WHEN p_feature_key = 'pulse_boost_24h' THEN NOW() + INTERVAL '24 hours'
                WHEN p_feature_key = 'mega_pulse_7d' THEN NOW() + INTERVAL '7 days'
                WHEN p_feature_key = 'category_spotlight_3d' THEN NOW() + INTERVAL '3 days'
                WHEN p_feature_key = 'listing_highlight' THEN NOW() + INTERVAL '7 days'
                WHEN p_feature_key = 'urgent_badge' THEN NOW() + INTERVAL '3 days'
                WHEN p_feature_key = 'ad_refresh' THEN NULL -- Instant effect
                ELSE NOW() + INTERVAL '30 days' -- Default duration
            END,
            p_metadata
        );
        
        -- Apply the feature effect
        PERFORM apply_feature_effect(p_user_id, p_feature_key, p_listing_id, p_metadata);
    END IF;
    
    RETURN QUERY SELECT result_success, result_balance, result_error;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. FIX APPLY_FEATURE_EFFECT FUNCTION
-- =============================================

-- Remove duplicate INSERT from apply_feature_effect function
CREATE OR REPLACE FUNCTION apply_feature_effect(
    p_user_id UUID,
    p_feature_key VARCHAR(100),
    p_listing_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
    feature_duration INTERVAL;
    boost_multiplier INTEGER;
BEGIN
    -- Apply feature effects based on feature key
    CASE p_feature_key
        WHEN 'pulse_boost_24h' THEN
            -- 24-hour visibility boost
            UPDATE listings 
            SET 
                boost_until = NOW() + INTERVAL '24 hours',
                boost_score = 200,
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'mega_pulse_7d' THEN
            -- 7-day mega boost
            UPDATE listings 
            SET 
                boost_until = NOW() + INTERVAL '7 days',
                boost_score = 500,
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'category_spotlight_3d' THEN
            -- 3-day category spotlight
            UPDATE listings 
            SET 
                spotlight_until = NOW() + INTERVAL '3 days',
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'listing_highlight' THEN
            -- 7-day listing highlight
            UPDATE listings 
            SET 
                highlight_until = NOW() + INTERVAL '7 days',
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'urgent_badge' THEN
            -- 3-day urgent badge
            UPDATE listings 
            SET 
                urgent_until = NOW() + INTERVAL '3 days',
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        WHEN 'ad_refresh' THEN
            -- Refresh listing (bump created_at)
            UPDATE listings 
            SET 
                created_at = NOW(),
                updated_at = NOW()
            WHERE id = p_listing_id AND user_id = p_user_id;
            
        ELSE
            -- Unknown feature, log but don't fail
            RAISE NOTICE 'Unknown feature key: %', p_feature_key;
    END CASE;
    
    -- Feature effects are applied to listings table above
    -- The feature_purchases record is created by the purchase_feature function
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. ADD GET_USER_ACTIVE_FEATURES FUNCTION
-- =============================================

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_active_features(UUID, UUID);

-- Create the function with the correct return type including feature_name
CREATE OR REPLACE FUNCTION get_user_active_features(
    p_user_id UUID,
    p_listing_id UUID DEFAULT NULL
)
RETURNS TABLE (
    feature_key VARCHAR(100),
    feature_name VARCHAR(200),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    credits_spent INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fp.feature_key,
        fp.feature_name,
        fp.activated_at,
        fp.expires_at,
        fp.credits_spent
    FROM feature_purchases fp
    WHERE fp.user_id = p_user_id
    AND fp.status = 'active'
    AND (p_listing_id IS NULL OR fp.listing_id = p_listing_id OR fp.listing_id IS NULL)
    AND (fp.expires_at IS NULL OR fp.expires_at > NOW())
    ORDER BY fp.activated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. UPDATE EXISTING FEATURE_PURCHASES RECORDS
-- =============================================

-- Update existing records to have proper feature_name values
UPDATE feature_purchases 
SET feature_name = CASE 
    WHEN feature_key = 'pulse_boost_24h' THEN 'Pulse Boost'
    WHEN feature_key = 'mega_pulse_7d' THEN 'Mega Pulse'
    WHEN feature_key = 'category_spotlight_3d' THEN 'Category Spotlight'
    WHEN feature_key = 'listing_highlight' THEN 'Listing Highlight'
    WHEN feature_key = 'urgent_badge' THEN 'Urgent Badge'
    WHEN feature_key = 'ad_refresh' THEN 'Ad Refresh'
    ELSE feature_key -- Fallback to key if not mapped
END
WHERE feature_name IS NULL;

-- =============================================
-- 6. VERIFICATION
-- =============================================

-- Verify the fixes
DO $$
DECLARE
    column_exists BOOLEAN;
    function_exists BOOLEAN;
    updated_records INTEGER;
BEGIN
    -- Check if feature_name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_purchases' 
        AND column_name = 'feature_name'
    ) INTO column_exists;
    
    -- Check if get_user_active_features function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_user_active_features'
        AND routine_type = 'FUNCTION'
    ) INTO function_exists;
    
    -- Count updated records
    SELECT COUNT(*) FROM feature_purchases WHERE feature_name IS NOT NULL INTO updated_records;
    
    -- Report results
    RAISE NOTICE '=== FEATURE PURCHASES FIXES APPLIED ===';
    RAISE NOTICE 'feature_name column exists: %', column_exists;
    RAISE NOTICE 'get_user_active_features function exists: %', function_exists;
    RAISE NOTICE 'Records with feature_name: %', updated_records;
    RAISE NOTICE 'purchase_feature function updated: TRUE';
    RAISE NOTICE 'apply_feature_effect function fixed: TRUE';
    RAISE NOTICE '=== ALL FIXES COMPLETED SUCCESSFULLY ===';
END $$;
