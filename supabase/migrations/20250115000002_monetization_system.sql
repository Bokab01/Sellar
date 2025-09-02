-- =============================================
-- MONETIZATION SYSTEM MIGRATION
-- Phase 1: Core Backend Infrastructure
-- =============================================

-- =============================================
-- USER_CREDITS TABLE (Credit Balance Management)
-- =============================================

CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Credit Balance
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER DEFAULT 0,
    lifetime_spent INTEGER DEFAULT 0,
    lifetime_purchased INTEGER DEFAULT 0,
    
    -- Free Credits Tracking
    free_credits_used INTEGER DEFAULT 0,
    free_listings_count INTEGER DEFAULT 0, -- Track free listings (first 5 are free)
    
    -- Credit History Summary
    last_purchase_at TIMESTAMPTZ,
    last_spend_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for user_credits
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON user_credits(balance);

-- =============================================
-- CREDIT_TRANSACTIONS TABLE (Credit Movement History)
-- =============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction Details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'purchase', 'refund', 'bonus', 'penalty')),
    amount INTEGER NOT NULL CHECK (amount != 0), -- Positive for earn/purchase, negative for spend
    
    -- Balance Tracking
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    -- Transaction Context
    description TEXT NOT NULL,
    reference_type TEXT, -- 'listing', 'feature_purchase', 'credit_package', etc.
    reference_id UUID, -- ID of related entity
    
    -- Purchase/Payment Details (for purchase transactions)
    payment_reference TEXT,
    payment_method TEXT,
    payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

-- =============================================
-- CREDIT_PURCHASES TABLE (Credit Package Purchases)
-- =============================================

CREATE TABLE IF NOT EXISTS credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Package Details
    package_name TEXT NOT NULL, -- 'starter', 'seller', 'pro', 'business'
    credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
    price_amount DECIMAL(10,2) NOT NULL CHECK (price_amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    
    -- Discount Information
    original_price DECIMAL(10,2),
    discount_percentage INTEGER DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Purchase Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    
    -- Payment Details
    payment_method TEXT NOT NULL, -- 'card', 'mobile_money'
    payment_reference TEXT UNIQUE NOT NULL, -- Paystack reference
    paystack_transaction_id TEXT,
    
    -- Payment Provider Details
    provider_response JSONB DEFAULT '{}'::jsonb,
    webhook_verified BOOLEAN DEFAULT FALSE,
    webhook_verified_at TIMESTAMPTZ,
    
    -- Fulfillment
    credits_awarded BOOLEAN DEFAULT FALSE,
    credits_awarded_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Add indexes for credit_purchases
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_payment_reference ON credit_purchases(payment_reference);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_created_at ON credit_purchases(created_at DESC);

-- =============================================
-- FEATURE_PURCHASES TABLE (Individual Feature Purchases)
-- =============================================

CREATE TABLE IF NOT EXISTS feature_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    
    -- Feature Details
    feature_type TEXT NOT NULL CHECK (feature_type IN (
        'pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 
        'ad_refresh', 'auto_refresh_30d', 'priority_support_7d',
        'featured_listing_7d', 'homepage_banner_24h', 'social_media_boost'
    )),
    feature_name TEXT NOT NULL,
    credits_cost INTEGER NOT NULL CHECK (credits_cost > 0),
    
    -- Feature Duration
    duration_hours INTEGER, -- NULL for instant features like ad_refresh
    starts_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    
    -- Purchase Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'refunded')),
    
    -- Feature Metadata
    feature_config JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for feature_purchases
CREATE INDEX IF NOT EXISTS idx_feature_purchases_user_id ON feature_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_listing_id ON feature_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_feature_type ON feature_purchases(feature_type);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_status ON feature_purchases(status);
CREATE INDEX IF NOT EXISTS idx_feature_purchases_expires_at ON feature_purchases(expires_at);

