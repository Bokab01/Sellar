-- =============================================
-- TRANSACTION HISTORY SYSTEM
-- Comprehensive transaction tracking and categorization
-- =============================================

-- Transaction Categories Table
CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions Table (Enhanced)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction Details
    type TEXT NOT NULL CHECK (type IN (
        'credit_purchase',
        'credit_usage', 
        'credit_refund',
        'listing_boost',
        'listing_promotion',
        'feature_unlock',
        'subscription_payment',
        'verification_fee',
        'commission_earned',
        'referral_bonus',
        'bonus',
        'withdrawal',
        'deposit',
        'transfer',
        'refund'
    )),
    
    category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
    
    -- Amount and Currency
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    
    -- Balance Tracking
    balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Status and Processing
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded'
    )),
    
    -- Payment Information
    payment_method TEXT CHECK (payment_method IN (
        'mobile_money',
        'bank_transfer',
        'card',
        'cash',
        'credits',
        'system',
        'referral'
    )),
    payment_reference TEXT,
    
    -- Related Entities
    related_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    description TEXT,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Transaction Receipts Table
CREATE TABLE IF NOT EXISTS transaction_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    
    -- Receipt Details
    receipt_number TEXT UNIQUE NOT NULL,
    receipt_type TEXT DEFAULT 'transaction' CHECK (receipt_type IN (
        'transaction',
        'invoice',
        'refund',
        'credit_note'
    )),
    
    -- Content
    content JSONB NOT NULL DEFAULT '{}',
    pdf_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction Notifications Table
CREATE TABLE IF NOT EXISTS transaction_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Details
    type TEXT NOT NULL CHECK (type IN (
        'transaction_created',
        'transaction_completed',
        'transaction_failed',
        'payment_received',
        'payment_sent',
        'refund_processed',
        'balance_low',
        'balance_updated'
    )),
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES
-- =============================================

-- Transaction Categories Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_categories_name ON transaction_categories(name);
CREATE INDEX IF NOT EXISTS idx_transaction_categories_active ON transaction_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_transaction_categories_sort_order ON transaction_categories(sort_order);

-- Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_related_listing_id ON transactions(related_listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_related_user_id ON transactions(related_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON transactions(payment_reference);

-- Transaction Receipts Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_receipts_transaction_id ON transaction_receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_receipts_receipt_number ON transaction_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_transaction_receipts_type ON transaction_receipts(receipt_type);

-- Transaction Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_notifications_transaction_id ON transaction_notifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_notifications_user_id ON transaction_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_notifications_type ON transaction_notifications(type);
CREATE INDEX IF NOT EXISTS idx_transaction_notifications_is_read ON transaction_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_transaction_notifications_created_at ON transaction_notifications(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_notifications ENABLE ROW LEVEL SECURITY;

-- Transaction Categories Policies
CREATE POLICY "Anyone can view active transaction categories" ON transaction_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage transaction categories" ON transaction_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type = 'admin'
        )
    );

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update transactions" ON transactions
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type IN ('admin', 'moderator')
        )
    );

-- Transaction Receipts Policies
CREATE POLICY "Users can view own transaction receipts" ON transaction_receipts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE transactions.id = transaction_receipts.transaction_id 
            AND transactions.user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage transaction receipts" ON transaction_receipts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type IN ('admin', 'moderator')
        )
    );

-- Transaction Notifications Policies
CREATE POLICY "Users can view own transaction notifications" ON transaction_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own transaction notifications" ON transaction_notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create transaction notifications" ON transaction_notifications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.account_type IN ('admin', 'moderator')
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    receipt_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current counter value
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 'REC-(\d+)') AS INTEGER)), 0) + 1
    INTO counter
    FROM transaction_receipts
    WHERE receipt_number LIKE 'REC-%';
    
    -- Format receipt number
    receipt_number := 'REC-' || LPAD(counter::TEXT, 8, '0');
    
    RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create transaction receipt
CREATE OR REPLACE FUNCTION create_transaction_receipt(transaction_uuid UUID)
RETURNS UUID AS $$
DECLARE
    receipt_id UUID;
    receipt_num TEXT;
    transaction_data RECORD;
BEGIN
    -- Get transaction data
    SELECT * INTO transaction_data
    FROM transactions
    WHERE id = transaction_uuid;
    
    -- Generate receipt number
    receipt_num := generate_receipt_number();
    
    -- Create receipt
    INSERT INTO transaction_receipts (transaction_id, receipt_number, content)
    VALUES (
        transaction_uuid,
        receipt_num,
        jsonb_build_object(
            'transaction_id', transaction_data.id,
            'user_id', transaction_data.user_id,
            'type', transaction_data.type,
            'amount', transaction_data.amount,
            'currency', transaction_data.currency,
            'status', transaction_data.status,
            'created_at', transaction_data.created_at,
            'description', transaction_data.description
        )
    )
    RETURNING id INTO receipt_id;
    
    RETURN receipt_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create transaction notification
