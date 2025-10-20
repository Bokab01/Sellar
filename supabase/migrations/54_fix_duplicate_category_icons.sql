-- =============================================
-- FIX DUPLICATE CATEGORY ICONS
-- =============================================
-- This migration fixes duplicate icons in main categories
-- to ensure each category has a unique, meaningful icon

-- Update Jobs & Freelance to use 'clock' instead of 'briefcase'
UPDATE categories 
SET icon = 'clock' 
WHERE id = '00000000-0000-4000-8000-000000000011' 
AND name = 'Jobs & Freelance';

-- Update Pets & Animals to use 'bone' instead of 'heart'
UPDATE categories 
SET icon = 'bone' 
WHERE id = '00000000-0000-4000-8000-000000000013' 
AND name = 'Pets & Animals';

-- Update Industrial & Business to use 'cog' instead of 'briefcase'
UPDATE categories 
SET icon = 'cog' 
WHERE id = '00000000-0000-4000-8000-000000000014' 
AND name = 'Industrial & Business';

-- Update Digital Products & Software to use 'laptop' instead of 'smartphone'
UPDATE categories 
SET icon = 'laptop' 
WHERE id = '00000000-0000-4000-8000-000000000016' 
AND name = 'Digital Products & Software';

-- Verify the changes
SELECT 
  name,
  icon,
  CASE 
    WHEN icon = 'smartphone' THEN '📱 Electronics'
    WHEN icon = 'car' THEN '🚗 Vehicles'
    WHEN icon = 'home' THEN '🏠 Real Estate'
    WHEN icon = 'shirt' THEN '👕 Fashion'
    WHEN icon = 'armchair' THEN '🪑 Home & Furniture'
    WHEN icon = 'heart' THEN '❤️ Health & Beauty'
    WHEN icon = 'dumbbell' THEN '🏋️ Sports'
    WHEN icon = 'baby' THEN '👶 Baby & Kids'
    WHEN icon = 'book' THEN '📚 Books & Media'
    WHEN icon = 'briefcase' THEN '💼 Services'
    WHEN icon = 'clock' THEN '⏰ Jobs & Freelance'
    WHEN icon = 'utensils' THEN '🍽️ Food & Agriculture'
    WHEN icon = 'bone' THEN '🦴 Pets & Animals'
    WHEN icon = 'cog' THEN '⚙️ Industrial & Business'
    WHEN icon = 'ticket' THEN '🎫 Tickets & Events'
    WHEN icon = 'laptop' THEN '💻 Digital Products'
    WHEN icon = 'palette' THEN '🎨 Collectibles & Hobbies'
    WHEN icon = 'grid' THEN '📦 Miscellaneous'
    ELSE '❓ Unknown'
  END as icon_description
FROM categories 
WHERE parent_id IS NULL 
ORDER BY sort_order;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT '🎉 Category icons updated successfully! All main categories now have unique icons.' as status;
