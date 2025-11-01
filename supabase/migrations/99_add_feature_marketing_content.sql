-- =============================================
-- ADD MARKETING CONTENT TO LISTING FEATURES
-- =============================================
-- Add additional fields for rich feature information display

-- Add new columns to listing_features table
ALTER TABLE listing_features 
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS visibility_boost VARCHAR(50),
ADD COLUMN IF NOT EXISTS how_it_works JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS value_proposition TEXT,
ADD COLUMN IF NOT EXISTS ghs_equivalent DECIMAL(10, 2);

-- Update existing features with rich content
UPDATE listing_features
SET 
  headline = '⚡ Get 2-3x More Views in 24 Hours!',
  tagline = 'Most sellers see 2-3x more views within the first 24 hours',
  visibility_boost = '2-3x Higher',
  how_it_works = '[
    {"step": 1, "title": "Select Your Listing", "description": "Choose which listing you want to boost"},
    {"step": 2, "title": "Instant Activation", "description": "Feature activates immediately after purchase"},
    {"step": 3, "title": "Watch Results Roll In", "description": "Track views and inquiries in real-time"}
  ]'::jsonb,
  value_proposition = 'Sell faster, get your money quicker! When your listing gets more views, you find buyers faster. The small credit cost pays for itself when you sell even just one day earlier.',
  ghs_equivalent = credits * 0.167
WHERE key = 'pulse_boost_24h';

UPDATE listing_features
SET 
  headline = '🚀 Dominate Your Category for a Week!',
  tagline = 'Stay at the top of search results for an entire week',
  visibility_boost = '5x Higher',
  how_it_works = '[
    {"step": 1, "title": "Select Your Listing", "description": "Choose which listing you want to boost"},
    {"step": 2, "title": "Instant Activation", "description": "Feature activates immediately after purchase"},
    {"step": 3, "title": "Watch Results Roll In", "description": "Track views and inquiries in real-time"}
  ]'::jsonb,
  value_proposition = 'Stay at the top for a whole week! Your listing will be seen by more people every single day. Perfect for expensive items that take time to sell, like cars, phones, or furniture.',
  ghs_equivalent = credits * 0.167
WHERE key = 'mega_pulse_7d';

UPDATE listing_features
SET 
  headline = '🎯 Be Featured in Your Category!',
  tagline = 'Your listing appears in the featured section of your category',
  visibility_boost = NULL,
  how_it_works = '[
    {"step": 1, "title": "Select Your Listing", "description": "Choose which listing you want to boost"},
    {"step": 2, "title": "Instant Activation", "description": "Feature activates immediately after purchase"},
    {"step": 3, "title": "Watch Results Roll In", "description": "Track views and inquiries in real-time"}
  ]'::jsonb,
  value_proposition = 'Get featured in your category! When people browse your category, they see your listing first. More eyes on your listing means more buyers reaching out to you.',
  ghs_equivalent = credits * 0.167
WHERE key = 'category_spotlight_3d';

UPDATE listing_features
SET 
  headline = '🔄 Move to Top Instantly!',
  tagline = 'Perfect for quick visibility boost when you need it most',
  visibility_boost = NULL,
  how_it_works = '[
    {"step": 1, "title": "Select Your Listing", "description": "Choose which listing you want to boost"},
    {"step": 2, "title": "Instant Activation", "description": "Feature activates immediately after purchase"},
    {"step": 3, "title": "Watch Results Roll In", "description": "Track views and inquiries in real-time"}
  ]'::jsonb,
  value_proposition = 'Your listing dropped down? Bring it back to the top instantly! No need to wait days for people to see your item again. Perfect for quick visibility.',
  ghs_equivalent = credits * 0.167
WHERE key = 'ad_refresh';

UPDATE listing_features
SET 
  headline = '✨ Stand Out with Golden Border!',
  tagline = 'Listings with highlights get 40% more engagement',
  visibility_boost = NULL,
  how_it_works = '[
    {"step": 1, "title": "Select Your Listing", "description": "Choose which listing you want to boost"},
    {"step": 2, "title": "Instant Activation", "description": "Feature activates immediately after purchase"},
    {"step": 3, "title": "Watch Results Roll In", "description": "Track views and inquiries in real-time"}
  ]'::jsonb,
  value_proposition = 'Make your listing shine! The special golden border makes people notice your listing among hundreds of others. It catches attention and gets more clicks.',
  ghs_equivalent = credits * 0.167
WHERE key = 'listing_highlight';

UPDATE listing_features
SET 
  headline = '🔥 Create Urgency, Sell Faster!',
  tagline = 'Urgent badges increase response rates by 60%',
  visibility_boost = NULL,
  how_it_works = '[
    {"step": 1, "title": "Select Your Listing", "description": "Choose which listing you want to boost"},
    {"step": 2, "title": "Instant Activation", "description": "Feature activates immediately after purchase"},
    {"step": 3, "title": "Watch Results Roll In", "description": "Track views and inquiries in real-time"}
  ]'::jsonb,
  value_proposition = 'Make buyers act fast! The urgent badge tells buyers "don''t wait, this might be gone soon!" People respond quicker when they think they might miss out.',
  ghs_equivalent = credits * 0.167
WHERE key = 'urgent_badge';

-- Add comments for new columns
COMMENT ON COLUMN listing_features.headline IS 'Compelling marketing headline for the feature info modal';
COMMENT ON COLUMN listing_features.tagline IS 'Short description that supports the headline';
COMMENT ON COLUMN listing_features.visibility_boost IS 'e.g., "2-3x Higher" or "5x Higher" for visibility features';
COMMENT ON COLUMN listing_features.how_it_works IS 'JSON array of steps explaining the feature activation process';
COMMENT ON COLUMN listing_features.value_proposition IS 'Why the feature is worth purchasing - the value to the user';
COMMENT ON COLUMN listing_features.ghs_equivalent IS 'Equivalent cost in Ghana Cedis (GHS)';

-- Create function to auto-calculate GHS equivalent when credits change
CREATE OR REPLACE FUNCTION calculate_ghs_equivalent()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ghs_equivalent := NEW.credits * 0.167;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate GHS equivalent
DROP TRIGGER IF EXISTS trigger_calculate_ghs_equivalent ON listing_features;
CREATE TRIGGER trigger_calculate_ghs_equivalent
  BEFORE INSERT OR UPDATE OF credits ON listing_features
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ghs_equivalent();

COMMENT ON FUNCTION calculate_ghs_equivalent IS 'Automatically calculates GHS equivalent when credits are inserted or updated';

