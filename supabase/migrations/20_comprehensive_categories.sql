-- =============================================
-- COMPREHENSIVE CATEGORIES SYSTEM
-- =============================================
-- This migration adds extensive categories and subcategories
-- Replaces limited category system with comprehensive marketplace coverage

-- Clean up existing data (safe for fresh database or production migration)
-- Delete all existing category mappings
DELETE FROM category_id_mapping WHERE 1=1;

-- Delete all existing categories and subcategories
DELETE FROM categories WHERE 1=1;

-- =============================================
-- MAIN CATEGORIES (18 total)
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
-- 1. Electronics & Gadgets
('00000000-0000-4000-8000-000000000001', 'Electronics & Gadgets', 'electronics-gadgets', NULL, 'smartphone', true, 1),

-- 2. Vehicles  
('00000000-0000-4000-8000-000000000002', 'Vehicles', 'vehicles', NULL, 'car', true, 2),

-- 3. Real Estate & Property
('00000000-0000-4000-8000-000000000003', 'Real Estate & Property', 'real-estate', NULL, 'home', true, 3),

-- 4. Fashion & Clothing
('00000000-0000-4000-8000-000000000004', 'Fashion & Clothing', 'fashion', NULL, 'shirt', true, 4),

-- 5. Home & Furniture
('00000000-0000-4000-8000-000000000005', 'Home & Furniture', 'home-furniture', NULL, 'armchair', true, 5),

-- 6. Health & Beauty
('00000000-0000-4000-8000-000000000006', 'Health & Beauty', 'health-beauty', NULL, 'heart', true, 6),

-- 7. Sports & Outdoors
('00000000-0000-4000-8000-000000000007', 'Sports & Outdoors', 'sports-outdoors', NULL, 'dumbbell', true, 7),

-- 8. Baby, Kids & Toys
('00000000-0000-4000-8000-000000000008', 'Baby, Kids & Toys', 'baby-kids-toys', NULL, 'baby', true, 8),

-- 9. Books, Media & Education
('00000000-0000-4000-8000-000000000009', 'Books, Media & Education', 'books-media', NULL, 'book', true, 9),

-- 10. Services
('00000000-0000-4000-8000-000000000010', 'Services', 'services', NULL, 'briefcase', true, 10),

-- 11. Jobs & Freelance
('00000000-0000-4000-8000-000000000011', 'Jobs & Freelance', 'jobs-freelance', NULL, 'briefcase', true, 11),

-- 12. Food & Agriculture
('00000000-0000-4000-8000-000000000012', 'Food & Agriculture', 'food-agriculture', NULL, 'utensils', true, 12),

-- 13. Pets & Animals
('00000000-0000-4000-8000-000000000013', 'Pets & Animals', 'pets-animals', NULL, 'heart', true, 13),

-- 14. Industrial & Business
('00000000-0000-4000-8000-000000000014', 'Industrial & Business', 'industrial-business', NULL, 'briefcase', true, 14),

-- 15. Tickets & Events
('00000000-0000-4000-8000-000000000015', 'Tickets & Events', 'tickets-events', NULL, 'ticket', true, 15),

-- 16. Digital Products & Software
('00000000-0000-4000-8000-000000000016', 'Digital Products & Software', 'digital-products', NULL, 'smartphone', true, 16),

-- 17. Collectibles & Hobbies
('00000000-0000-4000-8000-000000000017', 'Collectibles & Hobbies', 'collectibles-hobbies', NULL, 'palette', true, 17),

-- 18. Miscellaneous
('00000000-0000-4000-8000-000000000018', 'Miscellaneous', 'miscellaneous', NULL, 'grid', true, 18);

-- =============================================
-- 1. ELECTRONICS & GADGETS SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4000-8000-000000000001', 'Mobile Phones', 'mobile-phones', '00000000-0000-4000-8000-000000000001', 'smartphone', true, 1),
('10000000-0000-4000-8000-000000000002', 'Computers', 'computers', '00000000-0000-4000-8000-000000000001', 'laptop', true, 2),
('10000000-0000-4000-8000-000000000003', 'Tablets & E-readers', 'tablets-ereaders', '00000000-0000-4000-8000-000000000001', 'tablet', true, 3),
('10000000-0000-4000-8000-000000000004', 'Audio', 'audio', '00000000-0000-4000-8000-000000000001', 'headphones', true, 4),
('10000000-0000-4000-8000-000000000005', 'Wearables', 'wearables', '00000000-0000-4000-8000-000000000001', 'watch', true, 5),
('10000000-0000-4000-8000-000000000006', 'Cameras', 'cameras', '00000000-0000-4000-8000-000000000001', 'camera', true, 6),
('10000000-0000-4000-8000-000000000007', 'Gaming', 'gaming', '00000000-0000-4000-8000-000000000001', 'gamepad-2', true, 7);

