-- =============================================
-- FIX: Add missing feature_purchases table
-- =============================================

-- Create the feature_purchases table
CREATE TABLE IF NOT EXISTS feature_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_name VARCHAR(200), -- Human-readable feature name
    credits_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add feature_name column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_purchases' 
        AND column_name = 'feature_name'
    ) THEN
        ALTER TABLE feature_purchases ADD COLUMN feature_name VARCHAR(200);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_purchases_user_id ON feature_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_listing_id ON feature_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_feature_key ON feature_purchases(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_status ON feature_purchases(status);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_expires_at ON feature_purchases(expires_at);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_activated_at ON feature_purchases(activated_at);

-- Add updated_at trigger (drop existing first if it exists)
DROP TRIGGER IF EXISTS update_feature_purchases_updated_at ON feature_purchases;
CREATE TRIGGER update_feature_purchases_updated_at 
    BEFORE UPDATE ON feature_purchases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- UPDATE: Enhanced purchase_feature function
-- =============================================

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
-- UTILITY: Function to get active features
-- =============================================

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_active_features(UUID, UUID);

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
-- UTILITY: Function to cleanup expired features
-- =============================================

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS cleanup_expired_features();

CREATE OR REPLACE FUNCTION cleanup_expired_features()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired features
    UPDATE feature_purchases 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Also cleanup expired listing effects
    UPDATE listings 
    SET 
        boost_until = NULL,
        highlight_until = NULL,
        urgent_until = NULL,
        spotlight_until = NULL,
        updated_at = NOW()
    WHERE 
        (boost_until IS NOT NULL AND boost_until <= NOW()) OR
        (highlight_until IS NOT NULL AND highlight_until <= NOW()) OR
        (urgent_until IS NOT NULL AND urgent_until <= NOW()) OR
        (spotlight_until IS NOT NULL AND spotlight_until <= NOW());
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VERIFICATION: Check if everything is working
-- =============================================

-- Test that the table exists and has the right structure
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_purchases') THEN
        RAISE EXCEPTION 'feature_purchases table was not created successfully';
    END IF;
    
    -- Check if indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'feature_purchases' AND indexname = 'idx_feature_purchases_user_id') THEN
        RAISE EXCEPTION 'feature_purchases indexes were not created successfully';
    END IF;
    
    RAISE NOTICE 'SUCCESS: feature_purchases table and indexes created successfully';
END $$;

-- Show table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'feature_purchases' 
ORDER BY ordinal_position;

-- Show indexes for verification
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'feature_purchases';

-- =============================================
-- CLEANUP: Remove any test data (optional)
-- =============================================

-- Uncomment the following line if you want to start with a clean feature_purchases table
-- DELETE FROM feature_purchases WHERE created_at < NOW();

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Feature purchases system setup completed successfully!';
END $$;
