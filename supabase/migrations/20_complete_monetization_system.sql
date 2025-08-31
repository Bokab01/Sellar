/*
  # Complete Monetization System

  1. New Tables
    - `user_credits` - Track user credit balances and transactions
    - `credit_packages` - Available credit packages for purchase
    - `credit_transactions` - All credit-related transactions
    - `credit_purchases` - Credit package purchases
    - `feature_purchases` - Individual feature purchases
    - `subscription_plans` - Available business plans
    - `user_subscriptions` - User plan subscriptions
    - `paystack_transactions` - Payment gateway transactions
    - `webhook_events` - Payment webhook processing

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Service role access for RPCs and webhooks

  3. Business Logic
    - Credit management RPCs
    - Listing payment enforcement
    - Feature purchase system
    - Subscription management
    - Entitlements calculation
</*/

-- Credit packages table
CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_ghs numeric NOT NULL,
  price_per_credit numeric GENERATED ALWAYS AS (price_ghs / credits) STORED,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- User credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance integer DEFAULT 0,
  lifetime_earned integer DEFAULT 0,
  lifetime_spent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('earned', 'spent', 'refund', 'bonus', 'purchase')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  reference_id text,
  reference_type text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Credit purchases table
CREATE TABLE IF NOT EXISTS credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES credit_packages(id),
  credits integer NOT NULL,
  amount_ghs numeric NOT NULL,
  payment_reference text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Feature purchases table
CREATE TABLE IF NOT EXISTS feature_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  credits_spent integer NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_ghs numeric NOT NULL,
  billing_period text DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  boost_credits integer DEFAULT 0,
  max_listings integer, -- NULL means unlimited
  features jsonb DEFAULT '{}',
  badges text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  payment_reference text,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Paystack transactions table
CREATE TABLE IF NOT EXISTS paystack_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference text UNIQUE NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'GHS',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  gateway_response jsonb DEFAULT '{}',
  purpose text NOT NULL CHECK (purpose IN ('credit_purchase', 'subscription', 'feature_purchase')),
  purpose_id uuid, -- References credit_purchases, user_subscriptions, or feature_purchases
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  reference text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Credit packages (public read)
CREATE POLICY "Anyone can view active credit packages"
  ON credit_packages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User credits (own data only)
CREATE POLICY "Users can view own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Credit transactions (own data only)
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Credit purchases (own data only)
CREATE POLICY "Users can view own credit purchases"
  ON credit_purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create credit purchases"
  ON credit_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Feature purchases (own data only)
