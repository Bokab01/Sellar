-- =============================================
-- ENHANCE CREDIT PACKAGES TABLE
-- =============================================
-- Add fields to support dynamic package management from admin dashboard

-- Add new columns to credit_packages
ALTER TABLE credit_packages
ADD COLUMN IF NOT EXISTS popular BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS icon_key VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on display_order for efficient sorting
CREATE INDEX IF NOT EXISTS idx_credit_packages_display_order ON credit_packages(display_order, is_active);

-- Update existing packages with default values
UPDATE credit_packages
SET 
  popular = CASE 
    WHEN name = 'Seller' THEN true 
    ELSE false 
  END,
  display_order = CASE 
    WHEN name = 'Starter' THEN 1
    WHEN name = 'Seller' THEN 2
    WHEN name = 'Plus' THEN 3
    WHEN name = 'Max' THEN 4
    ELSE 0
  END,
  icon_key = CASE 
    WHEN name = 'Starter' THEN 'starter'
    WHEN name = 'Seller' THEN 'seller'
    WHEN name = 'Plus' THEN 'plus'
    WHEN name = 'Max' THEN 'max'
    ELSE NULL
  END
WHERE updated_at IS NULL;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_credit_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credit_packages_updated_at
  BEFORE UPDATE ON credit_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_packages_updated_at();

-- Add RLS policies for credit_packages (read-only for all authenticated users)
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active packages
CREATE POLICY "Allow authenticated users to read active credit packages"
  ON credit_packages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Note: Admin modifications will be handled via service role key in the admin dashboard
-- No need for additional policies here

-- Update existing packages with new columns
UPDATE credit_packages SET 
  popular = CASE 
    WHEN name = 'Seller' THEN true 
    ELSE false 
  END,
  display_order = CASE 
    WHEN name = 'Starter' THEN 1
    WHEN name = 'Seller' THEN 2
    WHEN name = 'Plus' THEN 3
    WHEN name = 'Max' THEN 4
    ELSE 99
  END,
  icon_key = CASE 
    WHEN name = 'Starter' THEN 'starter'
    WHEN name = 'Seller' THEN 'seller'
    WHEN name = 'Plus' THEN 'plus'
    WHEN name = 'Max' THEN 'max'
    ELSE 'default'
  END
WHERE popular IS NULL OR display_order IS NULL OR icon_key IS NULL;

COMMENT ON TABLE credit_packages IS 'Credit packages that can be purchased by users. Managed by admin dashboard.';
COMMENT ON COLUMN credit_packages.popular IS 'Whether to display this package as "Most Popular" in the UI';
COMMENT ON COLUMN credit_packages.display_order IS 'Order in which packages should be displayed (lower = first)';
COMMENT ON COLUMN credit_packages.icon_key IS 'Key for determining which icon to show in the UI';

