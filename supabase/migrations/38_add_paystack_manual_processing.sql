-- =============================================
-- PAYSTACK MANUAL PROCESSING SUPPORT
-- =============================================
-- This migration adds support for manual payment verification
-- when webhooks are delayed or fail

-- =============================================
-- 1. ADD MISSING WEBHOOK COLUMNS
-- =============================================

-- Add webhook tracking columns if they don't exist
ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS webhook_received BOOLEAN DEFAULT FALSE;

ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS webhook_processed BOOLEAN DEFAULT FALSE;

ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS webhook_processed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS webhook_signature_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);

ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS paystack_response JSONB;

ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =============================================
-- 2. ADD MANUAL PROCESSING COLUMN
-- =============================================

-- Add column to track if payment was manually processed (before webhook)
ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS manually_processed BOOLEAN DEFAULT FALSE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_status 
ON paystack_transactions(status);

CREATE INDEX IF NOT EXISTS idx_paystack_transactions_webhook_processed 
ON paystack_transactions(webhook_processed) 
WHERE webhook_processed = TRUE;

CREATE INDEX IF NOT EXISTS idx_paystack_transactions_manually_processed 
ON paystack_transactions(manually_processed) 
WHERE manually_processed = TRUE;

CREATE INDEX IF NOT EXISTS idx_paystack_transactions_user_id 
ON paystack_transactions(user_id);

-- =============================================
-- 3. UPDATE EXISTING TRANSACTIONS
-- =============================================

-- Set defaults for existing transactions
UPDATE paystack_transactions
SET 
    webhook_received = FALSE,
    webhook_processed = FALSE,
    manually_processed = FALSE,
    updated_at = NOW()
WHERE webhook_received IS NULL;

-- =============================================
-- 4. ADD HELPFUL COMMENTS
-- =============================================

COMMENT ON COLUMN paystack_transactions.manually_processed IS 
'TRUE if payment was processed via paystack-verify Edge Function before webhook arrived. Used to prevent duplicate processing.';

-- =============================================
-- 5. CREATE MONITORING FUNCTION
-- =============================================

-- Function to check payment processing status
CREATE OR REPLACE FUNCTION check_payment_processing_status(
    p_reference TEXT DEFAULT NULL
)
RETURNS TABLE (
    reference TEXT,
    status TEXT,
    webhook_received BOOLEAN,
    webhook_processed BOOLEAN,
    manually_processed BOOLEAN,
    processing_method TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF p_reference IS NOT NULL THEN
        -- Check specific transaction
        RETURN QUERY
        SELECT 
            pt.reference::TEXT,
            pt.status::TEXT,
            pt.webhook_received,
            pt.webhook_processed,
            pt.manually_processed,
            CASE 
                WHEN pt.manually_processed AND pt.webhook_processed THEN 'Both (Manual First)'
                WHEN pt.manually_processed THEN 'Manual Verification'
                WHEN pt.webhook_processed THEN 'Webhook'
                ELSE 'Pending'
            END::TEXT as processing_method,
            pt.paid_at,
            pt.created_at
        FROM paystack_transactions pt
        WHERE pt.reference = p_reference;
    ELSE
        -- Show recent transactions
        RETURN QUERY
        SELECT 
            pt.reference::TEXT,
            pt.status::TEXT,
            pt.webhook_received,
            pt.webhook_processed,
            pt.manually_processed,
            CASE 
                WHEN pt.manually_processed AND pt.webhook_processed THEN 'Both (Manual First)'
                WHEN pt.manually_processed THEN 'Manual Verification'
                WHEN pt.webhook_processed THEN 'Webhook'
                ELSE 'Pending'
            END::TEXT as processing_method,
            pt.paid_at,
            pt.created_at
        FROM paystack_transactions pt
        ORDER BY pt.created_at DESC
        LIMIT 20;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_payment_processing_status(TEXT) TO authenticated;

-- =============================================
-- 6. CREATE PAYMENT STATISTICS FUNCTION
-- =============================================

-- Function to get payment processing statistics
CREATE OR REPLACE FUNCTION get_payment_processing_stats()
RETURNS TABLE (
    metric TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    total_successful BIGINT;
BEGIN
    -- Get total successful payments
    SELECT COUNT(*) INTO total_successful
    FROM paystack_transactions
    WHERE status = 'success';

    RETURN QUERY
    SELECT 
        'Total Successful Payments'::TEXT,
        total_successful,
        100.0::NUMERIC
    
    UNION ALL
    
    SELECT 
        'Processed via Webhook'::TEXT,
        COUNT(*),
        CASE 
            WHEN total_successful > 0 THEN ROUND((COUNT(*)::NUMERIC / total_successful) * 100, 2)
            ELSE 0
        END
    FROM paystack_transactions
    WHERE status = 'success' 
    AND webhook_processed = TRUE
    AND (manually_processed = FALSE OR manually_processed IS NULL)
    
    UNION ALL
    
    SELECT 
        'Processed Manually (before webhook)'::TEXT,
        COUNT(*),
        CASE 
            WHEN total_successful > 0 THEN ROUND((COUNT(*)::NUMERIC / total_successful) * 100, 2)
            ELSE 0
        END
    FROM paystack_transactions
    WHERE status = 'success' 
    AND manually_processed = TRUE
    AND (webhook_processed = FALSE OR webhook_received = FALSE)
    
    UNION ALL
    
    SELECT 
        'Processed Both Ways'::TEXT,
        COUNT(*),
        CASE 
            WHEN total_successful > 0 THEN ROUND((COUNT(*)::NUMERIC / total_successful) * 100, 2)
            ELSE 0
        END
    FROM paystack_transactions
    WHERE status = 'success' 
    AND manually_processed = TRUE
    AND webhook_processed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_payment_processing_stats() TO authenticated;

-- =============================================
-- 7. VERIFY SETUP
-- =============================================

-- Check column exists
SELECT 
    '✅ Manual Processing Column Added' as status,
    COUNT(*) as existing_transactions,
    COUNT(*) FILTER (WHERE manually_processed = TRUE) as manually_processed_count,
    COUNT(*) FILTER (WHERE webhook_processed = TRUE) as webhook_processed_count
FROM paystack_transactions;

-- =============================================
-- SETUP COMPLETE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '
    ╔════════════════════════════════════════════════════════════╗
    ║                                                            ║
    ║  ✅ PAYSTACK MANUAL PROCESSING SUPPORT ADDED              ║
    ║                                                            ║
    ║  🎯 Features:                                             ║
    ║  • Manual verification via paystack-verify function       ║
    ║  • Prevents duplicate processing                          ║
    ║  • Tracks processing method (webhook vs manual)           ║
    ║                                                            ║
    ║  Monitoring:                                              ║
    ║  • SELECT * FROM check_payment_processing_status();      ║
    ║  • SELECT * FROM get_payment_processing_stats();         ║
    ║                                                            ║
    ║  Next Steps:                                              ║
    ║  1. Deploy paystack-verify Edge Function                 ║
    ║  2. Test payment verification                             ║
    ║  3. Monitor processing statistics                         ║
    ║                                                            ║
    ╚════════════════════════════════════════════════════════════╝
    ';
END $$;