CREATE POLICY "Users can view own feature purchases"
  ON feature_purchases
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Subscription plans (public read)
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User subscriptions (own data only)
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Paystack transactions (own data only)
CREATE POLICY "Users can view own paystack transactions"
  ON paystack_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Webhook events (service role only)
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events
  FOR ALL
  TO service_role
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_created_at_idx ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_purchases_user_id_status_idx ON credit_purchases(user_id, status);
CREATE INDEX IF NOT EXISTS feature_purchases_user_id_feature_key_idx ON feature_purchases(user_id, feature_key);
CREATE INDEX IF NOT EXISTS feature_purchases_listing_id_idx ON feature_purchases(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_status_idx ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS user_subscriptions_period_idx ON user_subscriptions(current_period_start, current_period_end);
CREATE INDEX IF NOT EXISTS paystack_transactions_reference_idx ON paystack_transactions(reference);
CREATE INDEX IF NOT EXISTS paystack_transactions_user_id_status_idx ON paystack_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON webhook_events(processed, created_at);

-- Insert default credit packages
INSERT INTO credit_packages (name, credits, price_ghs, sort_order) VALUES
  ('Starter', 50, 10, 1),
  ('Seller', 120, 20, 2),
  ('Pro', 300, 50, 3),
  ('Business', 650, 100, 4)
ON CONFLICT DO NOTHING;

-- Insert subscription plans
INSERT INTO subscription_plans (name, price_ghs, boost_credits, max_listings, features, badges, sort_order) VALUES
  (
    'Starter Business', 
    100, 
    20, 
    20, 
    '{"analytics": "basic", "auto_boost": false, "priority_support": false}',
    '["business"]',
    1
  ),
  (
    'Pro Business', 
    250, 
    80, 
    NULL, 
    '{"analytics": "advanced", "auto_boost": true, "priority_support": false, "auto_boost_days": 3}',
    '["business", "priority_seller"]',
    2
  ),
  (
    'Premium Business', 
    400, 
    150, 
    NULL, 
    '{"analytics": "full", "auto_boost": true, "priority_support": true, "homepage_placement": true, "account_manager": true}',
    '["business", "priority_seller", "premium"]',
    3
  )
ON CONFLICT DO NOTHING;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paystack_transactions_updated_at
  BEFORE UPDATE ON paystack_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RPC Functions for credit management
CREATE OR REPLACE FUNCTION add_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- Insert or update user credits
  INSERT INTO user_credits (user_id, balance, lifetime_earned)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_credits.balance + p_amount,
    lifetime_earned = user_credits.lifetime_earned + p_amount,
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, reason, reference_id, reference_type
  ) VALUES (
    p_user_id, 'earned', p_amount, v_new_balance, p_reason, p_reference_id, p_reference_type
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION spend_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id;

  -- Check if user has enough credits
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'current_balance', COALESCE(v_current_balance, 0),
      'required', p_amount
    );
  END IF;

  -- Deduct credits
  UPDATE user_credits 
  SET 
    balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id, type, amount, balance_after, reason, reference_id, reference_type
  ) VALUES (
    p_user_id, 'spent', p_amount, v_new_balance, p_reason, p_reference_id, p_reference_type
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_listing(
  p_listing_data jsonb,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active_listings_count integer;
  v_needs_payment boolean := false;
  v_listing_id uuid;
  v_credit_result jsonb;
BEGIN
  -- Count user's active listings
  SELECT COUNT(*) INTO v_active_listings_count
  FROM listings
  WHERE user_id = p_user_id AND status = 'active';

  -- Check if payment needed (more than 5 free listings)
  IF v_active_listings_count >= 5 THEN
    v_needs_payment := true;
    
    -- Try to spend 10 credits
    SELECT spend_user_credits(p_user_id, 10, 'Additional listing fee', NULL, 'listing') INTO v_credit_result;
    
    IF NOT (v_credit_result->>'success')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'insufficient_credits',
        'needs_payment', true,
        'required_credits', 10,
        'current_balance', COALESCE((v_credit_result->>'current_balance')::integer, 0)
      );
    END IF;
  END IF;

  -- Create the listing
  INSERT INTO listings (
    user_id,
    title,
    description,
    price,
    currency,
    category_id,
    condition,
    quantity,
    location,
    images,
    accept_offers,
    status
  ) VALUES (
    p_user_id,
    p_listing_data->>'title',
    p_listing_data->>'description',
    (p_listing_data->>'price')::numeric,
    COALESCE(p_listing_data->>'currency', 'GHS'),
    (p_listing_data->>'category_id')::uuid,
    p_listing_data->>'condition',
    COALESCE((p_listing_data->>'quantity')::integer, 1),
    p_listing_data->>'location',
    COALESCE(p_listing_data->'images', '[]'::jsonb),
    COALESCE((p_listing_data->>'accept_offers')::boolean, true),
    COALESCE(p_listing_data->>'status', 'active')
  ) RETURNING id INTO v_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'needs_payment', v_needs_payment,
    'credits_charged', CASE WHEN v_needs_payment THEN 10 ELSE 0 END,
    'new_balance', CASE WHEN v_needs_payment THEN (v_credit_result->>'new_balance')::integer ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION purchase_feature(
  p_user_id uuid,
  p_feature_key text,
  p_credits integer,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit_result jsonb;
  v_purchase_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Calculate expiration based on feature
  CASE p_feature_key
    WHEN 'pulse_boost_24h' THEN v_expires_at := now() + interval '24 hours';
    WHEN 'mega_pulse_7d' THEN v_expires_at := now() + interval '7 days';
    WHEN 'category_spotlight_3d' THEN v_expires_at := now() + interval '3 days';
    WHEN 'auto_refresh_30d' THEN v_expires_at := now() + interval '30 days';
    ELSE v_expires_at := NULL;
  END CASE;

  -- Spend credits
  SELECT spend_user_credits(p_user_id, p_credits, 'Feature purchase: ' || p_feature_key, NULL, 'feature') INTO v_credit_result;
  
  IF NOT (v_credit_result->>'success')::boolean THEN
    RETURN v_credit_result;
  END IF;

  -- Record feature purchase
  INSERT INTO feature_purchases (
    user_id, feature_key, credits_spent, metadata, expires_at
  ) VALUES (
    p_user_id, p_feature_key, p_credits, p_metadata, v_expires_at
  ) RETURNING id INTO v_purchase_id;

  -- Apply feature effects
  IF p_feature_key LIKE '%boost%' OR p_feature_key LIKE '%spotlight%' THEN
    UPDATE listings 
    SET boost_expires_at = v_expires_at
    WHERE id = (p_metadata->>'listing_id')::uuid;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'expires_at', v_expires_at,
    'new_balance', (v_credit_result->>'new_balance')::integer
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credits integer := 0;
  v_subscription record;
  v_entitlements jsonb := '{}';
  v_badges text[] := '{}';
  v_max_listings integer := 5; -- Default free limit
  v_boost_credits integer := 0;
BEGIN
  -- Get credit balance
  SELECT balance INTO v_credits
  FROM user_credits
  WHERE user_id = p_user_id;

  -- Get active subscription
  SELECT s.*, p.name as plan_name, p.features, p.badges, p.max_listings, p.boost_credits
  INTO v_subscription
  FROM user_subscriptions s
  JOIN subscription_plans p ON s.plan_id = p.id
  WHERE s.user_id = p_user_id 
    AND s.status = 'active' 
    AND s.current_period_end > now()
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Build entitlements
  v_entitlements := jsonb_build_object(
    'credits', COALESCE(v_credits, 0),
    'has_subscription', v_subscription.id IS NOT NULL
  );

  IF v_subscription.id IS NOT NULL THEN
    v_badges := v_subscription.badges;
    v_max_listings := COALESCE(v_subscription.max_listings, 999999); -- Unlimited
    v_boost_credits := v_subscription.boost_credits;
    
    v_entitlements := v_entitlements || jsonb_build_object(
      'subscription', jsonb_build_object(
        'plan_name', v_subscription.plan_name,
        'expires_at', v_subscription.current_period_end,
        'features', v_subscription.features
      )
    );
  END IF;

  v_entitlements := v_entitlements || jsonb_build_object(
    'badges', to_jsonb(v_badges),
    'max_listings', v_max_listings,
    'boost_credits', v_boost_credits,
    'analytics_tier', CASE 
      WHEN v_subscription.features->>'analytics' = 'full' THEN 'full'
      WHEN v_subscription.features->>'analytics' = 'advanced' THEN 'advanced'
      WHEN v_subscription.features->>'analytics' = 'basic' THEN 'basic'
      ELSE 'none'
    END,
    'priority_support', COALESCE((v_subscription.features->>'priority_support')::boolean, false),
    'auto_boost', COALESCE((v_subscription.features->>'auto_boost')::boolean, false)
  );

  RETURN v_entitlements;
END;
$$;

CREATE OR REPLACE FUNCTION complete_credit_purchase(
  p_purchase_id uuid,
  p_payment_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_purchase record;
  v_result jsonb;
BEGIN
  -- Get purchase details
  SELECT * INTO v_purchase
  FROM credit_purchases
  WHERE id = p_purchase_id AND status = 'pending';

  IF v_purchase.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'purchase_not_found');
  END IF;

  -- Add credits to user
  SELECT add_user_credits(
    v_purchase.user_id,
    v_purchase.credits,
    'Credit package purchase: ' || (SELECT name FROM credit_packages WHERE id = v_purchase.package_id),
    p_payment_reference,
    'purchase'
  ) INTO v_result;

  -- Update purchase status
  UPDATE credit_purchases
  SET 
    status = 'completed',
    payment_reference = p_payment_reference,
    completed_at = now()
  WHERE id = p_purchase_id;

  RETURN v_result;
END;
$$;

-- Initialize user credits for existing users
INSERT INTO user_credits (user_id, balance, lifetime_earned)
SELECT id, 0, 0
FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Trigger to create user credits for new users
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_user_credits_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_credits();