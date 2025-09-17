-- =============================================
-- BUSINESS CREDIT PRICING SYSTEM MIGRATION
-- =============================================
-- This migration implements the dual pricing system for business users
-- Business users get massive discounts: Pulse Boost 1 credit, Category Spotlight 2 credits, Mega Pulse 3 credits

-- =============================================
-- 1. CREATE FEATURE CATALOG TABLE (IF NOT EXISTS)
-- =============================================

-- Create feature_catalog table if it doesn't exist
CREATE TABLE IF NOT EXISTS feature_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    regular_credits INTEGER NOT NULL,
    business_credits INTEGER,
    duration VARCHAR(50),
    icon VARCHAR(10),
    business_auto_refresh VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add business credit pricing columns if table already exists
DO $$
BEGIN
    -- Add business_credits column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'business_credits'
    ) THEN
        ALTER TABLE feature_catalog ADD COLUMN business_credits INTEGER;
        RAISE NOTICE 'Added business_credits column to feature_catalog table';
    END IF;

    -- Add regular_credits column if it doesn't exist (rename existing credits column)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'regular_credits'
    ) THEN
        -- If credits column exists, rename it to regular_credits
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'feature_catalog' 
            AND column_name = 'credits'
        ) THEN
            ALTER TABLE feature_catalog RENAME COLUMN credits TO regular_credits;
            RAISE NOTICE 'Renamed credits column to regular_credits in feature_catalog table';
        ELSE
            ALTER TABLE feature_catalog ADD COLUMN regular_credits INTEGER;
            RAISE NOTICE 'Added regular_credits column to feature_catalog table';
        END IF;
    END IF;

    -- Add business_auto_refresh column for auto-refresh settings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feature_catalog' 
        AND column_name = 'business_auto_refresh'
    ) THEN
        ALTER TABLE feature_catalog ADD COLUMN business_auto_refresh VARCHAR(50);
        RAISE NOTICE 'Added business_auto_refresh column to feature_catalog table';
    END IF;
END $$;

-- =============================================
-- 2. UPDATE EXISTING FEATURE PRICING
-- =============================================

-- Clear existing data and insert new dual pricing structure
DELETE FROM feature_catalog;

INSERT INTO feature_catalog (
    feature_key, 
    name, 
    description, 
    regular_credits, 
    business_credits, 
    duration, 
    icon,
    business_auto_refresh,
    is_active
) VALUES
-- Core visibility features with massive business discounts + auto-refresh
('pulse_boost_24h', 'Pulse Boost', '24-hour visibility boost + auto-refresh every 2h', 15, 1, '24 hours', '⚡', '2 hours', true),
('mega_pulse_7d', 'Mega Pulse', '7-day mega visibility boost + auto-refresh every 2h', 50, 3, '7 days', '🚀', '2 hours', true),
('category_spotlight_3d', 'Category Spotlight', '3-day category spotlight + auto-refresh every 2h', 35, 2, '3 days', '🎯', '2 hours', true),
('ad_refresh', 'Ad Refresh', 'Refresh listing to top + auto-refresh every 2h', 5, 0, 'instant', '🔄', '2 hours', true),

-- Value-added features with business discounts (no auto-refresh)
('listing_highlight', 'Listing Highlight', 'Highlight listing with colored border', 10, 1, '7 days', '✨', NULL, true),
('urgent_badge', 'Urgent Badge', 'Add "Urgent Sale" badge to listing', 8, 1, '3 days', '🔥', NULL, true);

-- =============================================
-- 3. CREATE AUTO-REFRESH SYSTEM TABLES
-- =============================================

