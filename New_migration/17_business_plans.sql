-- =============================================
-- SELLAR MOBILE APP - BUSINESS PLANS
-- Migration 17: Business subscription plans and entitlements
-- =============================================

-- =============================================
-- UPDATE EXISTING SUBSCRIPTION PLANS
-- =============================================

-- Clear existing basic plans and replace with business plans
DELETE FROM subscription_plans WHERE name IN ('Basic', 'Pro', 'Business');

-- =============================================
-- INSERT BUSINESS SUBSCRIPTION PLANS
-- =============================================

-- Starter Business Plan (GHS 100/month)
INSERT INTO subscription_plans (
    name, 
    description, 
    price, 
    currency, 
    billing_period, 
    features, 
    credits_included, 
    listings_limit, 
    featured_listings_limit, 
    priority_support, 
    is_active, 
    is_popular, 
    sort_order
) VALUES (
    'Starter Business',
    'Perfect for small businesses',
    100.00,
    'GHS',
    'monthly',
    '["20 boost credits (3-day boosts)", "Up to 20 active listings", "Business badge", "Basic analytics"]',
    20,
    20,
    0,
    false,
    true,
    false,
    1
);

-- Pro Business Plan (GHS 250/month) - POPULAR
INSERT INTO subscription_plans (
    name, 
    description, 
    price, 
    currency, 
    billing_period, 
    features, 
    credits_included, 
    listings_limit, 
    featured_listings_limit, 
    priority_support, 
    is_active, 
    is_popular, 
    sort_order
) VALUES (
    'Pro Business',
    'For growing businesses',
    250.00,
    'GHS',
    'monthly',
    '["80 boost credits (flexible mix)", "Unlimited listings", "Business + Priority Seller badges", "Auto-boost (3 days)", "Advanced analytics"]',
    80,
    NULL, -- unlimited
    0,
    false,
    true,
    true, -- POPULAR
    2
);

-- Premium Business Plan (GHS 400/month)
INSERT INTO subscription_plans (
    name, 
    description, 
    price, 
    currency, 
    billing_period, 
    features, 
    credits_included, 
    listings_limit, 
    featured_listings_limit, 
    priority_support, 
    is_active, 
    is_popular, 
    sort_order
) VALUES (
    'Premium Business',
    'Complete business solution',
    400.00,
    'GHS',
    'monthly',
    '["150 boost credits (flexible)", "Unlimited listings", "Premium branding & homepage placement", "Full analytics suite", "Priority support & account manager", "Sponsored posts"]',
    150,
    NULL, -- unlimited
    NULL, -- unlimited featured
    true, -- priority support
    true,
    false,
    3
);

-- =============================================
-- INSERT PLAN ENTITLEMENTS
-- =============================================

-- Starter Business Plan Entitlements
INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'max_listings',
    20,
    true
FROM subscription_plans sp WHERE sp.name = 'Starter Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'boost_credits',
    20,
    true
FROM subscription_plans sp WHERE sp.name = 'Starter Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'business_badge',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Starter Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'analytics_level',
    1, -- basic
    true
FROM subscription_plans sp WHERE sp.name = 'Starter Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'auto_boost',
    NULL,
    false
FROM subscription_plans sp WHERE sp.name = 'Starter Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'priority_support',
    NULL,
    false
FROM subscription_plans sp WHERE sp.name = 'Starter Business';

-- Pro Business Plan Entitlements
INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'max_listings',
    NULL, -- unlimited
    true
FROM subscription_plans sp WHERE sp.name = 'Pro Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'boost_credits',
    80,
    true
FROM subscription_plans sp WHERE sp.name = 'Pro Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'business_badge',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Pro Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'priority_seller_badge',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Pro Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'analytics_level',
    2, -- advanced
    true
FROM subscription_plans sp WHERE sp.name = 'Pro Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'auto_boost',
    3, -- 3 days
    true
FROM subscription_plans sp WHERE sp.name = 'Pro Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'priority_support',
    NULL,
    false
FROM subscription_plans sp WHERE sp.name = 'Pro Business';

-- Premium Business Plan Entitlements
INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'max_listings',
    NULL, -- unlimited
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'boost_credits',
    150,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'business_badge',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'priority_seller_badge',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'premium_badge',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'analytics_level',
    3, -- full
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'auto_boost',
    7, -- 7 days
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'priority_support',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'homepage_placement',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'account_manager',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

INSERT INTO plan_entitlements (plan_id, feature_type, feature_value, feature_enabled)
SELECT 
    sp.id,
    'sponsored_posts',
    NULL,
    true
FROM subscription_plans sp WHERE sp.name = 'Premium Business';

-- =============================================
-- BUSINESS PLAN FUNCTIONS
-- =============================================

