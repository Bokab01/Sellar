-- =============================================
-- ADD MISSING TRANSACTION SYSTEM
-- Creates the main transactions table and related functions that the frontend expects
-- =============================================

-- 1. Create the main transactions table (what the frontend expects)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Transaction Details (matching frontend Transaction interface)
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'credit_purchase', 'credit_usage', 'credit_refund', 'listing_boost', 
        'listing_promotion', 'feature_unlock', 'subscription_payment', 
        'commission_earned', 'referral_bonus', 'verification_fee', 
        'withdrawal', 'deposit', 'penalty', 'bonus', 'adjustment'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'
    )),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'GHS',
    credits_amount INTEGER,
    
    -- Payment Information
    payment_method TEXT CHECK (payment_method IN (
        'credits', 'mobile_money', 'bank_transfer', 'card', 'paystack', 'system', 'manual'
    )),
    payment_reference TEXT,
    payment_provider TEXT,
    
    -- Transaction Content
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- Related Entities
    related_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    related_order_id UUID,
    related_subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Balance Tracking
    balance_before DECIMAL(12,2),
    balance_after DECIMAL(12,2),
    
    -- Additional Data
    metadata JSONB DEFAULT '{}',
    receipt_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 2. Create transaction categories table
CREATE TABLE IF NOT EXISTS transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create transaction receipts table
CREATE TABLE IF NOT EXISTS transaction_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_url TEXT NOT NULL,
    receipt_type TEXT DEFAULT 'pdf' CHECK (receipt_type IN ('pdf', 'image', 'html')),
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create transaction notifications table
CREATE TABLE IF NOT EXISTS transaction_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'transaction_created', 'transaction_completed', 'transaction_failed', 
        'payment_received', 'refund_processed'
    )),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 5. Enable RLS on new tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_notifications ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own transactions" ON transactions 
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own transactions" ON transactions 
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can manage all transactions" ON transactions 
    FOR ALL USING (true);

-- 7. Create RLS policies for transaction categories
CREATE POLICY "Anyone can view transaction categories" ON transaction_categories 
    FOR SELECT USING (true);

-- 8. Create RLS policies for transaction receipts
CREATE POLICY "Users can view receipts for their transactions" ON transaction_receipts 
    FOR SELECT USING (
        transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid())
    );
CREATE POLICY "System can manage transaction receipts" ON transaction_receipts 
    FOR ALL USING (true);

-- 9. Create RLS policies for transaction notifications
CREATE POLICY "Users can view their own transaction notifications" ON transaction_notifications 
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage transaction notifications" ON transaction_notifications 
    FOR ALL USING (true);

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_related_listing ON transactions(related_listing_id);

-- 11. Create function to create transactions (what the frontend expects)
CREATE OR REPLACE FUNCTION create_transaction(
    p_user_id UUID,
    p_transaction_type TEXT,
    p_amount DECIMAL,
    p_title TEXT,
    p_credits_amount INTEGER DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_payment_reference TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_current_balance DECIMAL(12,2);
BEGIN
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- Create the transaction
    INSERT INTO transactions (
        user_id, transaction_type, amount, credits_amount, title, description,
        category, payment_method, payment_reference, metadata, balance_before
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, p_credits_amount, p_title, p_description,
        p_category, p_payment_method, p_payment_reference, p_metadata, COALESCE(v_current_balance, 0)
    ) RETURNING id INTO v_transaction_id;
    
    -- Update user balance if credits are involved
    IF p_credits_amount IS NOT NULL THEN
        UPDATE user_credits 
        SET balance = balance + p_credits_amount,
            total_earned = CASE 
                WHEN p_credits_amount > 0 THEN total_earned + p_credits_amount 
                ELSE total_earned 
            END,
            total_spent = CASE 
                WHEN p_credits_amount < 0 THEN total_spent + ABS(p_credits_amount) 
                ELSE total_spent 
            END
        WHERE user_id = p_user_id;
        
        -- Update transaction with new balance
        UPDATE transactions 
        SET balance_after = (SELECT balance FROM user_credits WHERE user_id = p_user_id)
        WHERE id = v_transaction_id;
    END IF;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to get user transaction summary (what the frontend expects)
CREATE OR REPLACE FUNCTION get_user_transaction_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_summary JSON;
BEGIN
    SELECT json_build_object(
        'total_transactions', COUNT(*),
        'total_spent', COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0),
        'total_earned', COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
        'credits_purchased', COALESCE(SUM(CASE WHEN transaction_type = 'credit_purchase' AND credits_amount > 0 THEN credits_amount ELSE 0 END), 0),
        'credits_used', COALESCE(SUM(CASE WHEN credits_amount < 0 THEN ABS(credits_amount) ELSE 0 END), 0),
        'pending_transactions', COUNT(CASE WHEN status = 'pending' THEN 1 END),
        'last_transaction_date', MAX(created_at)
    ) INTO v_summary
    FROM transactions
    WHERE user_id = p_user_id;
    
    RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to get transaction analytics (what the frontend expects)