-- Table to track auto-refresh schedules for business users
CREATE TABLE IF NOT EXISTS business_auto_refresh (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    last_refresh_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_refresh_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
    is_active BOOLEAN DEFAULT true,
    refresh_interval_hours INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- Index for efficient auto-refresh queries
CREATE INDEX IF NOT EXISTS idx_business_auto_refresh_next_refresh 
ON business_auto_refresh(next_refresh_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_business_auto_refresh_user_listing 
ON business_auto_refresh(user_id, listing_id);

-- =============================================
-- 4. CREATE BUSINESS CREDIT FUNCTIONS
-- =============================================

-- Function to get feature cost based on user type
CREATE OR REPLACE FUNCTION get_feature_cost(
    p_feature_key VARCHAR(100),
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    feature_record RECORD;
    is_business_user BOOLEAN;
BEGIN
    -- Check if user has active business subscription
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Business'
        AND us.current_period_end > NOW()
    ) INTO is_business_user;

    -- Get feature pricing
    SELECT regular_credits, business_credits 
    INTO feature_record
    FROM feature_catalog 
    WHERE feature_key = p_feature_key AND is_active = true;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Return appropriate cost
    IF is_business_user AND feature_record.business_credits IS NOT NULL THEN
        RETURN feature_record.business_credits;
    ELSE
        RETURN feature_record.regular_credits;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to setup auto-refresh for business users (only for boosted listings)
CREATE OR REPLACE FUNCTION setup_business_auto_refresh(
    p_user_id UUID,
    p_listing_id UUID,
    p_feature_key VARCHAR(100) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_business_user BOOLEAN;
    feature_has_auto_refresh BOOLEAN := false;
BEGIN
    -- Check if user has active business subscription
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND sp.name = 'Sellar Business'
        AND us.current_period_end > NOW()
    ) INTO is_business_user;

    IF NOT is_business_user THEN
        RETURN false;
    END IF;

    -- Only setup auto-refresh for features that have it enabled
    IF p_feature_key IS NOT NULL THEN
        SELECT business_auto_refresh IS NOT NULL 
        INTO feature_has_auto_refresh
        FROM feature_catalog 
        WHERE feature_key = p_feature_key;
    END IF;

    -- Only insert auto-refresh if feature supports it
    IF feature_has_auto_refresh THEN
        INSERT INTO business_auto_refresh (user_id, listing_id)
        VALUES (p_user_id, p_listing_id)
        ON CONFLICT (user_id, listing_id) 
        DO UPDATE SET 
            is_active = true,
            next_refresh_at = NOW() + INTERVAL '2 hours',
            updated_at = NOW();
        
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process auto-refresh (only for listings with active boosts)
CREATE OR REPLACE FUNCTION process_business_auto_refresh()
RETURNS TABLE (
    processed_count INTEGER,
    error_count INTEGER
) AS $$
DECLARE
    refresh_record RECORD;
    processed INTEGER := 0;
    errors INTEGER := 0;
    has_active_boost BOOLEAN;
BEGIN
    -- Process all due auto-refreshes, but only for listings with active boosts
    FOR refresh_record IN 
        SELECT bar.id, bar.user_id, bar.listing_id, bar.refresh_interval_hours
        FROM business_auto_refresh bar
        JOIN listings l ON bar.listing_id = l.id
        WHERE bar.is_active = true 
        AND bar.next_refresh_at <= NOW()
        AND l.status = 'active'
    LOOP
        BEGIN
            -- Check if listing has any active boost features
            SELECT EXISTS(
                SELECT 1 FROM feature_purchases fp
                WHERE fp.listing_id = refresh_record.listing_id
                AND fp.status = 'active'
                AND fp.expires_at > NOW()
                AND fp.feature_key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh')
            ) INTO has_active_boost;

            -- Only refresh if listing has active boost
            IF has_active_boost THEN
                -- Update listing's updated_at to refresh its position
                UPDATE listings 
                SET updated_at = NOW()
                WHERE id = refresh_record.listing_id;

                -- Update next refresh time
                UPDATE business_auto_refresh
                SET 
                    last_refresh_at = NOW(),
                    next_refresh_at = NOW() + (refresh_record.refresh_interval_hours || ' hours')::INTERVAL,
                    updated_at = NOW()
                WHERE id = refresh_record.id;

                processed := processed + 1;
            ELSE
                -- Deactivate auto-refresh for listings without active boosts
                UPDATE business_auto_refresh
                SET 
                    is_active = false,
                    updated_at = NOW()
                WHERE id = refresh_record.id;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            errors := errors + 1;
            -- Log error but continue processing
            RAISE NOTICE 'Error processing auto-refresh for listing %: %', refresh_record.listing_id, SQLERRM;
        END;
    END LOOP;

    RETURN QUERY SELECT processed, errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. UPDATE EXISTING FUNCTIONS
-- =============================================

-- Update purchase_feature function to use new pricing
CREATE OR REPLACE FUNCTION purchase_feature(
    p_user_id UUID,
    p_feature_key VARCHAR(100),
    p_listing_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error TEXT, feature_id UUID) AS $$
DECLARE
    feature_cost INTEGER;
    current_balance INTEGER;
    new_feature_id UUID;
    result_success BOOLEAN := false;
    result_balance INTEGER := 0;
    result_error TEXT := NULL;
BEGIN
    -- Get feature cost based on user type
    SELECT get_feature_cost(p_feature_key, p_user_id) INTO feature_cost;
    
    IF feature_cost IS NULL THEN
        RETURN QUERY SELECT false, 0, 'Feature not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Get current balance
    SELECT balance INTO current_balance 
    FROM user_credits 
    WHERE user_id = p_user_id;

    IF current_balance IS NULL THEN
        RETURN QUERY SELECT false, 0, 'User credits not found'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Check if user has enough credits (free features have 0 cost)
    IF feature_cost > 0 AND current_balance < feature_cost THEN
        RETURN QUERY SELECT false, current_balance, 'Insufficient credits'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Deduct credits if feature has cost
    IF feature_cost > 0 THEN
        UPDATE user_credits 
        SET 
            balance = balance - feature_cost,
            lifetime_spent = lifetime_spent + feature_cost,
            updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING balance INTO result_balance;
    ELSE
        result_balance := current_balance;
    END IF;

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
        (SELECT name FROM feature_catalog WHERE feature_key = p_feature_key),
        feature_cost,
        'active',
        NOW(),
        CASE 
            WHEN p_feature_key = 'pulse_boost_24h' THEN NOW() + INTERVAL '24 hours'
            WHEN p_feature_key = 'mega_pulse_7d' THEN NOW() + INTERVAL '7 days'
            WHEN p_feature_key = 'category_spotlight_3d' THEN NOW() + INTERVAL '3 days'
            WHEN p_feature_key = 'listing_highlight' THEN NOW() + INTERVAL '7 days'
            WHEN p_feature_key = 'urgent_badge' THEN NOW() + INTERVAL '3 days'
            ELSE NOW() + INTERVAL '1 day'
        END,
        p_metadata
    ) RETURNING id INTO new_feature_id;

    -- Setup auto-refresh for business users if feature supports it
    IF p_listing_id IS NOT NULL THEN
        PERFORM setup_business_auto_refresh(p_user_id, p_listing_id, p_feature_key);
    END IF;

    -- Log credit transaction if credits were spent
    IF feature_cost > 0 THEN
        INSERT INTO credit_transactions (
            user_id,
            type,
            amount,
            balance_before,
            balance_after,
            reference_id,
            reference_type,
            metadata
        ) VALUES (
            p_user_id,
            'spent',
            feature_cost,
            current_balance,
            result_balance,
            new_feature_id,
            'feature_purchase',
            jsonb_build_object(
                'feature_key', p_feature_key,
                'listing_id', p_listing_id
            )
        );
    END IF;

    RETURN QUERY SELECT true, result_balance, NULL::TEXT, new_feature_id;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, current_balance, SQLERRM::TEXT, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Feature catalog indexes
CREATE INDEX IF NOT EXISTS idx_feature_catalog_feature_key ON feature_catalog(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_catalog_is_active ON feature_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_feature_catalog_business_credits 
ON feature_catalog(business_credits) WHERE business_credits IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feature_catalog_regular_credits 
ON feature_catalog(regular_credits) WHERE regular_credits IS NOT NULL;

-- Add updated_at trigger for feature_catalog
DROP TRIGGER IF EXISTS update_feature_catalog_updated_at ON feature_catalog;
CREATE TRIGGER update_feature_catalog_updated_at
    BEFORE UPDATE ON feature_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. SETUP RLS POLICIES
-- =============================================

-- Enable RLS on feature_catalog table
ALTER TABLE feature_catalog ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read feature catalog
CREATE POLICY "Anyone can view feature catalog" ON feature_catalog
    FOR SELECT USING (true);

-- Enable RLS on business_auto_refresh table
ALTER TABLE business_auto_refresh ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own auto-refresh schedules
CREATE POLICY "Users can view own auto-refresh schedules" ON business_auto_refresh
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only update their own auto-refresh schedules  
CREATE POLICY "Users can update own auto-refresh schedules" ON business_auto_refresh
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: System can insert auto-refresh schedules
CREATE POLICY "System can insert auto-refresh schedules" ON business_auto_refresh
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 8. GRANT PERMISSIONS
-- =============================================

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_feature_cost(VARCHAR(100), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_business_auto_refresh(UUID, UUID, VARCHAR(100)) TO authenticated;
GRANT EXECUTE ON FUNCTION process_business_auto_refresh() TO service_role;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'BUSINESS CREDIT PRICING MIGRATION COMPLETE!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'New Business Credit Pricing:';
    RAISE NOTICE '- Pulse Boost: 1 credit (was 15) - 93%% discount + auto-refresh!';
    RAISE NOTICE '- Category Spotlight: 2 credits (was 35) - 94%% discount + auto-refresh!'; 
    RAISE NOTICE '- Mega Pulse: 3 credits (was 50) - 94%% discount + auto-refresh!';
    RAISE NOTICE '- Ad Refresh: FREE + auto-refresh every 2 hours!';
    RAISE NOTICE '- Listing Highlight: 1 credit (was 10) - 90%% discount!';
    RAISE NOTICE '- Urgent Badge: 1 credit (was 8) - 87%% discount!';
    RAISE NOTICE '';
    RAISE NOTICE 'SMART AUTO-REFRESH SYSTEM:';
    RAISE NOTICE '- Only listings with ACTIVE BOOSTS get auto-refresh';
    RAISE NOTICE '- Non-boosted listings stay in chronological order';
    RAISE NOTICE '- 120 credits are ESSENTIAL for auto-refresh benefits!';
    RAISE NOTICE '';
    RAISE NOTICE 'Business Plan Value with 120 credits:';
    RAISE NOTICE '- 120 Pulse Boosts (2,880 hours + auto-refresh)';
    RAISE NOTICE '- 60 Category Spotlights (180 days + auto-refresh)';
    RAISE NOTICE '- 40 Mega Pulses (280 days + auto-refresh)';
    RAISE NOTICE '- Unlimited FREE ad-refresh + auto-refresh';
    RAISE NOTICE '- Total regular credit value: GHS 5,900+';
    RAISE NOTICE '- EXCLUSIVE auto-refresh for boosted listings only!';
    RAISE NOTICE '==============================================';
END $$;