-- Function to get user's business plan entitlements
CREATE OR REPLACE FUNCTION get_user_business_entitlements(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_subscription RECORD;
    v_entitlements JSON;
BEGIN
    -- Get user's active subscription
    SELECT us.*, sp.*
    INTO v_subscription
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id 
    AND us.status = 'active'
    AND us.current_period_end > NOW()
    ORDER BY us.created_at DESC
    LIMIT 1;
    
    IF v_subscription IS NULL THEN
        -- Return free user entitlements
        RETURN json_build_object(
            'plan_name', 'Free',
            'max_listings', 5,
            'boost_credits', 0,
            'business_badge', false,
            'priority_seller_badge', false,
            'premium_badge', false,
            'analytics_level', 0,
            'auto_boost', false,
            'priority_support', false,
            'homepage_placement', false,
            'account_manager', false,
            'sponsored_posts', false
        );
    END IF;
    
    -- Get plan entitlements
    SELECT json_object_agg(
        pe.feature_type, 
        CASE 
            WHEN pe.feature_value IS NOT NULL THEN pe.feature_value
            ELSE pe.feature_enabled
        END
    ) INTO v_entitlements
    FROM plan_entitlements pe
    WHERE pe.plan_id = v_subscription.plan_id;
    
    RETURN json_build_object(
        'plan_name', v_subscription.name,
        'plan_id', v_subscription.plan_id,
        'subscription_id', v_subscription.id,
        'current_period_end', v_subscription.current_period_end,
        'entitlements', COALESCE(v_entitlements, '{}'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has business plan
CREATE OR REPLACE FUNCTION has_business_plan(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_plan BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_user_id 
        AND us.status = 'active'
        AND us.current_period_end > NOW()
        AND sp.name IN ('Starter Business', 'Pro Business', 'Premium Business')
    ) INTO v_has_plan;
    
    RETURN COALESCE(v_has_plan, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's listing limit
CREATE OR REPLACE FUNCTION get_user_listing_limit(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    -- Get user's business plan entitlements
    SELECT (get_user_business_entitlements(p_user_id)->'entitlements'->>'max_listings')::INTEGER
    INTO v_limit;
    
    -- If no limit set (unlimited), return a very high number
    IF v_limit IS NULL THEN
        RETURN 999999;
    END IF;
    
    RETURN v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create more listings
CREATE OR REPLACE FUNCTION can_create_listing(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_current_count INTEGER;
BEGIN
    -- Get user's listing limit
    SELECT get_user_listing_limit(p_user_id) INTO v_limit;
    
    -- Get current active listings count
    SELECT COUNT(*) INTO v_current_count
    FROM listings
    WHERE user_id = p_user_id AND status = 'active';
    
    -- Check if under limit
    RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award monthly boost credits
CREATE OR REPLACE FUNCTION award_monthly_boost_credits()
RETURNS INTEGER AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_subscription RECORD;
    v_entitlement RECORD;
BEGIN
    -- Process all active business subscriptions
    FOR v_subscription IN 
        SELECT us.*, sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active'
        AND us.current_period_end > NOW()
        AND sp.name IN ('Starter Business', 'Pro Business', 'Premium Business')
    LOOP
        -- Get boost credits entitlement
        SELECT pe.feature_value INTO v_entitlement
        FROM plan_entitlements pe
        WHERE pe.plan_id = v_subscription.plan_id
        AND pe.feature_type = 'boost_credits';
        
        -- Award credits if entitlement exists
        IF v_entitlement.feature_value IS NOT NULL AND v_entitlement.feature_value > 0 THEN
            PERFORM add_user_credits(
                v_subscription.user_id,
                v_entitlement.feature_value,
                'Monthly boost credits from ' || v_subscription.plan_name || ' plan',
                'subscription',
                v_subscription.id
            );
            
            v_processed_count := v_processed_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- BUSINESS PLAN TRIGGERS
-- =============================================

-- Function to check listing limit before creating new listing
CREATE OR REPLACE FUNCTION check_listing_limit_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user can create more listings
    IF NOT can_create_listing(NEW.user_id) THEN
        RAISE EXCEPTION 'Listing limit exceeded. Upgrade to a business plan to create more listings.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for listing limit check
CREATE TRIGGER check_listing_limit_trigger
    BEFORE INSERT ON listings
    FOR EACH ROW
    EXECUTE FUNCTION check_listing_limit_before_insert();

-- =============================================
-- BUSINESS PLAN RLS POLICIES
-- =============================================

-- Enable RLS on plan_entitlements if not already enabled
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

-- Plan entitlements policies
CREATE POLICY "Anyone can view plan entitlements" ON plan_entitlements
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System can manage plan entitlements" ON plan_entitlements
    FOR ALL
    TO authenticated
    USING (true); -- System functions can manage entitlements

-- Success message
SELECT 'Business plans and entitlements created successfully!' as status;