CREATE OR REPLACE FUNCTION create_transaction_notification(
    transaction_uuid UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_message TEXT
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    transaction_user_id UUID;
BEGIN
    -- Get transaction user ID
    SELECT user_id INTO transaction_user_id
    FROM transactions
    WHERE id = transaction_uuid;
    
    -- Create notification
    INSERT INTO transaction_notifications (
        transaction_id,
        user_id,
        type,
        title,
        message
    )
    VALUES (
        transaction_uuid,
        transaction_user_id,
        notification_type,
        notification_title,
        notification_message
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create receipt and notification on transaction completion
CREATE OR REPLACE FUNCTION handle_transaction_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when status changes to completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Create receipt
        PERFORM create_transaction_receipt(NEW.id);
        
        -- Create notification based on transaction type
        CASE NEW.type
            WHEN 'credit_purchase' THEN
                PERFORM create_transaction_notification(
                    NEW.id,
                    'payment_received',
                    'Credits Purchased',
                    'Your credit purchase of ' || NEW.amount || ' ' || NEW.currency || ' has been completed successfully.'
                );
            WHEN 'credit_usage' THEN
                PERFORM create_transaction_notification(
                    NEW.id,
                    'payment_sent',
                    'Credits Used',
                    'You have spent ' || NEW.amount || ' credits on ' || COALESCE(NEW.description, 'a service') || '.'
                );
            WHEN 'commission_earned' THEN
                PERFORM create_transaction_notification(
                    NEW.id,
                    'payment_received',
                    'Commission Earned',
                    'You have earned ' || NEW.amount || ' ' || NEW.currency || ' in commission.'
                );
            WHEN 'referral_bonus' THEN
                PERFORM create_transaction_notification(
                    NEW.id,
                    'payment_received',
                    'Referral Bonus',
                    'You have received a referral bonus of ' || NEW.amount || ' ' || NEW.currency || '.'
                );
            ELSE
                PERFORM create_transaction_notification(
                    NEW.id,
                    'transaction_completed',
                    'Transaction Completed',
                    'Your transaction has been completed successfully.'
                );
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS transaction_completion_trigger ON transactions;
CREATE TRIGGER transaction_completion_trigger
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_transaction_completion();

-- =============================================
-- SEED DATA
-- =============================================

-- Insert default transaction categories
INSERT INTO transaction_categories (name, display_name, description, icon, color, sort_order) VALUES
('credit_operations', 'Credit Operations', 'All credit-related transactions', 'credit-card', '#3B82F6', 1),
('listing_operations', 'Listing Operations', 'Listing boost and promotion transactions', 'trending-up', '#10B981', 2),
('platform_operations', 'Platform Operations', 'Platform feature and subscription transactions', 'settings', '#8B5CF6', 3),
('earnings', 'Earnings', 'Commission and bonus earnings', 'dollar-sign', '#F59E0B', 4),
('payments', 'Payments', 'Direct payment transactions', 'banknote', '#EF4444', 5),
('transfers', 'Transfers', 'Money transfer transactions', 'arrow-left-right', '#6B7280', 6),
('refunds', 'Refunds', 'Refund transactions', 'undo', '#F97316', 7),
('fees', 'Fees', 'Service and processing fees', 'percent', '#84CC16', 8)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get user transaction summary
CREATE OR REPLACE FUNCTION get_user_transaction_summary(user_uuid UUID, start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_transactions INTEGER;
    total_amount DECIMAL(10,2);
    total_credits_spent DECIMAL(10,2);
    total_earnings DECIMAL(10,2);
    recent_transactions JSONB;
BEGIN
    -- Set default date range if not provided
    IF start_date IS NULL THEN
        start_date := NOW() - INTERVAL '30 days';
    END IF;
    
    IF end_date IS NULL THEN
        end_date := NOW();
    END IF;
    
    -- Get transaction counts and amounts
    SELECT 
        COUNT(*),
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN type IN ('credit_usage', 'listing_boost', 'listing_promotion', 'feature_unlock') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type IN ('commission_earned', 'referral_bonus', 'bonus') THEN amount ELSE 0 END), 0)
    INTO total_transactions, total_amount, total_credits_spent, total_earnings
    FROM transactions
    WHERE user_id = user_uuid
    AND created_at BETWEEN start_date AND end_date
    AND status = 'completed';
    
    -- Get recent transactions
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'type', type,
            'amount', amount,
            'currency', currency,
            'status', status,
            'description', description,
            'created_at', created_at
        )
    )
    INTO recent_transactions
    FROM (
        SELECT id, type, amount, currency, status, description, created_at
        FROM transactions
        WHERE user_id = user_uuid
        ORDER BY created_at DESC
        LIMIT 10
    ) recent;
    
    -- Build result
    result := jsonb_build_object(
        'total_transactions', total_transactions,
        'total_amount', total_amount,
        'total_credits_spent', total_credits_spent,
        'total_earnings', total_earnings,
        'recent_transactions', COALESCE(recent_transactions, '[]'::jsonb),
        'date_range', jsonb_build_object(
            'start_date', start_date,
            'end_date', end_date
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get transaction categories with counts
CREATE OR REPLACE FUNCTION get_transaction_categories_with_counts(user_uuid UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', tc.id,
            'name', tc.name,
            'display_name', tc.display_name,
            'description', tc.description,
            'icon', tc.icon,
            'color', tc.color,
            'is_active', tc.is_active,
            'sort_order', tc.sort_order,
            'transaction_count', COALESCE(tc_counts.count, 0)
        )
    )
    INTO result
    FROM transaction_categories tc
    LEFT JOIN (
        SELECT 
            category_id,
            COUNT(*) as count
        FROM transactions
        WHERE (user_uuid IS NULL OR user_id = user_uuid)
        AND status = 'completed'
        GROUP BY category_id
    ) tc_counts ON tc.id = tc_counts.category_id
    WHERE tc.is_active = true
    ORDER BY tc.sort_order, tc.display_name;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
