/*
  # Enhanced User System with Wallet and Settings

  1. New Tables
    - `transactions` - Credit transactions and payment history
    - `user_verification` - Identity verification requests
    - `app_settings` - Global app configuration
    - `user_sessions` - Track user login sessions

  2. Enhanced Tables
    - Add wallet fields to profiles
    - Add verification status tracking
    - Add user preferences

  3. Security
    - Enable RLS on all new tables
    - Add policies for user data access
    - Add wallet transaction security

  4. Functions
    - Credit balance management
    - Transaction logging
    - Verification status updates
*/

-- Create transactions table for wallet/credit system
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit', 'refund', 'bonus', 'purchase', 'payout')),
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'GHS',
  description text NOT NULL,
  reference_id text, -- External payment reference
  related_listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  related_offer_id uuid REFERENCES offers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create user verification table
CREATE TABLE IF NOT EXISTS user_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('identity', 'phone', 'email', 'business')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  documents jsonb DEFAULT '[]', -- Array of document URLs
  submitted_data jsonb DEFAULT '{}', -- Verification form data
  reviewer_notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  expires_at timestamptz
);

-- Create app settings table for global configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user sessions table for tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_info jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add wallet-related columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'wallet_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN wallet_balance numeric DEFAULT 0 CHECK (wallet_balance >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN pending_balance numeric DEFAULT 0 CHECK (pending_balance >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN account_type text DEFAULT 'personal' CHECK (account_type IN ('personal', 'business'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user verification
CREATE POLICY "Users can view own verification"
  ON user_verification
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification requests"
  ON user_verification
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification"
  ON user_verification
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for app settings
CREATE POLICY "Anyone can view public settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- RLS Policies for user sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS transactions_user_id_created_at_idx ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_type_status_idx ON transactions(type, status);
CREATE INDEX IF NOT EXISTS transactions_reference_id_idx ON transactions(reference_id) WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_verification_user_id_status_idx ON user_verification(user_id, status);
CREATE INDEX IF NOT EXISTS user_verification_type_status_idx ON user_verification(verification_type, status);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_activity_idx ON user_sessions(user_id, last_activity DESC);

-- Functions for wallet management
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update wallet balance based on transaction type
  IF NEW.status = 'completed' THEN
    IF NEW.type IN ('credit', 'refund', 'bonus') THEN
      UPDATE profiles 
      SET wallet_balance = wallet_balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.user_id;
    ELSIF NEW.type IN ('debit', 'purchase') THEN
      UPDATE profiles 
      SET wallet_balance = wallet_balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic balance updates
DROP TRIGGER IF EXISTS update_balance_on_transaction ON transactions;
CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();

-- Function to create transaction
CREATE OR REPLACE FUNCTION create_transaction(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_description text,
  p_reference_id text DEFAULT NULL,
  p_related_listing_id uuid DEFAULT NULL,
  p_related_offer_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  transaction_id uuid;
BEGIN
  INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    reference_id,
    related_listing_id,
    related_offer_id
  ) VALUES (
    p_user_id,
    p_type,
    p_amount,
    p_description,
    p_reference_id,
    p_related_listing_id,
    p_related_offer_id
  ) RETURNING id INTO transaction_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default app settings
INSERT INTO app_settings (key, value, description, is_public) VALUES
  ('app_version', '"1.0.0"', 'Current app version', true),
  ('maintenance_mode', 'false', 'App maintenance status', true),
  ('min_offer_percentage', '0.1', 'Minimum offer as percentage of listing price', false),
  ('max_images_per_listing', '8', 'Maximum images allowed per listing', true),
  ('max_images_per_post', '5', 'Maximum images allowed per post', true),
  ('default_offer_expiry_days', '3', 'Default offer expiry in days', false),
  ('boost_prices', '{"1_day": 5, "3_days": 12, "7_days": 25}', 'Boost pricing in GHS', false)
ON CONFLICT (key) DO NOTHING;