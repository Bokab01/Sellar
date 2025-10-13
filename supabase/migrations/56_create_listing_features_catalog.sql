-- =============================================
-- LISTING FEATURES CATALOG
-- =============================================
-- Create dynamic listing features catalog for admin management

-- Create listing_features table
CREATE TABLE listing_features (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL CHECK (credits >= 0),
  duration_hours INTEGER,  -- NULL for instant features
  icon_emoji VARCHAR(10),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(50) DEFAULT 'visibility',  -- visibility, enhancement
  pro_benefit TEXT,  -- Description of benefit for Sellar Pro users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_listing_features_active ON listing_features(is_active, display_order);
CREATE INDEX idx_listing_features_category ON listing_features(category, is_active);

-- Insert seed data (matching current hardcoded values for REGULAR users)
-- Note: Sellar Pro users get these for FREE (auto-refresh benefit)
INSERT INTO listing_features (key, name, description, credits, duration_hours, icon_emoji, display_order, category, pro_benefit) VALUES
-- Core visibility features
('pulse_boost_24h', 'Pulse Boost', '24-hour visibility boost', 15, 24, '⚡', 1, 'visibility', 'Auto-refresh every 2 hours'),
('mega_pulse_7d', 'Mega Pulse', '7-day mega visibility boost', 50, 168, '🚀', 2, 'visibility', 'Auto-refresh every 2 hours'),
('category_spotlight_3d', 'Category Spotlight', '3-day category spotlight', 35, 72, '🎯', 3, 'visibility', 'Auto-refresh every 2 hours'),
('ad_refresh', 'Ad Refresh', 'Instantly move listing to top of search results', 5, NULL, '🔄', 4, 'visibility', 'Auto-refresh every 2 hours'),

-- Enhancement features
('listing_highlight', 'Listing Highlight', 'Highlight listing with colored border', 10, 168, '✨', 5, 'enhancement', NULL),
('urgent_badge', 'Urgent Badge', 'Add "Urgent Sale" badge to listing', 8, 72, '🔥', 6, 'enhancement', NULL);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_listing_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_features_updated_at
  BEFORE UPDATE ON listing_features
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_features_updated_at();

-- Add RLS policies
ALTER TABLE listing_features ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active features
CREATE POLICY "Allow authenticated users to read active listing features"
  ON listing_features
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Note: Admin modifications will be handled via service role key in the admin dashboard
-- No need for additional policies here

-- Add comments
COMMENT ON TABLE listing_features IS 'Catalog of listing boost features that users can purchase. Managed by admin dashboard.';
COMMENT ON COLUMN listing_features.key IS 'Unique identifier used in code (e.g., pulse_boost_24h)';
COMMENT ON COLUMN listing_features.credits IS 'Credit cost for regular users. Sellar Pro users get features based on their plan.';
COMMENT ON COLUMN listing_features.duration_hours IS 'Feature duration in hours. NULL for instant features like ad_refresh.';
COMMENT ON COLUMN listing_features.pro_benefit IS 'Description of how Sellar Pro users benefit from this feature';
COMMENT ON COLUMN listing_features.category IS 'Feature category: visibility (boosts) or enhancement (badges/highlights)';

-- Create view for feature pricing that considers user subscription
CREATE OR REPLACE VIEW user_feature_pricing AS
SELECT 
  lf.*,
  CASE 
    WHEN s.status = 'active' THEN 0  -- Sellar Pro users get free features (as per memory)
    ELSE lf.credits
  END AS effective_credits
FROM listing_features lf
CROSS JOIN LATERAL (
  SELECT status 
  FROM user_subscriptions 
  WHERE user_id = auth.uid() 
    AND status = 'active'
  LIMIT 1
) s;

COMMENT ON VIEW user_feature_pricing IS 'Shows feature pricing adjusted for current user subscription status';