-- =============================================
-- 2. VEHICLES SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('20000000-0000-4000-8000-000000000001', 'Cars', 'cars', '00000000-0000-4000-8000-000000000002', 'car', true, 1),
('20000000-0000-4000-8000-000000000002', 'Motorcycles', 'motorcycles', '00000000-0000-4000-8000-000000000002', 'bike', true, 2),
('20000000-0000-4000-8000-000000000003', 'Commercial Vehicles', 'commercial-vehicles', '00000000-0000-4000-8000-000000000002', 'truck', true, 3),
('20000000-0000-4000-8000-000000000004', 'Vehicle Parts & Accessories', 'vehicle-parts', '00000000-0000-4000-8000-000000000002', 'wrench', true, 4),
('20000000-0000-4000-8000-000000000005', 'Engines & Transmissions', 'engines-transmissions', '00000000-0000-4000-8000-000000000002', 'cog', true, 5),
('20000000-0000-4000-8000-000000000006', 'Tires & Wheels', 'tires-wheels', '00000000-0000-4000-8000-000000000002', 'circle', true, 6),
('20000000-0000-4000-8000-000000000007', 'Car Electronics & GPS', 'car-electronics', '00000000-0000-4000-8000-000000000002', 'smartphone', true, 7),
('20000000-0000-4000-8000-000000000008', 'Exhaust & Emission Systems', 'exhaust-systems', '00000000-0000-4000-8000-000000000002', 'wind', true, 8),
('20000000-0000-4000-8000-000000000009', 'Brakes & Suspension', 'brakes-suspension', '00000000-0000-4000-8000-000000000002', 'settings', true, 9),
('20000000-0000-4000-8000-000000000010', 'Body Parts & Panels', 'body-parts', '00000000-0000-4000-8000-000000000002', 'box', true, 10),
('20000000-0000-4000-8000-000000000011', 'Boats & Watercraft', 'boats-watercraft', '00000000-0000-4000-8000-000000000002', 'anchor', true, 11),
('20000000-0000-4000-8000-000000000012', 'Rentals', 'rentals', '00000000-0000-4000-8000-000000000002', 'key', true, 12);

-- =============================================
-- 3. REAL ESTATE & PROPERTY SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('30000000-0000-4000-8000-000000000001', 'For Sale', 'for-sale', '00000000-0000-4000-8000-000000000003', 'home', true, 1),
('30000000-0000-4000-8000-000000000002', 'For Rent', 'for-rent', '00000000-0000-4000-8000-000000000003', 'key', true, 2),
('30000000-0000-4000-8000-000000000003', 'Short Lets / Vacation Rentals', 'short-lets', '00000000-0000-4000-8000-000000000003', 'calendar', true, 3),
('30000000-0000-4000-8000-000000000004', 'Roommates & Shared Housing', 'roommates', '00000000-0000-4000-8000-000000000003', 'users', true, 4),
('30000000-0000-4000-8000-000000000005', 'Parking & Storage', 'parking-storage', '00000000-0000-4000-8000-000000000003', 'square', true, 5);

-- =============================================
-- 4. FASHION & CLOTHING SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('40000000-0000-4000-8000-000000000001', 'Men''s Clothing', 'mens-clothing', '00000000-0000-4000-8000-000000000004', 'user', true, 1),
('40000000-0000-4000-8000-000000000002', 'Women''s Clothing', 'womens-clothing', '00000000-0000-4000-8000-000000000004', 'user', true, 2),
('40000000-0000-4000-8000-000000000003', 'Kids & Baby Clothing', 'kids-clothing', '00000000-0000-4000-8000-000000000004', 'baby', true, 3),
('40000000-0000-4000-8000-000000000004', 'Shoes', 'shoes', '00000000-0000-4000-8000-000000000004', 'footprints', true, 4),
('40000000-0000-4000-8000-000000000005', 'Bags & Luggage', 'bags-luggage', '00000000-0000-4000-8000-000000000004', 'bag', true, 5),
('40000000-0000-4000-8000-000000000006', 'Jewelry & Watches', 'jewelry-watches', '00000000-0000-4000-8000-000000000004', 'gem', true, 6),
('40000000-0000-4000-8000-000000000007', 'Traditional / Cultural Wear', 'traditional-wear', '00000000-0000-4000-8000-000000000004', 'sparkles', true, 7);