CREATE OR REPLACE FUNCTION get_transaction_analytics(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_analytics JSON;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- Set default date range if not provided
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());
    
    WITH transaction_stats AS (
        SELECT 
            transaction_type,
            status,
            COUNT(*) as count,
            SUM(amount) as total_amount,
            SUM(COALESCE(credits_amount, 0)) as total_credits
        FROM transactions
        WHERE user_id = p_user_id
        AND created_at >= v_start_date
        AND created_at <= v_end_date
        GROUP BY transaction_type, status
    ),
    totals AS (
        SELECT 
            COUNT(*) as transaction_count,
            SUM(amount) as total_amount,
            SUM(CASE WHEN credits_amount < 0 THEN ABS(credits_amount) ELSE 0 END) as credits_spent,
            SUM(CASE WHEN credits_amount > 0 THEN credits_amount ELSE 0 END) as credits_earned
        FROM transactions
        WHERE user_id = p_user_id
        AND created_at >= v_start_date
        AND created_at <= v_end_date
    )
    SELECT json_build_object(
        'period', json_build_object(
            'start_date', v_start_date,
            'end_date', v_end_date
        ),
        'totals', (SELECT row_to_json(totals) FROM totals),
        'by_type', (
            SELECT json_object_agg(
                transaction_type,
                json_build_object(
                    'count', count,
                    'total_amount', total_amount,
                    'total_credits', total_credits
                )
            )
            FROM transaction_stats
            GROUP BY transaction_type
        ),
        'by_status', (
            SELECT json_object_agg(
                status,
                count
            )
            FROM transaction_stats
            GROUP BY status
        )
    ) INTO v_analytics;
    
    RETURN v_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant permissions
GRANT EXECUTE ON FUNCTION create_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_transaction_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_analytics TO authenticated;

-- 15. Insert default transaction categories
INSERT INTO transaction_categories (name, display_name, description, icon, color, sort_order) VALUES
('credits', 'Credit Operations', 'All credit-related transactions', 'credit-card', '#3B82F6', 1),
('listings', 'Listing Operations', 'Listing boost and promotion transactions', 'trending-up', '#10B981', 2),
('earnings', 'Earnings', 'Commission and bonus earnings', 'dollar-sign', '#F59E0B', 3),
('payments', 'Payments', 'Payment and withdrawal transactions', 'arrow-up-right', '#8B5CF6', 4),
('subscriptions', 'Subscriptions', 'Subscription and plan payments', 'crown', '#EC4899', 5),
('services', 'Services', 'Verification and service fees', 'shield-check', '#6B7280', 6),
('adjustments', 'Adjustments', 'System adjustments and penalties', 'settings', '#EF4444', 7)
ON CONFLICT (name) DO NOTHING;

-- 16. Add to expected tables list
-- Note: The expected_tables array in the main SQL file needs to be updated to include:
-- 'transactions', 'transaction_categories', 'transaction_receipts', 'transaction_notifications'

-- Success message
SELECT 'Transaction system added successfully!' as status;
