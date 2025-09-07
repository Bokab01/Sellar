-- =============================================
-- SELLAR MOBILE APP - MONETIZATION SYSTEM
-- Migration 05: Credits, payments, and subscriptions
-- =============================================

-- =============================================
-- USER CREDITS TABLE
-- =============================================

CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Credit Balance
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================
-- CREDIT TRANSACTIONS TABLE
-- =============================================

CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction Details
    type TEXT NOT NULL CHECK (type IN (
        'purchase', 'earned', 'spent', 'refund', 'bonus', 
        'referral', 'promotion', 'adjustment', 'withdrawal'
    )),
    amount INTEGER NOT NULL,
    
    -- Balance Tracking
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    -- Transaction Context
    description TEXT NOT NULL,
    reference_type TEXT CHECK (reference_type IN (
        'listing_boost', 'listing_promotion', 'feature_unlock', 
        'verification_fee', 'subscription', 'purchase', 'referral',
        'bonus', 'adjustment', 'withdrawal'
    )),
    reference_id UUID,
    
    -- Payment Information
    payment_method TEXT CHECK (payment_method IN ('paystack', 'mobile_money', 'bank_transfer', 'admin')),
    payment_reference TEXT,
    
    -- Status
    status transaction_status DEFAULT 'completed',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CREDIT PURCHASES TABLE
-- =============================================

CREATE TABLE credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Purchase Details
    credits_amount INTEGER NOT NULL,
    price_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    
    -- Payment Information
    payment_method TEXT NOT NULL CHECK (payment_method IN ('paystack', 'mobile_money', 'bank_transfer')),
    payment_reference TEXT UNIQUE,
    paystack_reference TEXT,
    
    -- Status
    status transaction_status DEFAULT 'pending',
    
    -- Payment Response
    payment_response JSONB DEFAULT '{}',
    
    -- Completion
    completed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYSTACK TRANSACTIONS TABLE
-- =============================================

CREATE TABLE paystack_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Paystack Information
    paystack_reference TEXT UNIQUE NOT NULL,
    paystack_transaction_id TEXT,
    
    -- Transaction Details
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
    
    -- Payment Information
    payment_method TEXT,
    channel TEXT,
    gateway_response TEXT,
    
    -- Customer Information
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Related Records
    credit_purchase_id UUID REFERENCES credit_purchases(id),
    
    -- Paystack Response
    paystack_response JSONB DEFAULT '{}',
    
    -- Verification
    verified_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTION PLANS TABLE
-- =============================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan Details
    name TEXT NOT NULL,
    description TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    
    -- Features
    features JSONB DEFAULT '[]',
    credits_included INTEGER DEFAULT 0,
    listings_limit INTEGER,
    featured_listings_limit INTEGER DEFAULT 0,
    priority_support BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    
    -- Subscription Details
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    
    -- Billing
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    
    -- Payment
    payment_method TEXT CHECK (payment_method IN ('paystack', 'mobile_money', 'bank_transfer')),
    last_payment_at TIMESTAMPTZ,
    next_payment_at TIMESTAMPTZ,
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FEATURE PURCHASES TABLE
-- =============================================

CREATE TABLE feature_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Feature Details
    feature_type TEXT NOT NULL CHECK (feature_type IN (
        'listing_boost', 'listing_promotion', 'featured_listing',
        'priority_support', 'verification_fast_track', 'analytics_premium'
    )),
    
    -- Target
    target_id UUID, -- listing_id for listing features
    
    -- Cost
    credits_cost INTEGER NOT NULL,
    
    -- Duration (for temporary features)
    duration_days INTEGER,
    expires_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PLAN ENTITLEMENTS TABLE
-- =============================================

CREATE TABLE plan_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    
    -- Entitlement Details
    feature_type TEXT NOT NULL,
    feature_value INTEGER, -- numeric value (e.g., number of listings)
    feature_enabled BOOLEAN DEFAULT true, -- boolean value
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User credits indexes
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);

-- Credit transactions indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