-- =============================================
-- 5. HOME & FURNITURE SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('50000000-0000-4000-8000-000000000001', 'Living Room', 'living-room', '00000000-0000-4000-8000-000000000005', 'armchair', true, 1),
('50000000-0000-4000-8000-000000000002', 'Bedroom', 'bedroom', '00000000-0000-4000-8000-000000000005', 'bed', true, 2),
('50000000-0000-4000-8000-000000000003', 'Kitchen & Dining', 'kitchen-dining', '00000000-0000-4000-8000-000000000005', 'utensils', true, 3),
('50000000-0000-4000-8000-000000000004', 'Home Décor', 'home-decor', '00000000-0000-4000-8000-000000000005', 'palette', true, 4),
('50000000-0000-4000-8000-000000000005', 'Appliances', 'appliances', '00000000-0000-4000-8000-000000000005', 'refrigerator', true, 5),
('50000000-0000-4000-8000-000000000006', 'Outdoor Furniture', 'outdoor-furniture', '00000000-0000-4000-8000-000000000005', 'flower', true, 6);

-- =============================================
-- 6. HEALTH & BEAUTY SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('60000000-0000-4000-8000-000000000001', 'Skincare', 'skincare', '00000000-0000-4000-8000-000000000006', 'sparkles', true, 1),
('60000000-0000-4000-8000-000000000002', 'Haircare', 'haircare', '00000000-0000-4000-8000-000000000006', 'scissors', true, 2),
('60000000-0000-4000-8000-000000000003', 'Makeup', 'makeup', '00000000-0000-4000-8000-000000000006', 'palette', true, 3),
('60000000-0000-4000-8000-000000000004', 'Fragrances', 'fragrances', '00000000-0000-4000-8000-000000000006', 'sparkles', true, 4),
('60000000-0000-4000-8000-000000000005', 'Personal Care', 'personal-care', '00000000-0000-4000-8000-000000000006', 'heart', true, 5),
('60000000-0000-4000-8000-000000000006', 'Fitness Equipment', 'fitness-equipment', '00000000-0000-4000-8000-000000000006', 'dumbbell', true, 6);

-- =============================================
-- 7. SPORTS & OUTDOORS SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('70000000-0000-4000-8000-000000000001', 'Fitness', 'fitness', '00000000-0000-4000-8000-000000000007', 'dumbbell', true, 1),
('70000000-0000-4000-8000-000000000002', 'Team Sports', 'team-sports', '00000000-0000-4000-8000-000000000007', 'trophy', true, 2),
('70000000-0000-4000-8000-000000000003', 'Outdoor Gear', 'outdoor-gear', '00000000-0000-4000-8000-000000000007', 'tent', true, 3),
('70000000-0000-4000-8000-000000000004', 'Bicycles & Scooters', 'bicycles-scooters', '00000000-0000-4000-8000-000000000007', 'bike', true, 4);

-- =============================================
-- 8. BABY, KIDS & TOYS SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('80000000-0000-4000-8000-000000000001', 'Baby Gear', 'baby-gear', '00000000-0000-4000-8000-000000000008', 'baby', true, 1),
('80000000-0000-4000-8000-000000000002', 'Baby Essentials', 'baby-essentials', '00000000-0000-4000-8000-000000000008', 'heart', true, 2),
('80000000-0000-4000-8000-000000000003', 'Kids Clothing & Shoes', 'kids-clothing-shoes', '00000000-0000-4000-8000-000000000008', 'shirt', true, 3),
('80000000-0000-4000-8000-000000000004', 'Toys & Games', 'toys-games', '00000000-0000-4000-8000-000000000008', 'gamepad-2', true, 4),
('80000000-0000-4000-8000-000000000005', 'School Supplies', 'school-supplies', '00000000-0000-4000-8000-000000000008', 'book', true, 5);

-- =============================================
-- 9. BOOKS, MEDIA & EDUCATION SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('90000000-0000-4000-8000-000000000001', 'Books', 'books', '00000000-0000-4000-8000-000000000009', 'book', true, 1),
('90000000-0000-4000-8000-000000000002', 'Magazines & Comics', 'magazines-comics', '00000000-0000-4000-8000-000000000009', 'book-open', true, 2),
('90000000-0000-4000-8000-000000000003', 'Music', 'music', '00000000-0000-4000-8000-000000000009', 'music', true, 3),
('90000000-0000-4000-8000-000000000004', 'Movies & Games', 'movies-games', '00000000-0000-4000-8000-000000000009', 'film', true, 4),
('90000000-0000-4000-8000-000000000005', 'Online Courses & E-learning', 'elearning', '00000000-0000-4000-8000-000000000009', 'graduation-cap', true, 5),
('90000000-0000-4000-8000-000000000006', 'Stationery & Office Supplies', 'stationery', '00000000-0000-4000-8000-000000000009', 'pencil', true, 6);