-- =============================================
-- SUBSCRIPTION_PLANS TABLE (Subscription Plan Definitions)
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan Details
    plan_name TEXT NOT NULL UNIQUE, -- 'basic', 'premium', 'business'
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL CHECK (price_monthly >= 0),
    price_yearly DECIMAL(10,2) NOT NULL CHECK (price_yearly >= 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    
    -- Plan Features
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    credit_allowance INTEGER DEFAULT 0, -- Monthly credit allowance
    
    -- Plan Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for subscription_plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_name ON subscription_plans(plan_name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort_order ON subscription_plans(sort_order);

-- =============================================
-- USER_SUBSCRIPTIONS TABLE (User Subscription Status)
-- =============================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT NOT NULL,
    
    -- Subscription Details
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'yearly')),
    
    -- Subscription Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    
    -- Billing Cycle
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    
    -- Payment Details
    payment_method TEXT,
    payment_reference TEXT,
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint for one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_unique_active 
ON user_subscriptions(user_id) WHERE status = 'active';

-- Add indexes for user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- =============================================
-- PAYSTACK_TRANSACTIONS TABLE (Payment Gateway Integration)
-- =============================================

CREATE TABLE IF NOT EXISTS paystack_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction Identification
    reference TEXT UNIQUE NOT NULL, -- Our internal reference
    paystack_reference TEXT UNIQUE, -- Paystack's reference
    transaction_id TEXT, -- Paystack transaction ID
    
    -- Transaction Details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'GHS',
    
    -- Payment Method
    payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'mobile_money', 'bank_transfer')),
    payment_channel TEXT, -- 'mtn', 'vodafone', 'airteltigo', 'visa', 'mastercard', etc.
    
    -- Transaction Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'abandoned', 'cancelled')),
    
    -- Customer Details
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Related Purchase
    purchase_type TEXT NOT NULL CHECK (purchase_type IN ('credit_package', 'subscription', 'feature')),
    purchase_id TEXT, -- ID of related purchase record (can be package name or UUID)
    
    -- Paystack Response Data
    paystack_response JSONB DEFAULT '{}'::jsonb,
    authorization_code TEXT, -- For recurring payments
    
    -- Webhook Processing
    webhook_received BOOLEAN DEFAULT FALSE,
    webhook_processed BOOLEAN DEFAULT FALSE,
    webhook_processed_at TIMESTAMPTZ,
    webhook_signature_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ
);

-- Add indexes for paystack_transactions
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_user_id ON paystack_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_reference ON paystack_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_paystack_reference ON paystack_transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_status ON paystack_transactions(status);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_created_at ON paystack_transactions(created_at DESC);

-- =============================================
-- PLAN_ENTITLEMENTS TABLE (Plan Feature Entitlements)
-- =============================================

CREATE TABLE IF NOT EXISTS plan_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE NOT NULL,
    
    -- Entitlement Details
    feature_key TEXT NOT NULL, -- 'max_listings', 'priority_support', 'advanced_analytics', etc.
    feature_value TEXT NOT NULL, -- 'unlimited', '100', 'true', etc.
    feature_type TEXT NOT NULL CHECK (feature_type IN ('boolean', 'number', 'string', 'json')),
    
    -- Entitlement Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure unique feature per plan
    UNIQUE(plan_id, feature_key)
);

