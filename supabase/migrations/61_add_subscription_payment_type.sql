-- Add 'subscription_payment' type to credit_transactions
-- This allows subscription payments to be recorded in transaction history

-- Drop the existing check constraint
ALTER TABLE credit_transactions 
DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

-- Add new check constraint with 'subscription_payment' included
ALTER TABLE credit_transactions 
ADD CONSTRAINT credit_transactions_type_check 
CHECK (type IN ('earned', 'spent', 'refunded', 'bonus', 'penalty', 'subscription_payment'));

-- Add comment
COMMENT ON COLUMN credit_transactions.type IS 'Transaction type: earned (credit purchase/reward), spent (feature purchase), refunded (credit return), bonus (promotional), penalty (violation), subscription_payment (subscription purchase/renewal)';

