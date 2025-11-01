-- =====================================================
-- CLEANUP PENDING DEPOSITS: Auto-delete abandoned payments
-- =====================================================
-- 
-- Problem: When users click "Pay Deposit" but cancel/abandon
-- the Paystack payment, the deposit remains in 'pending' state
-- and counts toward their 3-deposit limit
--
-- Solution: Auto-delete pending deposits after 24 hours
-- =====================================================

-- RPC: Cleanup Expired Pending Deposits (Cron Job)
CREATE OR REPLACE FUNCTION cleanup_pending_deposits()
RETURNS JSON AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete pending deposits that have expired (24 hours after creation)
  DELETE FROM listing_deposits
  WHERE status = 'pending'
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'deleted_count', v_deleted_count,
    'message', format('%s abandoned pending deposit(s) cleaned up', v_deleted_count)
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION cleanup_pending_deposits TO service_role;

-- Setup cron job to cleanup pending deposits every hour
SELECT cron.schedule(
  'cleanup-pending-deposits',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT cleanup_pending_deposits();
  $$
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Pending deposits cleanup system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Cleanup job will run every hour to:';
  RAISE NOTICE '  - Delete pending deposits older than 24 hours';
  RAISE NOTICE '  - Free up user deposit slots for abandoned payments';
  RAISE NOTICE '';
  RAISE NOTICE 'This prevents users from being stuck with abandoned deposits';
  RAISE NOTICE 'that count toward their 3-deposit limit.';
END $$;

-- To verify the cron job was created:
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-pending-deposits';

-- To manually trigger for testing:
-- SELECT cleanup_pending_deposits();

-- To remove the cron job (if needed):
-- SELECT cron.unschedule('cleanup-pending-deposits');

