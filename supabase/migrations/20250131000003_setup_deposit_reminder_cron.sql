-- =====================================================
-- DEPOSIT REMINDER SYSTEM: Push Notification Cron Job
-- =====================================================

-- Setup cron job to send deposit reminders every 2 hours
SELECT cron.schedule(
  'send-deposit-reminders',
  '0 */2 * * *',  -- Every 2 hours
  $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-deposit-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Deposit reminder cron job scheduled successfully!';
  RAISE NOTICE 'Reminders will be sent every 2 hours for:';
  RAISE NOTICE '  - Day 1: ~48 hours remaining (first reminder)';
  RAISE NOTICE '  - Day 2: ~24 hours remaining (second reminder)';
  RAISE NOTICE '  - Day 3: ~6 hours remaining (final warning)';
  RAISE NOTICE '';
  RAISE NOTICE 'Notifications will be sent via:';
  RAISE NOTICE '  1. In-app notifications (stored in notifications table)';
  RAISE NOTICE '  2. Push notifications (via Expo)';
END $$;

-- To verify the cron job was created:
-- SELECT * FROM cron.job WHERE jobname = 'send-deposit-reminders';

-- To manually trigger for testing:
-- SELECT
--   net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/send-deposit-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );

-- To remove the cron job (if needed):
-- SELECT cron.unschedule('send-deposit-reminders');

