-- Migration 42: Add 'trialing' status to user_subscriptions table
-- This fixes the issue where free trial users couldn't be shown in Featured Listings

-- =============================================
-- 1. ADD 'trialing' STATUS TO CHECK CONSTRAINT
-- =============================================

-- Drop the existing check constraint
ALTER TABLE user_subscriptions 
DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

-- Add new check constraint with 'trialing' included
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_status_check 
CHECK (status IN ('active', 'trialing', 'cancelled', 'expired', 'past_due'));

-- =============================================
-- 2. ADD TRIAL COLUMNS IF THEY DON'T EXIST
-- =============================================

-- Add trial_start column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'trial_start'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN trial_start TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add trial_end column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'trial_end'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN trial_end TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- =============================================
-- 3. ADD INDEX FOR EFFICIENT QUERIES
-- =============================================

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
ON user_subscriptions(status);

-- Add composite index for status + user_id
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status 
ON user_subscriptions(user_id, status);

-- =============================================
-- 4. ADD RLS POLICIES FOR PUBLIC ACCESS
-- =============================================

-- ✅ CRITICAL FIX: Enable RLS but allow everyone to view subscriptions
-- This is needed for Featured Listings to work for all users

-- Enable RLS if not already enabled
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view subscriptions for featured listings" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own subscription" ON user_subscriptions;

-- ✅ Allow EVERYONE to view subscriptions (for Featured Listings)
-- This is safe because subscription info is needed for public features
CREATE POLICY "Anyone can view active subscriptions" 
ON user_subscriptions FOR SELECT 
USING (status IN ('active', 'trialing', 'cancelled'));

-- ✅ Users can view their own subscription details
CREATE POLICY "Users can view own subscription details" 
ON user_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- ✅ Only authenticated users can insert their own subscriptions
CREATE POLICY "Users can create their own subscription" 
ON user_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ✅ Users can update their own subscriptions
CREATE POLICY "Users can update their own subscription" 
ON user_subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

-- =============================================
-- 5. ADD RLS POLICIES FOR SUBSCRIPTION_PLANS
-- =============================================

-- Enable RLS on subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;

-- Allow everyone to view active plans (needed for public display)
CREATE POLICY "Anyone can view active subscription plans" 
ON subscription_plans FOR SELECT 
USING (is_active = true);

-- =============================================
-- 6. VERIFICATION QUERIES
-- =============================================

-- Check the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'user_subscriptions_status_check';

-- Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('user_subscriptions', 'subscription_plans')
ORDER BY tablename, policyname;

-- Count subscriptions by status
SELECT 
  status, 
  COUNT(*) as count
FROM user_subscriptions 
GROUP BY status
ORDER BY count DESC;

