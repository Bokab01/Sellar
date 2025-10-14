-- Add payment_reference column to user_subscriptions table
-- This allows us to track which payment was used to activate/renew a subscription

ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_payment_reference 
ON user_subscriptions(payment_reference);

-- Add comment
COMMENT ON COLUMN user_subscriptions.payment_reference IS 'Reference to the Paystack transaction that activated/renewed this subscription';