-- Credit purchases indexes
CREATE INDEX idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX idx_credit_purchases_payment_reference ON credit_purchases(payment_reference);
CREATE INDEX idx_credit_purchases_created_at ON credit_purchases(created_at);

-- Paystack transactions indexes
CREATE INDEX idx_paystack_transactions_user_id ON paystack_transactions(user_id);
CREATE INDEX idx_paystack_transactions_reference ON paystack_transactions(paystack_reference);
CREATE INDEX idx_paystack_transactions_status ON paystack_transactions(status);
CREATE INDEX idx_paystack_transactions_credit_purchase_id ON paystack_transactions(credit_purchase_id);

-- Subscription plans indexes
CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_sort_order ON subscription_plans(sort_order);

-- User subscriptions indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_current_period_end ON user_subscriptions(current_period_end);

-- Feature purchases indexes
CREATE INDEX idx_feature_purchases_user_id ON feature_purchases(user_id);
CREATE INDEX idx_feature_purchases_feature_type ON feature_purchases(feature_type);
CREATE INDEX idx_feature_purchases_target_id ON feature_purchases(target_id);
CREATE INDEX idx_feature_purchases_status ON feature_purchases(status);
CREATE INDEX idx_feature_purchases_expires_at ON feature_purchases(expires_at);

-- Plan entitlements indexes
CREATE INDEX idx_plan_entitlements_plan_id ON plan_entitlements(plan_id);
CREATE INDEX idx_plan_entitlements_feature_type ON plan_entitlements(feature_type);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on user_credits
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on credit_transactions
CREATE TRIGGER update_credit_transactions_updated_at
    BEFORE UPDATE ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on credit_purchases
CREATE TRIGGER update_credit_purchases_updated_at
    BEFORE UPDATE ON credit_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on paystack_transactions
CREATE TRIGGER update_paystack_transactions_updated_at
    BEFORE UPDATE ON paystack_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on feature_purchases
CREATE TRIGGER update_feature_purchases_updated_at
    BEFORE UPDATE ON feature_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MONETIZATION FUNCTIONS
-- =============================================

-- Function to get user credits
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    credits INTEGER;
BEGIN
    SELECT balance INTO credits FROM user_credits WHERE user_id = p_user_id;
    RETURN COALESCE(credits, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to add credits to user
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_payment_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance FROM user_credits WHERE user_id = p_user_id;
    
    -- If user doesn't have credits record, create one
    IF current_balance IS NULL THEN
        INSERT INTO user_credits (user_id, balance) VALUES (p_user_id, 0);
        current_balance := 0;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + p_amount;
    
    -- Update user credits
    UPDATE user_credits 
    SET 
        balance = new_balance,
        total_earned = total_earned + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after,
        description, reference_type, reference_id, payment_reference
    ) VALUES (
        p_user_id, 'earned', p_amount, current_balance, new_balance,
        p_description, p_reference_type, p_reference_id, p_payment_reference
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to spend user credits
CREATE OR REPLACE FUNCTION spend_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance FROM user_credits WHERE user_id = p_user_id;
    
    -- Check if user has enough credits
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - p_amount;
    
    -- Update user credits
    UPDATE user_credits 
    SET 
        balance = new_balance,
        total_spent = total_spent + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO credit_transactions (
        user_id, type, amount, balance_before, balance_after,
        description, reference_type, reference_id
    ) VALUES (
        p_user_id, 'spent', -p_amount, current_balance, new_balance,
        p_description, p_reference_type, p_reference_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to complete credit purchase
CREATE OR REPLACE FUNCTION complete_credit_purchase(
    p_purchase_id UUID,
    p_paystack_reference TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    purchase_record RECORD;
BEGIN
    -- Get purchase details
    SELECT * INTO purchase_record FROM credit_purchases WHERE id = p_purchase_id;
    
    IF purchase_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update purchase status
    UPDATE credit_purchases 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_purchase_id;
    
    -- Add credits to user
    PERFORM add_user_credits(
        purchase_record.user_id,
        purchase_record.credits_amount,
        'Credit purchase completed',
        'purchase',
        p_purchase_id,
        p_paystack_reference
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Monetization system tables created successfully!' as status;