-- Add indexes for plan_entitlements
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan_id ON plan_entitlements(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_feature_key ON plan_entitlements(feature_key);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BASIC RLS POLICIES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can view own credit transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can view own credit purchases" ON credit_purchases;
DROP POLICY IF EXISTS "Users can view own feature purchases" ON feature_purchases;
DROP POLICY IF EXISTS "Subscription plans are viewable by everyone" ON subscription_plans;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view own transactions" ON paystack_transactions;
DROP POLICY IF EXISTS "Plan entitlements are viewable for active plans" ON plan_entitlements;

-- User Credits policies
CREATE POLICY "Users can view own credits" ON user_credits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON user_credits
FOR UPDATE USING (auth.uid() = user_id);

-- Credit Transactions policies
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
FOR SELECT USING (auth.uid() = user_id);

-- Credit Purchases policies
CREATE POLICY "Users can view own credit purchases" ON credit_purchases
FOR SELECT USING (auth.uid() = user_id);

-- Feature Purchases policies
CREATE POLICY "Users can view own feature purchases" ON feature_purchases
FOR SELECT USING (auth.uid() = user_id);

-- Subscription Plans policies (public read)
CREATE POLICY "Subscription plans are viewable by everyone" ON subscription_plans
FOR SELECT USING (is_active = TRUE);

-- User Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
FOR SELECT USING (auth.uid() = user_id);

-- Paystack Transactions policies
CREATE POLICY "Users can view own transactions" ON paystack_transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON paystack_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Plan Entitlements policies (public read for active plans)
CREATE POLICY "Plan entitlements are viewable for active plans" ON plan_entitlements
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM subscription_plans 
        WHERE subscription_plans.id = plan_entitlements.plan_id 
        AND subscription_plans.is_active = TRUE
    )
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_purchases_updated_at BEFORE UPDATE ON credit_purchases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_purchases_updated_at BEFORE UPDATE ON feature_purchases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paystack_transactions_updated_at BEFORE UPDATE ON paystack_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_entitlements_updated_at BEFORE UPDATE ON plan_entitlements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, display_name, description, price_monthly, price_yearly, features) VALUES
('basic', 'Basic Plan', 'Perfect for casual sellers', 0.00, 0.00, '{"max_listings": 10, "basic_support": true, "standard_features": true}'::jsonb),
('premium', 'Premium Plan', 'For serious sellers', 29.99, 299.99, '{"max_listings": 100, "priority_support": true, "advanced_analytics": true, "featured_listings": 5}'::jsonb),
('business', 'Business Plan', 'For businesses and power sellers', 99.99, 999.99, '{"max_listings": "unlimited", "priority_support": true, "advanced_analytics": true, "featured_listings": "unlimited", "api_access": true, "custom_branding": true}'::jsonb)
ON CONFLICT (plan_name) DO NOTHING;

-- Insert plan entitlements
INSERT INTO plan_entitlements (plan_id, feature_key, feature_value, feature_type, description) VALUES
-- Basic Plan Entitlements
((SELECT id FROM subscription_plans WHERE plan_name = 'basic'), 'max_listings', '10', 'number', 'Maximum number of active listings'),
((SELECT id FROM subscription_plans WHERE plan_name = 'basic'), 'basic_support', 'true', 'boolean', 'Access to basic customer support'),
((SELECT id FROM subscription_plans WHERE plan_name = 'basic'), 'monthly_credits', '50', 'number', 'Monthly credit allowance'),

-- Premium Plan Entitlements
((SELECT id FROM subscription_plans WHERE plan_name = 'premium'), 'max_listings', '100', 'number', 'Maximum number of active listings'),
((SELECT id FROM subscription_plans WHERE plan_name = 'premium'), 'priority_support', 'true', 'boolean', 'Priority customer support'),
((SELECT id FROM subscription_plans WHERE plan_name = 'premium'), 'advanced_analytics', 'true', 'boolean', 'Advanced listing analytics'),
((SELECT id FROM subscription_plans WHERE plan_name = 'premium'), 'featured_listings', '5', 'number', 'Monthly featured listing allowance'),
((SELECT id FROM subscription_plans WHERE plan_name = 'premium'), 'monthly_credits', '200', 'number', 'Monthly credit allowance'),

-- Business Plan Entitlements
((SELECT id FROM subscription_plans WHERE plan_name = 'business'), 'max_listings', 'unlimited', 'string', 'Unlimited active listings'),
((SELECT id FROM subscription_plans WHERE plan_name = 'business'), 'priority_support', 'true', 'boolean', 'Priority customer support'),
((SELECT id FROM subscription_plans WHERE plan_name = 'business'), 'advanced_analytics', 'true', 'boolean', 'Advanced listing analytics'),
((SELECT id FROM subscription_plans WHERE plan_name = 'business'), 'featured_listings', 'unlimited', 'string', 'Unlimited featured listings'),
((SELECT id FROM subscription_plans WHERE plan_name = 'business'), 'api_access', 'true', 'boolean', 'API access for integrations'),
((SELECT id FROM subscription_plans WHERE plan_name = 'business'), 'custom_branding', 'true', 'boolean', 'Custom branding options'),
((SELECT id FROM subscription_plans WHERE plan_name = 'business'), 'monthly_credits', '500', 'number', 'Monthly credit allowance')
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify monetization tables were created
SELECT 'Monetization system migration completed successfully' as status;

-- Show table information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('user_credits', 'credit_transactions', 'credit_purchases', 'feature_purchases', 'subscription_plans', 'user_subscriptions', 'paystack_transactions', 'plan_entitlements')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
