-- Migration 39: Payment Security Enhancements
-- This migration adds security features for payment processing

-- ============================================================================
-- 1. Add fraud detection fields to paystack_transactions
-- ============================================================================

-- Add fraud tracking columns
ALTER TABLE paystack_transactions 
ADD COLUMN IF NOT EXISTS fraud_detected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fraud_reason TEXT,
ADD COLUMN IF NOT EXISTS fraud_detected_at TIMESTAMP WITH TIME ZONE;

-- Add verification attempt tracking
ALTER TABLE paystack_transactions
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMP WITH TIME ZONE;

-- Add index for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_fraud 
ON paystack_transactions(fraud_detected, created_at) 
WHERE fraud_detected = TRUE;

-- Add index for expired transactions
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_expired 
ON paystack_transactions(status, created_at) 
WHERE status = 'pending';

-- ============================================================================
-- 2. Function to expire old pending transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_pending_transactions()
RETURNS TABLE(
  expired_count INTEGER,
  expired_references TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER;
  v_references TEXT[];
BEGIN
  -- Update transactions that are pending for more than 1 hour
  WITH updated AS (
    UPDATE paystack_transactions
    SET 
      status = 'expired',
      updated_at = NOW(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'expired_at', NOW(),
        'expired_reason', 'Payment not completed within 1 hour'
      )
    WHERE 
      status = 'pending'
      AND created_at < NOW() - INTERVAL '1 hour'
    RETURNING id, reference
  )
  SELECT 
    COUNT(*)::INTEGER,
    ARRAY_AGG(reference)
  INTO v_expired_count, v_references
  FROM updated;

  RETURN QUERY SELECT v_expired_count, v_references;
END;
$$;

-- ============================================================================
-- 3. Function to check for suspicious payment activity
-- ============================================================================

CREATE OR REPLACE FUNCTION check_suspicious_payment_activity(
  p_user_id UUID,
  p_reference TEXT
)
RETURNS TABLE(
  is_suspicious BOOLEAN,
  reason TEXT,
  recent_attempts INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_attempts INTEGER;
  v_recent_failures INTEGER;
  v_recent_fraud INTEGER;
BEGIN
  -- Count recent verification attempts (last 5 minutes)
  SELECT COUNT(*) INTO v_recent_attempts
  FROM paystack_transactions
  WHERE 
    user_id = p_user_id
    AND reference = p_reference
    AND last_verification_at > NOW() - INTERVAL '5 minutes';

  -- Count recent failed transactions (last 1 hour)
  SELECT COUNT(*) INTO v_recent_failures
  FROM paystack_transactions
  WHERE 
    user_id = p_user_id
    AND status = 'failed'
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Count recent fraud detections (last 24 hours)
  SELECT COUNT(*) INTO v_recent_fraud
  FROM paystack_transactions
  WHERE 
    user_id = p_user_id
    AND fraud_detected = TRUE
    AND fraud_detected_at > NOW() - INTERVAL '24 hours';

  -- Determine if activity is suspicious
  IF v_recent_attempts > 5 THEN
    RETURN QUERY SELECT 
      TRUE, 
      'Too many verification attempts in short time',
      v_recent_attempts;
  ELSIF v_recent_failures > 10 THEN
    RETURN QUERY SELECT 
      TRUE, 
      'Too many failed transactions',
      v_recent_failures;
  ELSIF v_recent_fraud > 0 THEN
    RETURN QUERY SELECT 
      TRUE, 
      'Previous fraud detected for this user',
      v_recent_fraud;
  ELSE
    RETURN QUERY SELECT 
      FALSE, 
      'Activity looks normal',
      v_recent_attempts;
  END IF;
END;
$$;

-- ============================================================================
-- 4. Function to increment verification attempts
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_verification_attempts(
  p_reference TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE paystack_transactions
  SET 
    verification_attempts = verification_attempts + 1,
    last_verification_at = NOW(),
    updated_at = NOW()
  WHERE reference = p_reference
  RETURNING verification_attempts INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- ============================================================================
-- 5. Function to get payment security metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payment_security_metrics(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(
  metric TEXT,
  count BIGINT,
  percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_transactions BIGINT;
BEGIN
  -- Get total transactions in period
  SELECT COUNT(*) INTO v_total_transactions
  FROM paystack_transactions
  WHERE created_at > NOW() - (p_days || ' days')::INTERVAL;

  -- Return metrics
  RETURN QUERY
  WITH metrics AS (
    SELECT 'Total Transactions' as metric, COUNT(*) as count
    FROM paystack_transactions
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
    
    UNION ALL
    
    SELECT 'Successful Payments', COUNT(*)
    FROM paystack_transactions
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
      AND status = 'success'
    
    UNION ALL
    
    SELECT 'Failed Payments', COUNT(*)
    FROM paystack_transactions
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
      AND status = 'failed'
    
    UNION ALL
    
    SELECT 'Expired Transactions', COUNT(*)
    FROM paystack_transactions
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
      AND status = 'expired'
    
    UNION ALL
    
    SELECT 'Fraud Detected', COUNT(*)
    FROM paystack_transactions
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
      AND fraud_detected = TRUE
    
    UNION ALL
    
    SELECT 'Webhook Processed', COUNT(*)
    FROM paystack_transactions
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
      AND webhook_processed = TRUE
    
    UNION ALL
    
    SELECT 'Manually Verified', COUNT(*)
    FROM paystack_transactions
    WHERE created_at > NOW() - (p_days || ' days')::INTERVAL
      AND manually_processed = TRUE
  )
  SELECT 
    m.metric,
    m.count,
    CASE 
      WHEN v_total_transactions > 0 
      THEN ROUND((m.count::NUMERIC / v_total_transactions::NUMERIC) * 100, 2)
      ELSE 0 
    END as percentage
  FROM metrics m;
END;
$$;

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

-- These functions should only be called by service role or via RPC
GRANT EXECUTE ON FUNCTION expire_old_pending_transactions() TO service_role;
GRANT EXECUTE ON FUNCTION check_suspicious_payment_activity(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_verification_attempts(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_payment_security_metrics(INTEGER) TO service_role;

-- Allow authenticated users to check their own activity
GRANT EXECUTE ON FUNCTION get_payment_security_metrics(INTEGER) TO authenticated;

-- ============================================================================
-- 7. Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION expire_old_pending_transactions() IS 
'Expires pending transactions older than 1 hour. Should be called by cron job.';

COMMENT ON FUNCTION check_suspicious_payment_activity(UUID, TEXT) IS 
'Checks if a user has suspicious payment activity patterns.';

COMMENT ON FUNCTION increment_verification_attempts(TEXT) IS 
'Tracks verification attempts to prevent abuse.';

COMMENT ON FUNCTION get_payment_security_metrics(INTEGER) IS 
'Returns payment security metrics for monitoring dashboard.';

-- ============================================================================
-- 8. Verification queries
-- ============================================================================

-- To verify this migration was applied successfully, run:
-- SELECT * FROM get_payment_security_metrics(7);
-- SELECT * FROM expire_old_pending_transactions();

