-- =============================================
-- ADD CATEGORY IMAGES SUPPORT
-- =============================================
-- This migration adds image URL support for categories

-- Add image_url column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add color column for category theming (optional)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS color VARCHAR(7); -- e.g., '#FF5733'

-- Add description column for better UX (optional)
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Example: Update some categories with image URLs
-- (Replace these URLs with your actual hosted images)

-- Electronics & Gadgets
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/electronics.png',
    color = '#4A90E2',
    description = 'Phones, computers, cameras, and more'
WHERE id = '00000000-0000-4000-8000-000000000001';

-- Vehicles
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/vehicles.png',
    color = '#E74C3C',
    description = 'Cars, motorcycles, and vehicle parts'
WHERE id = '00000000-0000-4000-8000-000000000002';

-- Real Estate & Property
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/real-estate.png',
    color = '#27AE60',
    description = 'Properties for sale and rent'
WHERE id = '00000000-0000-4000-8000-000000000003';

-- Fashion & Clothing
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/fashion.png',
    color = '#9B59B6',
    description = 'Clothing, shoes, and accessories'
WHERE id = '00000000-0000-4000-8000-000000000004';

-- Home & Furniture
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/home-furniture.png',
    color = '#F39C12',
    description = 'Furniture and home decor'
WHERE id = '00000000-0000-4000-8000-000000000005';

-- Health & Beauty
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/health-beauty.png',
    color = '#E91E63',
    description = 'Skincare, makeup, and wellness'
WHERE id = '00000000-0000-4000-8000-000000000006';

-- Sports & Outdoors
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/sports.png',
    color = '#FF5722',
    description = 'Fitness gear and outdoor equipment'
WHERE id = '00000000-0000-4000-8000-000000000007';

-- Baby, Kids & Toys
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/baby-kids.png',
    color = '#FFEB3B',
    description = 'Baby gear, toys, and kids items'
WHERE id = '00000000-0000-4000-8000-000000000008';

-- Books, Media & Education
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/books-media.png',
    color = '#795548',
    description = 'Books, music, and educational materials'
WHERE id = '00000000-0000-4000-8000-000000000009';

-- Services
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/services.png',
    color = '#607D8B',
    description = 'Professional and home services'
WHERE id = '00000000-0000-4000-8000-000000000010';

-- Jobs & Freelance
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/jobs.png',
    color = '#3F51B5',
    description = 'Job listings and freelance opportunities'
WHERE id = '00000000-0000-4000-8000-000000000011';

-- Food & Agriculture
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/food-agriculture.png',
    color = '#8BC34A',
    description = 'Food items and agricultural products'
WHERE id = '00000000-0000-4000-8000-000000000012';

-- Pets & Animals
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/pets.png',
    color = '#FF9800',
    description = 'Pets, pet supplies, and livestock'
WHERE id = '00000000-0000-4000-8000-000000000013';

-- Industrial & Business
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/industrial.png',
    color = '#455A64',
    description = 'Business equipment and industrial supplies'
WHERE id = '00000000-0000-4000-8000-000000000014';

-- Tickets & Events
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/tickets-events.png',
    color = '#E91E63',
    description = 'Event tickets and experiences'
WHERE id = '00000000-0000-4000-8000-000000000015';

-- Digital Products & Software
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/digital-products.png',
    color = '#00BCD4',
    description = 'Apps, software, and digital downloads'
WHERE id = '00000000-0000-4000-8000-000000000016';

-- Collectibles & Hobbies
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/collectibles.png',
    color = '#FFC107',
    description = 'Art, antiques, and collectibles'
WHERE id = '00000000-0000-4000-8000-000000000017';

-- Miscellaneous
UPDATE categories 
SET image_url = 'https://your-cdn.com/categories/miscellaneous.png',
    color = '#9E9E9E',
    description = 'Everything else'
WHERE id = '00000000-0000-4000-8000-000000000018';

-- Success message
SELECT '✅ Category images support added successfully!' as status;