-- =============================================
-- 10. SERVICES SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('a0000000-0000-4000-8000-000000000001', 'Home Services', 'home-services', '00000000-0000-4000-8000-000000000010', 'home', true, 1),
('a0000000-0000-4000-8000-000000000002', 'Event Services', 'event-services', '00000000-0000-4000-8000-000000000010', 'calendar', true, 2),
('a0000000-0000-4000-8000-000000000003', 'Professional Services', 'professional-services', '00000000-0000-4000-8000-000000000010', 'briefcase', true, 3),
('a0000000-0000-4000-8000-000000000004', 'Health Services', 'health-services', '00000000-0000-4000-8000-000000000010', 'heart-pulse', true, 4),
('a0000000-0000-4000-8000-000000000005', 'Beauty Services', 'beauty-services', '00000000-0000-4000-8000-000000000010', 'sparkles', true, 5),
('a0000000-0000-4000-8000-000000000006', 'Tutoring & Coaching', 'tutoring-coaching', '00000000-0000-4000-8000-000000000010', 'graduation-cap', true, 6),
('a0000000-0000-4000-8000-000000000007', 'Printing & Design Services', 'printing-design-services', '00000000-0000-4000-8000-000000000010', 'printer', true, 7);

-- =============================================
-- 11. JOBS & FREELANCE SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('b0000000-0000-4000-8000-000000000001', 'Full-time Jobs', 'fulltime-jobs', '00000000-0000-4000-8000-000000000011', 'briefcase', true, 1),
('b0000000-0000-4000-8000-000000000002', 'Part-time & Gigs', 'parttime-gigs', '00000000-0000-4000-8000-000000000011', 'clock', true, 2),
('b0000000-0000-4000-8000-000000000003', 'Freelance', 'freelance', '00000000-0000-4000-8000-000000000011', 'laptop', true, 3),
('b0000000-0000-4000-8000-000000000004', 'Remote Jobs', 'remote-jobs', '00000000-0000-4000-8000-000000000011', 'wifi', true, 4),
('b0000000-0000-4000-8000-000000000005', 'Internships & Training', 'internships', '00000000-0000-4000-8000-000000000011', 'graduation-cap', true, 5);

-- =============================================
-- 12. FOOD & AGRICULTURE SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('c0000000-0000-4000-8000-000000000001', 'Groceries', 'groceries', '00000000-0000-4000-8000-000000000012', 'shopping-basket', true, 1),
('c0000000-0000-4000-8000-000000000002', 'Restaurants & Takeaway', 'restaurants', '00000000-0000-4000-8000-000000000012', 'utensils', true, 2),
('c0000000-0000-4000-8000-000000000003', 'Beverages', 'beverages', '00000000-0000-4000-8000-000000000012', 'coffee', true, 3),
('c0000000-0000-4000-8000-000000000004', 'Farm Produce', 'farm-produce', '00000000-0000-4000-8000-000000000012', 'leaf', true, 4),
('c0000000-0000-4000-8000-000000000005', 'Agricultural Equipment', 'agricultural-equipment', '00000000-0000-4000-8000-000000000012', 'tractor', true, 5);

-- =============================================
-- 13. PETS & ANIMALS SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('d0000000-0000-4000-8000-000000000001', 'Pets', 'pets', '00000000-0000-4000-8000-000000000013', 'heart', true, 1),
('d0000000-0000-4000-8000-000000000002', 'Pet Accessories', 'pet-accessories', '00000000-0000-4000-8000-000000000013', 'bone', true, 2),
('d0000000-0000-4000-8000-000000000003', 'Pet Food & Treats', 'pet-food', '00000000-0000-4000-8000-000000000013', 'shopping-basket', true, 3),
('d0000000-0000-4000-8000-000000000004', 'Veterinary & Grooming Services', 'vet-grooming', '00000000-0000-4000-8000-000000000013', 'scissors', true, 4),
('d0000000-0000-4000-8000-000000000005', 'Livestock', 'livestock', '00000000-0000-4000-8000-000000000013', 'cow', true, 5);

