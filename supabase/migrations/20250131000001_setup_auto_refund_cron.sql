-- Setup Auto-Refund Cron Job for Expired Deposits
-- Runs every hour to auto-refund deposits that have expired (>3 days without confirmation)

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule auto-refund job to run every hour
SELECT cron.schedule(
  'auto-refund-expired-deposits',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT auto_refund_expired_deposits();
  $$
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Auto-refund cron job scheduled successfully! Runs every hour.';
END $$;

-- To verify the cron job was created:
-- SELECT * FROM cron.job WHERE jobname = 'auto-refund-expired-deposits';

-- To manually trigger for testing:
-- SELECT auto_refund_expired_deposits();

-- To remove the cron job (if needed):
-- SELECT cron.unschedule('auto-refund-expired-deposits');

