-- =============================================
-- FIX LISTING FEATURES CREDITS
-- =============================================
-- Update feature credits to match correct pricing for regular users
-- Note: Sellar Pro users get these for FREE (handled in application logic)

UPDATE listing_features
SET 
  credits = CASE 
    WHEN key = 'pulse_boost_24h' THEN 15
    WHEN key = 'mega_pulse_7d' THEN 50
    WHEN key = 'category_spotlight_3d' THEN 35
    WHEN key = 'ad_refresh' THEN 5
    WHEN key = 'listing_highlight' THEN 10
    WHEN key = 'urgent_badge' THEN 8
    ELSE credits
  END,
  updated_at = NOW()
WHERE key IN ('pulse_boost_24h', 'mega_pulse_7d', 'category_spotlight_3d', 'ad_refresh', 'listing_highlight', 'urgent_badge');

-- Verify the update
DO $$
BEGIN
  RAISE NOTICE 'Feature credits updated successfully:';
  RAISE NOTICE 'Pulse Boost: % credits', (SELECT credits FROM listing_features WHERE key = 'pulse_boost_24h');
  RAISE NOTICE 'Mega Pulse: % credits', (SELECT credits FROM listing_features WHERE key = 'mega_pulse_7d');
  RAISE NOTICE 'Category Spotlight: % credits', (SELECT credits FROM listing_features WHERE key = 'category_spotlight_3d');
  RAISE NOTICE 'Ad Refresh: % credits', (SELECT credits FROM listing_features WHERE key = 'ad_refresh');
  RAISE NOTICE 'Listing Highlight: % credits', (SELECT credits FROM listing_features WHERE key = 'listing_highlight');
  RAISE NOTICE 'Urgent Badge: % credits', (SELECT credits FROM listing_features WHERE key = 'urgent_badge');
END $$;

