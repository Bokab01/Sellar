-- =============================================
-- ENHANCE SUBSCRIPTION PLANS TABLE
-- =============================================
-- Add fields to support dynamic plan management from admin dashboard

-- Add new columns to subscription_plans
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS popular BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS icon_key VARCHAR(50),
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_listings INTEGER,  -- NULL = unlimited
ADD COLUMN IF NOT EXISTS highlights TEXT[],  -- Array of highlight points
ADD COLUMN IF NOT EXISTS badge_text VARCHAR(50),  -- e.g., "PRO", "PREMIUM"
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on display_order for efficient sorting
CREATE INDEX IF NOT EXISTS idx_subscription_plans_display_order ON subscription_plans(display_order, is_active);

-- Update existing Sellar Pro plan with default values
UPDATE subscription_plans
SET 
  popular = true,
  display_order = 1,
  icon_key = 'sellar_pro',
  trial_days = 7,  -- 7-day free trial
  max_listings = NULL,  -- unlimited
  highlights = ARRAY[
    'Auto-refresh every 2 hours (stays at top)',
    'Unlimited listings',
    'Comprehensive analytics dashboard',
    'Priority support',
    'Homepage placement',
    'Premium branding',
    'Sponsored posts',
    'Bulk operations'
  ],
  badge_text = 'PRO',
  updated_at = NOW()
WHERE name = 'Sellar Pro' AND updated_at IS NULL;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Add RLS policies for subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active plans
CREATE POLICY "Allow authenticated users to read active subscription plans"
  ON subscription_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Note: Admin modifications will be handled via service role key in the admin dashboard
-- No need for additional policies here

COMMENT ON TABLE subscription_plans IS 'Subscription plans (Sellar Pro, etc.) that users can purchase. Managed by admin dashboard.';
COMMENT ON COLUMN subscription_plans.popular IS 'Whether to display this plan as "Most Popular" in the UI';
COMMENT ON COLUMN subscription_plans.display_order IS 'Order in which plans should be displayed (lower = first)';
COMMENT ON COLUMN subscription_plans.icon_key IS 'Key for determining which icon to show in the UI';
COMMENT ON COLUMN subscription_plans.trial_days IS 'Number of free trial days (0 = no trial)';
COMMENT ON COLUMN subscription_plans.max_listings IS 'Maximum listings allowed (NULL = unlimited)';
COMMENT ON COLUMN subscription_plans.highlights IS 'Array of highlight points to display in UI';
COMMENT ON COLUMN subscription_plans.badge_text IS 'Text to display on PRO badge (e.g., "PRO", "PREMIUM")';