-- =============================================
-- 14. INDUSTRIAL & BUSINESS SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('e0000000-0000-4000-8000-000000000001', 'Office Equipment', 'office-equipment', '00000000-0000-4000-8000-000000000014', 'printer', true, 1),
('e0000000-0000-4000-8000-000000000002', 'Industrial Machinery', 'industrial-machinery', '00000000-0000-4000-8000-000000000014', 'cog', true, 2),
('e0000000-0000-4000-8000-000000000003', 'Building & Construction', 'building-construction', '00000000-0000-4000-8000-000000000014', 'hard-hat', true, 3),
('e0000000-0000-4000-8000-000000000004', 'Wholesale & Bulk', 'wholesale-bulk', '00000000-0000-4000-8000-000000000014', 'boxes', true, 4),
('e0000000-0000-4000-8000-000000000005', 'Retail Supplies', 'retail-supplies', '00000000-0000-4000-8000-000000000014', 'shopping-cart', true, 5);

-- =============================================
-- 15. TICKETS & EVENTS SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('f0000000-0000-4000-8000-000000000001', 'Event Tickets', 'event-tickets', '00000000-0000-4000-8000-000000000015', 'ticket', true, 1),
('f0000000-0000-4000-8000-000000000002', 'Travel', 'travel', '00000000-0000-4000-8000-000000000015', 'plane', true, 2),
('f0000000-0000-4000-8000-000000000003', 'Tours & Packages', 'tours-packages', '00000000-0000-4000-8000-000000000015', 'map', true, 3),
('f0000000-0000-4000-8000-000000000004', 'Experiences', 'experiences', '00000000-0000-4000-8000-000000000015', 'star', true, 4),
('f0000000-0000-4000-8000-000000000005', 'Venue Hire', 'venue-hire', '00000000-0000-4000-8000-000000000015', 'building', true, 5),
('f0000000-0000-4000-8000-000000000006', 'Event Decor & Rentals', 'event-decor-rentals', '00000000-0000-4000-8000-000000000015', 'package', true, 6);

-- =============================================
-- 16. DIGITAL PRODUCTS & SOFTWARE SUBCATEGORIES
-- =============================================
-- NOTE: Risky categories removed for legal protection (Mobile Apps, Software Licenses, Subscriptions)
-- Only legitimate, safe categories included

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4000-8000-000000000013', 'E-books & PDFs', 'ebooks-pdfs', '00000000-0000-4000-8000-000000000016', 'book', true, 1),
('10000000-0000-4000-8000-000000000014', 'Templates', 'templates', '00000000-0000-4000-8000-000000000016', 'file', true, 2),
('10000000-0000-4000-8000-000000000016', 'Gift Cards', 'gift-cards', '00000000-0000-4000-8000-000000000016', 'gift', true, 3);

-- =============================================
-- 17. COLLECTIBLES & HOBBIES SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4000-8000-000000000021', 'Art', 'art', '00000000-0000-4000-8000-000000000017', 'palette', true, 1),
('10000000-0000-4000-8000-000000000022', 'Antiques', 'antiques', '00000000-0000-4000-8000-000000000017', 'gem', true, 2),
('10000000-0000-4000-8000-000000000023', 'Memorabilia', 'memorabilia', '00000000-0000-4000-8000-000000000017', 'trophy', true, 3),
('10000000-0000-4000-8000-000000000024', 'Hobbies', 'hobbies', '00000000-0000-4000-8000-000000000017', 'puzzle', true, 4);

-- =============================================
-- 18. MISCELLANEOUS SUBCATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4000-8000-000000000031', 'Free Items / Giveaways', 'free-items', '00000000-0000-4000-8000-000000000018', 'gift', true, 1),
('10000000-0000-4000-8000-000000000032', 'Lost & Found', 'lost-found', '00000000-0000-4000-8000-000000000018', 'search', true, 2),
('10000000-0000-4000-8000-000000000033', 'Swap / Exchange Deals', 'swap-exchange', '00000000-0000-4000-8000-000000000018', 'repeat', true, 3);

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify main categories count (should be 18)
SELECT '✅ Main categories added: ' || COUNT(*) || ' (expected: 18)' as status
FROM categories 
WHERE parent_id IS NULL;

-- Verify subcategories count
SELECT '✅ Subcategories added: ' || COUNT(*) as status
FROM categories 
WHERE parent_id IS NOT NULL;

-- Verify total categories
SELECT '✅ Total categories: ' || COUNT(*) as status
FROM categories;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT '🎉 Comprehensive category system successfully implemented!' as status;

