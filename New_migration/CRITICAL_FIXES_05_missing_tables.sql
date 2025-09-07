-- =============================================
-- CRITICAL FIX: MISSING TABLES REFERENCED BY APP
-- These tables are referenced in the app but missing from migrations
-- =============================================

-- Callback requests table (referenced in dbHelpers)
CREATE TABLE callback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Request Details
    phone_number TEXT NOT NULL,
    preferred_time TEXT,
    reason TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    -- Response
    called_at TIMESTAMPTZ,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction receipts table (referenced in dbHelpers)
CREATE TABLE transaction_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES credit_transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Receipt Details
    receipt_number TEXT UNIQUE NOT NULL,
    receipt_data JSONB DEFAULT '{}',
    
    -- File Information
    receipt_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- Status
    status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'downloaded')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction notifications table (referenced in dbHelpers)
CREATE TABLE transaction_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES credit_transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Details
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'transaction_completed', 'transaction_failed', 'payment_received',
        'refund_processed', 'low_balance', 'credit_expiring'
    )),
    
    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Delivery
    delivery_method TEXT DEFAULT 'push' CHECK (delivery_method IN ('push', 'email', 'sms')),
    sent_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit packages table (referenced in dbHelpers)
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Package Details
    name TEXT NOT NULL,
    description TEXT,
    credits_amount INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    
    -- Package Type
    package_type TEXT DEFAULT 'standard' CHECK (package_type IN ('standard', 'bonus', 'promotional')),
    
    -- Bonus Information
    bonus_credits INTEGER DEFAULT 0,
    bonus_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Limits
    max_purchases_per_user INTEGER,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    
    -- Display
    sort_order INTEGER DEFAULT 0,
    badge_text TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table (already exists but need to ensure it matches app usage)
-- This is already created in moderation system, but let's ensure it's correct
-- (The reports table is already correctly defined in 07_moderation_system.sql)

-- Notifications table (already exists but need to ensure it matches app usage)
-- This is already created in notifications system
-- (The notifications table is already correctly defined in 09_notifications_system.sql)

-- Device tokens table (already exists)
-- This is already created in notifications system
-- (The device_tokens table is already correctly defined in 09_notifications_system.sql)

-- User verification table (already exists)
-- This is already created in verification system
-- (The user_verification table is already correctly defined in 08_verification_system.sql)

-- User settings table (already exists)
-- This is already created in profiles system
-- (The user_settings table is already correctly defined in CRITICAL_FIXES_02_profiles_corrected.sql)

-- User subscriptions table (need to create this)
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Subscription Details
    subscription_type TEXT NOT NULL CHECK (subscription_type IN ('basic', 'pro', 'business')),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    
    -- Billing
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    
    -- Payment
    payment_method TEXT CHECK (payment_method IN ('paystack', 'mobile_money', 'bank_transfer')),
    last_payment_at TIMESTAMPTZ,
    next_payment_at TIMESTAMPTZ,
    
    -- Pricing
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction categories table (need to create this)
CREATE TABLE transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Callback requests indexes
CREATE INDEX idx_callback_requests_user_id ON callback_requests(user_id);
CREATE INDEX idx_callback_requests_status ON callback_requests(status);
CREATE INDEX idx_callback_requests_created_at ON callback_requests(created_at);

-- Transaction receipts indexes
CREATE INDEX idx_transaction_receipts_transaction_id ON transaction_receipts(transaction_id);
CREATE INDEX idx_transaction_receipts_user_id ON transaction_receipts(user_id);
CREATE INDEX idx_transaction_receipts_receipt_number ON transaction_receipts(receipt_number);

-- Transaction notifications indexes
CREATE INDEX idx_transaction_notifications_transaction_id ON transaction_notifications(transaction_id);
CREATE INDEX idx_transaction_notifications_user_id ON transaction_notifications(user_id);
CREATE INDEX idx_transaction_notifications_status ON transaction_notifications(status);

-- Credit packages indexes
CREATE INDEX idx_credit_packages_is_active ON credit_packages(is_active);
CREATE INDEX idx_credit_packages_sort_order ON credit_packages(sort_order);

-- User subscriptions indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_current_period_end ON user_subscriptions(current_period_end);

-- Transaction categories indexes
CREATE INDEX idx_transaction_categories_is_active ON transaction_categories(is_active);
CREATE INDEX idx_transaction_categories_sort_order ON transaction_categories(sort_order);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp triggers
CREATE TRIGGER update_callback_requests_updated_at
    BEFORE UPDATE ON callback_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_receipts_updated_at
    BEFORE UPDATE ON transaction_receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_notifications_updated_at
    BEFORE UPDATE ON transaction_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_categories_updated_at
    BEFORE UPDATE ON transaction_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default transaction categories
INSERT INTO transaction_categories (name, display_name, description, icon) VALUES
('credit_purchase', 'Credit Purchase', 'Purchase of credits', '💳'),
('listing_boost', 'Listing Boost', 'Boost listing visibility', '🚀'),
('feature_unlock', 'Feature Unlock', 'Unlock premium features', '🔓'),
('subscription', 'Subscription', 'Monthly/yearly subscriptions', '📅'),
('refund', 'Refund', 'Refunded transactions', '↩️'),
('bonus', 'Bonus', 'Bonus credits received', '🎁')
ON CONFLICT (name) DO NOTHING;

-- Insert default credit packages
INSERT INTO credit_packages (name, description, credits_amount, price, is_featured, sort_order) VALUES
('Starter Pack', 'Perfect for new users', 50, 10.00, false, 1),
('Popular Pack', 'Most popular choice', 120, 20.00, true, 2),
('Value Pack', 'Best value for money', 250, 35.00, false, 3),
('Premium Pack', 'For power users', 500, 60.00, false, 4)
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'CRITICAL FIX: Missing tables created to match app references!' as status;
