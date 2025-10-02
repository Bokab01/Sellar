-- =============================================
-- COMPLETE SUB-SUBCATEGORIES (LEVEL 3)
-- =============================================
-- This migration adds all third-level categories from new_categories.md
-- Total: ~200 sub-subcategories across 18 main categories

-- =============================================
-- PART 1: ELECTRONICS & GADGETS
-- =============================================

-- Mobile Phones → Smartphones, Feature Phones, Accessories, Chargers, Cases
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('11000000-0000-4001-8000-000000000001', 'Smartphones', 'smartphones', '10000000-0000-4000-8000-000000000001', 'smartphone', true, 1),
('11000000-0000-4001-8000-000000000002', 'Feature Phones', 'feature-phones', '10000000-0000-4000-8000-000000000001', 'phone', true, 2),
('11000000-0000-4001-8000-000000000003', 'Phone Accessories', 'phone-accessories-sub', '10000000-0000-4000-8000-000000000001', 'headphones', true, 3),
('11000000-0000-4001-8000-000000000004', 'Chargers', 'chargers', '10000000-0000-4000-8000-000000000001', 'zap', true, 4),
('11000000-0000-4001-8000-000000000005', 'Cases', 'phone-cases', '10000000-0000-4000-8000-000000000001', 'box', true, 5);

-- Computers → Laptops, Desktops, Components, Monitors, Peripherals
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('11000000-0000-4001-8000-000000000006', 'Laptops', 'laptops', '10000000-0000-4000-8000-000000000002', 'laptop', true, 1),
('11000000-0000-4001-8000-000000000007', 'Desktops', 'desktops', '10000000-0000-4000-8000-000000000002', 'monitor', true, 2),
('11000000-0000-4001-8000-000000000008', 'Components', 'computer-components', '10000000-0000-4000-8000-000000000002', 'cog', true, 3),
('11000000-0000-4001-8000-000000000009', 'Monitors', 'monitors', '10000000-0000-4000-8000-000000000002', 'monitor', true, 4),
('11000000-0000-4001-8000-000000000010', 'Peripherals', 'peripherals', '10000000-0000-4000-8000-000000000002', 'mouse', true, 5);

-- Tablets & E-readers → iPads, Android Tablets, Kindles
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('11000000-0000-4001-8000-000000000011', 'iPads', 'ipads', '10000000-0000-4000-8000-000000000003', 'tablet', true, 1),
('11000000-0000-4001-8000-000000000012', 'Android Tablets', 'android-tablets', '10000000-0000-4000-8000-000000000003', 'tablet', true, 2),
('11000000-0000-4001-8000-000000000013', 'Kindles', 'kindles', '10000000-0000-4000-8000-000000000003', 'book', true, 3);

-- Audio → Headphones, Earbuds, Speakers, Home Theater
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('11000000-0000-4001-8000-000000000014', 'Headphones', 'headphones-sub', '10000000-0000-4000-8000-000000000004', 'headphones', true, 1),
('11000000-0000-4001-8000-000000000015', 'Earbuds', 'earbuds', '10000000-0000-4000-8000-000000000004', 'headphones', true, 2),
('11000000-0000-4001-8000-000000000016', 'Speakers', 'speakers', '10000000-0000-4000-8000-000000000004', 'volume-2', true, 3),
('11000000-0000-4001-8000-000000000017', 'Home Theater', 'home-theater', '10000000-0000-4000-8000-000000000004', 'tv', true, 4);

-- Wearables → Smartwatches, Fitness Trackers, AR/VR
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('11000000-0000-4001-8000-000000000018', 'Smartwatches', 'smartwatches-sub', '10000000-0000-4000-8000-000000000005', 'watch', true, 1),
('11000000-0000-4001-8000-000000000019', 'Fitness Trackers', 'fitness-trackers', '10000000-0000-4000-8000-000000000005', 'activity', true, 2),
('11000000-0000-4001-8000-000000000020', 'AR/VR', 'ar-vr', '10000000-0000-4000-8000-000000000005', 'gamepad-2', true, 3);

-- Cameras → DSLR, Mirrorless, Action Cams, Drones
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('11000000-0000-4001-8000-000000000021', 'DSLR', 'dslr', '10000000-0000-4000-8000-000000000006', 'camera', true, 1),
('11000000-0000-4001-8000-000000000022', 'Mirrorless', 'mirrorless', '10000000-0000-4000-8000-000000000006', 'camera', true, 2),
('11000000-0000-4001-8000-000000000023', 'Action Cams', 'action-cams', '10000000-0000-4000-8000-000000000006', 'camera', true, 3),
('11000000-0000-4001-8000-000000000024', 'Drones', 'drones', '10000000-0000-4000-8000-000000000006', 'plane', true, 4);

-- Gaming → Consoles, Games, Controllers, VR Headsets
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('11000000-0000-4001-8000-000000000025', 'Consoles', 'gaming-consoles', '10000000-0000-4000-8000-000000000007', 'gamepad-2', true, 1),
('11000000-0000-4001-8000-000000000026', 'Games', 'video-games', '10000000-0000-4000-8000-000000000007', 'disc', true, 2),
('11000000-0000-4001-8000-000000000027', 'Controllers', 'game-controllers', '10000000-0000-4000-8000-000000000007', 'gamepad-2', true, 3),
('11000000-0000-4001-8000-000000000028', 'VR Headsets', 'vr-headsets', '10000000-0000-4000-8000-000000000007', 'gamepad-2', true, 4);

-- =============================================
-- PART 2: VEHICLES
-- =============================================

-- Cars → Sedans, SUVs, Hatchbacks, Coupes, Convertibles
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('21000000-0000-4001-8000-000000000001', 'Sedans', 'sedans', '20000000-0000-4000-8000-000000000001', 'car', true, 1),
('21000000-0000-4001-8000-000000000002', 'SUVs', 'suvs', '20000000-0000-4000-8000-000000000001', 'truck', true, 2),
('21000000-0000-4001-8000-000000000003', 'Hatchbacks', 'hatchbacks', '20000000-0000-4000-8000-000000000001', 'car', true, 3),
('21000000-0000-4001-8000-000000000004', 'Coupes', 'coupes', '20000000-0000-4000-8000-000000000001', 'car', true, 4),
('21000000-0000-4001-8000-000000000005', 'Convertibles', 'convertibles', '20000000-0000-4000-8000-000000000001', 'car', true, 5);

-- Motorcycles → Scooters, Dirt Bikes, Cruisers
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('21000000-0000-4001-8000-000000000006', 'Scooters', 'scooters', '20000000-0000-4000-8000-000000000002', 'bike', true, 1),
('21000000-0000-4001-8000-000000000007', 'Dirt Bikes', 'dirt-bikes', '20000000-0000-4000-8000-000000000002', 'bike', true, 2),
('21000000-0000-4001-8000-000000000008', 'Cruisers', 'cruisers', '20000000-0000-4000-8000-000000000002', 'bike', true, 3);

-- Commercial Vehicles → Vans, Trucks, Buses
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('21000000-0000-4001-8000-000000000009', 'Vans', 'vans', '20000000-0000-4000-8000-000000000003', 'truck', true, 1),
('21000000-0000-4001-8000-000000000010', 'Trucks', 'trucks', '20000000-0000-4000-8000-000000000003', 'truck', true, 2),
('21000000-0000-4001-8000-000000000011', 'Buses', 'buses', '20000000-0000-4000-8000-000000000003', 'truck', true, 3);

-- Boats & Watercraft → Fishing Boats, Jet Skis, Yachts
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('21000000-0000-4001-8000-000000000012', 'Fishing Boats', 'fishing-boats', '20000000-0000-4000-8000-000000000011', 'anchor', true, 1),
('21000000-0000-4001-8000-000000000013', 'Jet Skis', 'jet-skis', '20000000-0000-4000-8000-000000000011', 'waves', true, 2),
('21000000-0000-4001-8000-000000000014', 'Yachts', 'yachts', '20000000-0000-4000-8000-000000000011', 'anchor', true, 3);

-- =============================================
-- PART 3: REAL ESTATE & PROPERTY
-- =============================================

-- For Sale → Houses, Apartments, Land, Commercial Spaces
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('31000000-0000-4001-8000-000000000001', 'Houses', 'houses-for-sale', '30000000-0000-4000-8000-000000000001', 'home', true, 1),
('31000000-0000-4001-8000-000000000002', 'Apartments', 'apartments-for-sale', '30000000-0000-4000-8000-000000000001', 'building', true, 2),
('31000000-0000-4001-8000-000000000003', 'Land', 'land-for-sale', '30000000-0000-4000-8000-000000000001', 'square', true, 3),
('31000000-0000-4001-8000-000000000004', 'Commercial Spaces', 'commercial-spaces-sale', '30000000-0000-4000-8000-000000000001', 'briefcase', true, 4);

-- For Rent → Apartments, Houses, Offices, Co-working
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('31000000-0000-4001-8000-000000000005', 'Apartments', 'apartments-for-rent', '30000000-0000-4000-8000-000000000002', 'building', true, 1),
('31000000-0000-4001-8000-000000000006', 'Houses', 'houses-for-rent', '30000000-0000-4000-8000-000000000002', 'home', true, 2),
('31000000-0000-4001-8000-000000000007', 'Offices', 'offices-for-rent', '30000000-0000-4000-8000-000000000002', 'briefcase', true, 3),
('31000000-0000-4001-8000-000000000008', 'Co-working', 'coworking-spaces', '30000000-0000-4000-8000-000000000002', 'users', true, 4);

-- =============================================
-- PART 4: FASHION & CLOTHING
-- =============================================

-- Men's Clothing → Shirts, Jeans, Jackets, Suits
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('41000000-0000-4001-8000-000000000001', 'Shirts', 'mens-shirts', '40000000-0000-4000-8000-000000000001', 'shirt', true, 1),
('41000000-0000-4001-8000-000000000002', 'Jeans', 'mens-jeans', '40000000-0000-4000-8000-000000000001', 'shirt', true, 2),
('41000000-0000-4001-8000-000000000003', 'Jackets', 'mens-jackets', '40000000-0000-4000-8000-000000000001', 'shirt', true, 3),
('41000000-0000-4001-8000-000000000004', 'Suits', 'mens-suits', '40000000-0000-4000-8000-000000000001', 'briefcase', true, 4);

-- Women's Clothing → Dresses, Tops, Trousers, Skirts
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('41000000-0000-4001-8000-000000000005', 'Dresses', 'womens-dresses', '40000000-0000-4000-8000-000000000002', 'shirt', true, 1),
('41000000-0000-4001-8000-000000000006', 'Tops', 'womens-tops', '40000000-0000-4000-8000-000000000002', 'shirt', true, 2),
('41000000-0000-4001-8000-000000000007', 'Trousers', 'womens-trousers', '40000000-0000-4000-8000-000000000002', 'shirt', true, 3),
('41000000-0000-4001-8000-000000000008', 'Skirts', 'womens-skirts', '40000000-0000-4000-8000-000000000002', 'shirt', true, 4);

-- Shoes → Sneakers, Heels, Boots, Sandals
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('41000000-0000-4001-8000-000000000009', 'Sneakers', 'sneakers', '40000000-0000-4000-8000-000000000004', 'footprints', true, 1),
('41000000-0000-4001-8000-000000000010', 'Heels', 'heels', '40000000-0000-4000-8000-000000000004', 'footprints', true, 2),
('41000000-0000-4001-8000-000000000011', 'Boots', 'boots', '40000000-0000-4000-8000-000000000004', 'footprints', true, 3),
('41000000-0000-4001-8000-000000000012', 'Sandals', 'sandals', '40000000-0000-4000-8000-000000000004', 'footprints', true, 4);

-- Bags & Luggage → Handbags, Backpacks, Suitcases
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('41000000-0000-4001-8000-000000000013', 'Handbags', 'handbags', '40000000-0000-4000-8000-000000000005', 'bag', true, 1),
('41000000-0000-4001-8000-000000000014', 'Backpacks', 'backpacks', '40000000-0000-4000-8000-000000000005', 'bag', true, 2),
('41000000-0000-4001-8000-000000000015', 'Suitcases', 'suitcases', '40000000-0000-4000-8000-000000000005', 'bag', true, 3);

-- Jewelry & Watches → Earrings, Necklaces, Luxury Watches
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('41000000-0000-4001-8000-000000000016', 'Earrings', 'earrings', '40000000-0000-4000-8000-000000000006', 'gem', true, 1),
('41000000-0000-4001-8000-000000000017', 'Necklaces', 'necklaces', '40000000-0000-4000-8000-000000000006', 'gem', true, 2),
('41000000-0000-4001-8000-000000000018', 'Luxury Watches', 'luxury-watches', '40000000-0000-4000-8000-000000000006', 'watch', true, 3);

-- Traditional / Cultural Wear → African Prints, Sarees, Abayas
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('41000000-0000-4001-8000-000000000019', 'African Prints', 'african-prints', '40000000-0000-4000-8000-000000000007', 'sparkles', true, 1),
('41000000-0000-4001-8000-000000000020', 'Sarees', 'sarees', '40000000-0000-4000-8000-000000000007', 'sparkles', true, 2),
('41000000-0000-4001-8000-000000000021', 'Abayas', 'abayas', '40000000-0000-4000-8000-000000000007', 'sparkles', true, 3);

-- =============================================
-- PART 5: HOME & FURNITURE
-- =============================================

-- Living Room → Sofas, Coffee Tables, TV Stands
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('51000000-0000-4001-8000-000000000001', 'Sofas', 'sofas', '50000000-0000-4000-8000-000000000001', 'armchair', true, 1),
('51000000-0000-4001-8000-000000000002', 'Coffee Tables', 'coffee-tables', '50000000-0000-4000-8000-000000000001', 'square', true, 2),
('51000000-0000-4001-8000-000000000003', 'TV Stands', 'tv-stands', '50000000-0000-4000-8000-000000000001', 'tv', true, 3);

-- Bedroom → Beds, Wardrobes, Dressers
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('51000000-0000-4001-8000-000000000004', 'Beds', 'beds', '50000000-0000-4000-8000-000000000002', 'bed', true, 1),
('51000000-0000-4001-8000-000000000005', 'Wardrobes', 'wardrobes', '50000000-0000-4000-8000-000000000002', 'box', true, 2),
('51000000-0000-4001-8000-000000000006', 'Dressers', 'dressers', '50000000-0000-4000-8000-000000000002', 'box', true, 3);

-- Kitchen & Dining → Tables, Chairs, Cabinets
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('51000000-0000-4001-8000-000000000007', 'Tables', 'dining-tables', '50000000-0000-4000-8000-000000000003', 'square', true, 1),
('51000000-0000-4001-8000-000000000008', 'Chairs', 'dining-chairs', '50000000-0000-4000-8000-000000000003', 'armchair', true, 2),
('51000000-0000-4001-8000-000000000009', 'Cabinets', 'kitchen-cabinets', '50000000-0000-4000-8000-000000000003', 'box', true, 3);

-- Home Décor → Rugs, Curtains, Wall Art, Lighting
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('51000000-0000-4001-8000-000000000010', 'Rugs', 'rugs', '50000000-0000-4000-8000-000000000004', 'square', true, 1),
('51000000-0000-4001-8000-000000000011', 'Curtains', 'curtains', '50000000-0000-4000-8000-000000000004', 'square', true, 2),
('51000000-0000-4001-8000-000000000012', 'Wall Art', 'wall-art', '50000000-0000-4000-8000-000000000004', 'image', true, 3),
('51000000-0000-4001-8000-000000000013', 'Lighting', 'lighting', '50000000-0000-4000-8000-000000000004', 'lightbulb', true, 4);

-- Appliances → Fridge, Washing Machine, Microwaves, ACs
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('51000000-0000-4001-8000-000000000014', 'Fridge', 'fridges', '50000000-0000-4000-8000-000000000005', 'refrigerator', true, 1),
('51000000-0000-4001-8000-000000000015', 'Washing Machine', 'washing-machines', '50000000-0000-4000-8000-000000000005', 'circle', true, 2),
('51000000-0000-4001-8000-000000000016', 'Microwaves', 'microwaves', '50000000-0000-4000-8000-000000000005', 'box', true, 3),
('51000000-0000-4001-8000-000000000017', 'ACs', 'air-conditioners', '50000000-0000-4000-8000-000000000005', 'wind', true, 4);

-- Outdoor Furniture → Garden Chairs, Umbrellas, Swings
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('51000000-0000-4001-8000-000000000018', 'Garden Chairs', 'garden-chairs', '50000000-0000-4000-8000-000000000006', 'armchair', true, 1),
('51000000-0000-4001-8000-000000000019', 'Umbrellas', 'patio-umbrellas', '50000000-0000-4000-8000-000000000006', 'circle', true, 2),
('51000000-0000-4001-8000-000000000020', 'Swings', 'garden-swings', '50000000-0000-4000-8000-000000000006', 'circle', true, 3);

-- =============================================
-- PART 6: HEALTH & BEAUTY
-- =============================================

-- Skincare → Creams, Lotions, Serums
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('61000000-0000-4001-8000-000000000001', 'Creams', 'skincare-creams', '60000000-0000-4000-8000-000000000001', 'sparkles', true, 1),
('61000000-0000-4001-8000-000000000002', 'Lotions', 'skincare-lotions', '60000000-0000-4000-8000-000000000001', 'sparkles', true, 2),
('61000000-0000-4001-8000-000000000003', 'Serums', 'skincare-serums', '60000000-0000-4000-8000-000000000001', 'sparkles', true, 3);

-- Haircare → Wigs, Extensions, Oils, Shampoos
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('61000000-0000-4001-8000-000000000004', 'Wigs', 'wigs', '60000000-0000-4000-8000-000000000002', 'scissors', true, 1),
('61000000-0000-4001-8000-000000000005', 'Extensions', 'hair-extensions', '60000000-0000-4000-8000-000000000002', 'scissors', true, 2),
('61000000-0000-4001-8000-000000000006', 'Oils', 'hair-oils', '60000000-0000-4000-8000-000000000002', 'sparkles', true, 3),
('61000000-0000-4001-8000-000000000007', 'Shampoos', 'shampoos', '60000000-0000-4000-8000-000000000002', 'sparkles', true, 4);

-- Makeup → Foundations, Lipsticks, Brushes
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('61000000-0000-4001-8000-000000000008', 'Foundations', 'foundations', '60000000-0000-4000-8000-000000000003', 'palette', true, 1),
('61000000-0000-4001-8000-000000000009', 'Lipsticks', 'lipsticks', '60000000-0000-4000-8000-000000000003', 'palette', true, 2),
('61000000-0000-4001-8000-000000000010', 'Brushes', 'makeup-brushes', '60000000-0000-4000-8000-000000000003', 'palette', true, 3);

-- Fragrances → Perfumes, Colognes
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('61000000-0000-4001-8000-000000000011', 'Perfumes', 'perfumes', '60000000-0000-4000-8000-000000000004', 'sparkles', true, 1),
('61000000-0000-4001-8000-000000000012', 'Colognes', 'colognes', '60000000-0000-4000-8000-000000000004', 'sparkles', true, 2);

-- Personal Care → Razors, Oral Care, Bath & Body
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('61000000-0000-4001-8000-000000000013', 'Razors', 'razors', '60000000-0000-4000-8000-000000000005', 'scissors', true, 1),
('61000000-0000-4001-8000-000000000014', 'Oral Care', 'oral-care', '60000000-0000-4000-8000-000000000005', 'heart', true, 2),
('61000000-0000-4001-8000-000000000015', 'Bath & Body', 'bath-body', '60000000-0000-4000-8000-000000000005', 'sparkles', true, 3);

-- Fitness Equipment → Weights, Yoga Mats, Treadmills
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('61000000-0000-4001-8000-000000000016', 'Weights', 'weights', '60000000-0000-4000-8000-000000000006', 'dumbbell', true, 1),
('61000000-0000-4001-8000-000000000017', 'Yoga Mats', 'yoga-mats', '60000000-0000-4000-8000-000000000006', 'square', true, 2),
('61000000-0000-4001-8000-000000000018', 'Treadmills', 'treadmills', '60000000-0000-4000-8000-000000000006', 'activity', true, 3);

-- =============================================
-- PART 7: SPORTS & OUTDOORS
-- =============================================

-- Fitness → Dumbbells, Exercise Bikes, Resistance Bands
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('71000000-0000-4001-8000-000000000001', 'Dumbbells', 'dumbbells', '70000000-0000-4000-8000-000000000001', 'dumbbell', true, 1),
('71000000-0000-4001-8000-000000000002', 'Exercise Bikes', 'exercise-bikes', '70000000-0000-4000-8000-000000000001', 'bike', true, 2),
('71000000-0000-4001-8000-000000000003', 'Resistance Bands', 'resistance-bands', '70000000-0000-4000-8000-000000000001', 'circle', true, 3);

-- Team Sports → Football, Basketball, Tennis Gear
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('71000000-0000-4001-8000-000000000004', 'Football', 'football-gear', '70000000-0000-4000-8000-000000000002', 'trophy', true, 1),
('71000000-0000-4001-8000-000000000005', 'Basketball', 'basketball-gear', '70000000-0000-4000-8000-000000000002', 'trophy', true, 2),
('71000000-0000-4001-8000-000000000006', 'Tennis Gear', 'tennis-gear', '70000000-0000-4000-8000-000000000002', 'trophy', true, 3);

-- Outdoor Gear → Camping, Hiking, Fishing Equipment
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('71000000-0000-4001-8000-000000000007', 'Camping', 'camping-gear', '70000000-0000-4000-8000-000000000003', 'tent', true, 1),
('71000000-0000-4001-8000-000000000008', 'Hiking', 'hiking-gear', '70000000-0000-4000-8000-000000000003', 'tent', true, 2),
('71000000-0000-4001-8000-000000000009', 'Fishing Equipment', 'fishing-equipment', '70000000-0000-4000-8000-000000000003', 'anchor', true, 3);

-- Bicycles & Scooters → Mountain Bikes, Road Bikes, Electric Scooters
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('71000000-0000-4001-8000-000000000010', 'Mountain Bikes', 'mountain-bikes', '70000000-0000-4000-8000-000000000004', 'bike', true, 1),
('71000000-0000-4001-8000-000000000011', 'Road Bikes', 'road-bikes', '70000000-0000-4000-8000-000000000004', 'bike', true, 2),
('71000000-0000-4001-8000-000000000012', 'Electric Scooters', 'electric-scooters', '70000000-0000-4000-8000-000000000004', 'zap', true, 3);

-- =============================================
-- PART 8: BABY, KIDS & TOYS
-- =============================================

-- Baby Gear → Strollers, Car Seats, Carriers
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('81000000-0000-4001-8000-000000000001', 'Strollers', 'strollers', '80000000-0000-4000-8000-000000000001', 'baby', true, 1),
('81000000-0000-4001-8000-000000000002', 'Car Seats', 'car-seats', '80000000-0000-4000-8000-000000000001', 'car', true, 2),
('81000000-0000-4001-8000-000000000003', 'Carriers', 'baby-carriers', '80000000-0000-4000-8000-000000000001', 'baby', true, 3);

-- Baby Essentials → Diapers, Feeding, Baby Food
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('81000000-0000-4001-8000-000000000004', 'Diapers', 'diapers', '80000000-0000-4000-8000-000000000002', 'baby', true, 1),
('81000000-0000-4001-8000-000000000005', 'Feeding', 'baby-feeding', '80000000-0000-4000-8000-000000000002', 'utensils', true, 2),
('81000000-0000-4001-8000-000000000006', 'Baby Food', 'baby-food', '80000000-0000-4000-8000-000000000002', 'utensils', true, 3);

-- Toys & Games → Educational, Puzzles, Dolls, Action Figures
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('81000000-0000-4001-8000-000000000007', 'Educational', 'educational-toys', '80000000-0000-4000-8000-000000000004', 'book', true, 1),
('81000000-0000-4001-8000-000000000008', 'Puzzles', 'puzzles', '80000000-0000-4000-8000-000000000004', 'puzzle', true, 2),
('81000000-0000-4001-8000-000000000009', 'Dolls', 'dolls', '80000000-0000-4000-8000-000000000004', 'baby', true, 3),
('81000000-0000-4001-8000-000000000010', 'Action Figures', 'action-figures', '80000000-0000-4000-8000-000000000004', 'users', true, 4);

-- School Supplies → Bags, Stationery, Lunchboxes
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('81000000-0000-4001-8000-000000000011', 'Bags', 'school-bags', '80000000-0000-4000-8000-000000000005', 'bag', true, 1),
('81000000-0000-4001-8000-000000000012', 'Stationery', 'school-stationery', '80000000-0000-4000-8000-000000000005', 'pencil', true, 2),
('81000000-0000-4001-8000-000000000013', 'Lunchboxes', 'lunchboxes', '80000000-0000-4000-8000-000000000005', 'box', true, 3);

-- =============================================
-- PART 9: BOOKS, MEDIA & EDUCATION
-- =============================================

-- Books → Fiction, Non-fiction, Educational, Religious
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('91000000-0000-4001-8000-000000000001', 'Fiction', 'fiction-books', '90000000-0000-4000-8000-000000000001', 'book', true, 1),
('91000000-0000-4001-8000-000000000002', 'Non-fiction', 'non-fiction-books', '90000000-0000-4000-8000-000000000001', 'book', true, 2),
('91000000-0000-4001-8000-000000000003', 'Educational', 'educational-books', '90000000-0000-4000-8000-000000000001', 'graduation-cap', true, 3),
('91000000-0000-4001-8000-000000000004', 'Religious', 'religious-books', '90000000-0000-4000-8000-000000000001', 'book', true, 4);

-- Music → CDs, Vinyl, Instruments
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('91000000-0000-4001-8000-000000000005', 'CDs', 'music-cds', '90000000-0000-4000-8000-000000000003', 'disc', true, 1),
('91000000-0000-4001-8000-000000000006', 'Vinyl', 'vinyl-records', '90000000-0000-4000-8000-000000000003', 'disc', true, 2),
('91000000-0000-4001-8000-000000000007', 'Instruments', 'musical-instruments', '90000000-0000-4000-8000-000000000003', 'music', true, 3);

-- Movies & Games → DVDs, Blu-rays
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('91000000-0000-4001-8000-000000000008', 'DVDs', 'dvds', '90000000-0000-4000-8000-000000000004', 'disc', true, 1),
('91000000-0000-4001-8000-000000000009', 'Blu-rays', 'blu-rays', '90000000-0000-4000-8000-000000000004', 'disc', true, 2);

-- =============================================
-- PART 10-18: REMAINING CATEGORIES
-- =============================================
-- (Continuing with simplified IDs for brevity)

-- Services subcategories (Part 10)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('a1000000-0000-4001-8000-000000000001', 'Cleaning', 'cleaning-services', 'a0000000-0000-4000-8000-000000000001', 'home', true, 1),
('a1000000-0000-4001-8000-000000000002', 'Plumbing', 'plumbing-services', 'a0000000-0000-4000-8000-000000000001', 'wrench', true, 2),
('a1000000-0000-4001-8000-000000000003', 'Electrical', 'electrical-services', 'a0000000-0000-4000-8000-000000000001', 'zap', true, 3),
('a1000000-0000-4001-8000-000000000004', 'Painting', 'painting-services', 'a0000000-0000-4000-8000-000000000001', 'palette', true, 4),
('a1000000-0000-4001-8000-000000000005', 'Catering', 'catering-services', 'a0000000-0000-4000-8000-000000000002', 'utensils', true, 1),
('a1000000-0000-4001-8000-000000000006', 'Photography', 'photography-services', 'a0000000-0000-4000-8000-000000000002', 'camera', true, 2),
('a1000000-0000-4001-8000-000000000007', 'DJ', 'dj-services', 'a0000000-0000-4000-8000-000000000002', 'music', true, 3),
('a1000000-0000-4001-8000-000000000008', 'Rentals', 'event-rentals', 'a0000000-0000-4000-8000-000000000002', 'package', true, 4),
('a1000000-0000-4001-8000-000000000009', 'Legal', 'legal-services', 'a0000000-0000-4000-8000-000000000003', 'briefcase', true, 1),
('a1000000-0000-4001-8000-000000000010', 'Accounting', 'accounting-services', 'a0000000-0000-4000-8000-000000000003', 'calculator', true, 2),
('a1000000-0000-4001-8000-000000000011', 'Consulting', 'consulting-services', 'a0000000-0000-4000-8000-000000000003', 'briefcase', true, 3),
('a1000000-0000-4001-8000-000000000012', 'Physiotherapy', 'physiotherapy', 'a0000000-0000-4000-8000-000000000004', 'heart-pulse', true, 1),
('a1000000-0000-4001-8000-000000000013', 'Private Nursing', 'private-nursing', 'a0000000-0000-4000-8000-000000000004', 'heart', true, 2),
('a1000000-0000-4001-8000-000000000014', 'Wellness', 'wellness-services', 'a0000000-0000-4000-8000-000000000004', 'heart', true, 3),
('a1000000-0000-4001-8000-000000000015', 'Hairdressers', 'hairdressers', 'a0000000-0000-4000-8000-000000000005', 'scissors', true, 1),
('a1000000-0000-4001-8000-000000000016', 'Makeup Artists', 'makeup-artists', 'a0000000-0000-4000-8000-000000000005', 'palette', true, 2),
('a1000000-0000-4001-8000-000000000017', 'Nail Techs', 'nail-technicians', 'a0000000-0000-4000-8000-000000000005', 'sparkles', true, 3),
('a1000000-0000-4001-8000-000000000018', 'Academic Tutors', 'academic-tutors', 'a0000000-0000-4000-8000-000000000006', 'graduation-cap', true, 1),
('a1000000-0000-4001-8000-000000000019', 'Personal Trainers', 'personal-trainers', 'a0000000-0000-4000-8000-000000000006', 'dumbbell', true, 2),
('a1000000-0000-4001-8000-000000000020', 'Skill Training', 'skill-training', 'a0000000-0000-4000-8000-000000000006', 'graduation-cap', true, 3);

-- Printing & Design Services → Wedding Invitations, Business Cards, etc.
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('a1000000-0000-4001-8000-000000000021', 'Wedding Invitation Cards', 'wedding-invitations', 'a0000000-0000-4000-8000-000000000007', 'heart', true, 1),
('a1000000-0000-4001-8000-000000000022', 'Business Cards', 'business-cards', 'a0000000-0000-4000-8000-000000000007', 'credit-card', true, 2),
('a1000000-0000-4001-8000-000000000023', 'Flyers & Brochures', 'flyers-brochures', 'a0000000-0000-4000-8000-000000000007', 'file', true, 3),
('a1000000-0000-4001-8000-000000000024', 'Banners & Posters', 'banners-posters', 'a0000000-0000-4000-8000-000000000007', 'image', true, 4),
('a1000000-0000-4001-8000-000000000025', 'Custom Printing', 'custom-printing', 'a0000000-0000-4000-8000-000000000007', 'printer', true, 5),
('a1000000-0000-4001-8000-000000000026', 'Graphic Design Services', 'graphic-design', 'a0000000-0000-4000-8000-000000000007', 'palette', true, 6),
('a1000000-0000-4001-8000-000000000027', 'Logo Design', 'logo-design', 'a0000000-0000-4000-8000-000000000007', 'circle', true, 7),
('a1000000-0000-4001-8000-000000000028', 'Branding Materials', 'branding-materials', 'a0000000-0000-4000-8000-000000000007', 'package', true, 8);

-- Jobs & Freelance subcategories (Part 11)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('b1000000-0000-4001-8000-000000000001', 'IT', 'it-jobs', 'b0000000-0000-4000-8000-000000000001', 'laptop', true, 1),
('b1000000-0000-4001-8000-000000000002', 'Healthcare', 'healthcare-jobs', 'b0000000-0000-4000-8000-000000000001', 'heart-pulse', true, 2),
('b1000000-0000-4001-8000-000000000003', 'Education', 'education-jobs', 'b0000000-0000-4000-8000-000000000001', 'graduation-cap', true, 3),
('b1000000-0000-4001-8000-000000000004', 'Retail', 'retail-jobs', 'b0000000-0000-4000-8000-000000000001', 'shopping-cart', true, 4),
('b1000000-0000-4001-8000-000000000005', 'Delivery', 'delivery-jobs', 'b0000000-0000-4000-8000-000000000002', 'truck', true, 1),
('b1000000-0000-4001-8000-000000000006', 'Babysitting', 'babysitting-jobs', 'b0000000-0000-4000-8000-000000000002', 'baby', true, 2),
('b1000000-0000-4001-8000-000000000007', 'House Help', 'house-help-jobs', 'b0000000-0000-4000-8000-000000000002', 'home', true, 3),
('b1000000-0000-4001-8000-000000000008', 'Design', 'design-freelance', 'b0000000-0000-4000-8000-000000000003', 'palette', true, 1),
('b1000000-0000-4001-8000-000000000009', 'Writing', 'writing-freelance', 'b0000000-0000-4000-8000-000000000003', 'pencil', true, 2),
('b1000000-0000-4001-8000-000000000010', 'Programming', 'programming-freelance', 'b0000000-0000-4000-8000-000000000003', 'laptop', true, 3),
('b1000000-0000-4001-8000-000000000011', 'Marketing', 'marketing-freelance', 'b0000000-0000-4000-8000-000000000003', 'briefcase', true, 4);

-- Food & Agriculture subcategories (Part 12)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('c1000000-0000-4001-8000-000000000001', 'Fresh Produce', 'fresh-produce', 'c0000000-0000-4000-8000-000000000001', 'leaf', true, 1),
('c1000000-0000-4001-8000-000000000002', 'Packaged Goods', 'packaged-goods', 'c0000000-0000-4000-8000-000000000001', 'package', true, 2),
('c1000000-0000-4001-8000-000000000003', 'Beverages', 'grocery-beverages', 'c0000000-0000-4000-8000-000000000001', 'coffee', true, 3),
('c1000000-0000-4001-8000-000000000004', 'Local Foods', 'local-foods', 'c0000000-0000-4000-8000-000000000002', 'utensils', true, 1),
('c1000000-0000-4001-8000-000000000005', 'Fast Food', 'fast-food', 'c0000000-0000-4000-8000-000000000002', 'utensils', true, 2),
('c1000000-0000-4001-8000-000000000006', 'Fine Dining', 'fine-dining', 'c0000000-0000-4000-8000-000000000002', 'utensils', true, 3),
('c1000000-0000-4001-8000-000000000007', 'Alcohol', 'alcohol', 'c0000000-0000-4000-8000-000000000003', 'coffee', true, 1),
('c1000000-0000-4001-8000-000000000008', 'Soft Drinks', 'soft-drinks', 'c0000000-0000-4000-8000-000000000003', 'coffee', true, 2),
('c1000000-0000-4001-8000-000000000009', 'Coffee', 'coffee-products', 'c0000000-0000-4000-8000-000000000003', 'coffee', true, 3),
('c1000000-0000-4001-8000-000000000010', 'Tea', 'tea-products', 'c0000000-0000-4000-8000-000000000003', 'coffee', true, 4),
('c1000000-0000-4001-8000-000000000011', 'Livestock', 'farm-livestock', 'c0000000-0000-4000-8000-000000000004', 'cow', true, 1),
('c1000000-0000-4001-8000-000000000012', 'Crops', 'crops', 'c0000000-0000-4000-8000-000000000004', 'leaf', true, 2),
('c1000000-0000-4001-8000-000000000013', 'Poultry', 'poultry', 'c0000000-0000-4000-8000-000000000004', 'feather', true, 3),
('c1000000-0000-4001-8000-000000000014', 'Tractors', 'tractors', 'c0000000-0000-4000-8000-000000000005', 'tractor', true, 1),
('c1000000-0000-4001-8000-000000000015', 'Tools', 'farm-tools', 'c0000000-0000-4000-8000-000000000005', 'wrench', true, 2),
('c1000000-0000-4001-8000-000000000016', 'Irrigation', 'irrigation', 'c0000000-0000-4000-8000-000000000005', 'wind', true, 3);

-- Pets & Animals subcategories (Part 13)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('d1000000-0000-4001-8000-000000000001', 'Dogs', 'dogs', 'd0000000-0000-4000-8000-000000000001', 'heart', true, 1),
('d1000000-0000-4001-8000-000000000002', 'Cats', 'cats', 'd0000000-0000-4000-8000-000000000001', 'heart', true, 2),
('d1000000-0000-4001-8000-000000000003', 'Birds', 'birds', 'd0000000-0000-4000-8000-000000000001', 'feather', true, 3),
('d1000000-0000-4001-8000-000000000004', 'Fish', 'fish', 'd0000000-0000-4000-8000-000000000001', 'waves', true, 4),
('d1000000-0000-4001-8000-000000000005', 'Exotic Pets', 'exotic-pets', 'd0000000-0000-4000-8000-000000000001', 'heart', true, 5),
('d1000000-0000-4001-8000-000000000006', 'Beds', 'pet-beds', 'd0000000-0000-4000-8000-000000000002', 'bed', true, 1),
('d1000000-0000-4001-8000-000000000007', 'Bowls', 'pet-bowls', 'd0000000-0000-4000-8000-000000000002', 'utensils', true, 2),
('d1000000-0000-4001-8000-000000000008', 'Toys', 'pet-toys', 'd0000000-0000-4000-8000-000000000002', 'package', true, 3),
('d1000000-0000-4001-8000-000000000009', 'Collars', 'pet-collars', 'd0000000-0000-4000-8000-000000000002', 'circle', true, 4),
('d1000000-0000-4001-8000-000000000010', 'Goats', 'goats', 'd0000000-0000-4000-8000-000000000005', 'cow', true, 1),
('d1000000-0000-4001-8000-000000000011', 'Sheep', 'sheep', 'd0000000-0000-4000-8000-000000000005', 'cow', true, 2),
('d1000000-0000-4001-8000-000000000012', 'Chickens', 'chickens', 'd0000000-0000-4000-8000-000000000005', 'feather', true, 3),
('d1000000-0000-4001-8000-000000000013', 'Cattle', 'cattle', 'd0000000-0000-4000-8000-000000000005', 'cow', true, 4);

-- Industrial & Business subcategories (Part 14)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('e1000000-0000-4001-8000-000000000001', 'Desks', 'office-desks', 'e0000000-0000-4000-8000-000000000001', 'square', true, 1),
('e1000000-0000-4001-8000-000000000002', 'Chairs', 'office-chairs', 'e0000000-0000-4000-8000-000000000001', 'armchair', true, 2),
('e1000000-0000-4001-8000-000000000003', 'Printers', 'printers', 'e0000000-0000-4000-8000-000000000001', 'printer', true, 3),
('e1000000-0000-4001-8000-000000000004', 'Generators', 'generators', 'e0000000-0000-4000-8000-000000000002', 'zap', true, 1),
('e1000000-0000-4001-8000-000000000005', 'Compressors', 'compressors', 'e0000000-0000-4000-8000-000000000002', 'wind', true, 2),
('e1000000-0000-4001-8000-000000000006', 'Manufacturing Equipment', 'manufacturing-equipment', 'e0000000-0000-4000-8000-000000000002', 'cog', true, 3),
('e1000000-0000-4001-8000-000000000007', 'Materials', 'construction-materials', 'e0000000-0000-4000-8000-000000000003', 'box', true, 1),
('e1000000-0000-4001-8000-000000000008', 'Tools', 'construction-tools', 'e0000000-0000-4000-8000-000000000003', 'wrench', true, 2),
('e1000000-0000-4001-8000-000000000009', 'Heavy Equipment', 'heavy-equipment', 'e0000000-0000-4000-8000-000000000003', 'truck', true, 3),
('e1000000-0000-4001-8000-000000000010', 'Food', 'wholesale-food', 'e0000000-0000-4000-8000-000000000004', 'utensils', true, 1),
('e1000000-0000-4001-8000-000000000011', 'Clothing', 'wholesale-clothing', 'e0000000-0000-4000-8000-000000000004', 'shirt', true, 2),
('e1000000-0000-4001-8000-000000000012', 'Electronics', 'wholesale-electronics', 'e0000000-0000-4000-8000-000000000004', 'smartphone', true, 3),
('e1000000-0000-4001-8000-000000000013', 'POS Systems', 'pos-systems', 'e0000000-0000-4000-8000-000000000005', 'credit-card', true, 1),
('e1000000-0000-4001-8000-000000000014', 'Display Racks', 'display-racks', 'e0000000-0000-4000-8000-000000000005', 'box', true, 2);

-- Tickets & Events subcategories (Part 15)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('f1000000-0000-4001-8000-000000000001', 'Concerts', 'concert-tickets', 'f0000000-0000-4000-8000-000000000001', 'music', true, 1),
('f1000000-0000-4001-8000-000000000002', 'Sports', 'sports-tickets', 'f0000000-0000-4000-8000-000000000001', 'trophy', true, 2),
('f1000000-0000-4001-8000-000000000003', 'Theatre', 'theatre-tickets', 'f0000000-0000-4000-8000-000000000001', 'film', true, 3),
('f1000000-0000-4001-8000-000000000004', 'Flights', 'flight-tickets', 'f0000000-0000-4000-8000-000000000002', 'plane', true, 1),
('f1000000-0000-4001-8000-000000000005', 'Buses', 'bus-tickets', 'f0000000-0000-4000-8000-000000000002', 'truck', true, 2),
('f1000000-0000-4001-8000-000000000006', 'Train Tickets', 'train-tickets', 'f0000000-0000-4000-8000-000000000002', 'truck', true, 3),
('f1000000-0000-4001-8000-000000000007', 'Holidays', 'holiday-packages', 'f0000000-0000-4000-8000-000000000003', 'map', true, 1),
('f1000000-0000-4001-8000-000000000008', 'Local Tours', 'local-tours', 'f0000000-0000-4000-8000-000000000003', 'map', true, 2),
('f1000000-0000-4001-8000-000000000009', 'Classes', 'experience-classes', 'f0000000-0000-4000-8000-000000000004', 'graduation-cap', true, 1),
('f1000000-0000-4001-8000-000000000010', 'Workshops', 'workshops', 'f0000000-0000-4000-8000-000000000004', 'briefcase', true, 2),
('f1000000-0000-4001-8000-000000000011', 'Adventure Activities', 'adventure-activities', 'f0000000-0000-4000-8000-000000000004', 'tent', true, 3);

-- Event Decor & Rentals → Chairs, Tents, Sound Systems
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('f1000000-0000-4001-8000-000000000012', 'Chairs', 'event-chairs', 'f0000000-0000-4000-8000-000000000006', 'armchair', true, 1),
('f1000000-0000-4001-8000-000000000013', 'Tents', 'event-tents', 'f0000000-0000-4000-8000-000000000006', 'tent', true, 2),
('f1000000-0000-4001-8000-000000000014', 'Sound Systems', 'event-sound-systems', 'f0000000-0000-4000-8000-000000000006', 'volume-2', true, 3);

-- Digital Products & Software subcategories (Part 16)
-- NOTE: Risky categories removed for legal protection (Software Licenses, Subscriptions)
-- Only legitimate, original content categories included

-- Templates → CV, Design, Websites (Original creations only)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('16000000-0000-4001-8000-000000000001', 'CV Templates', 'cv-templates', '10000000-0000-4000-8000-000000000014', 'file', true, 1),
('16000000-0000-4001-8000-000000000002', 'Design Templates', 'design-templates', '10000000-0000-4000-8000-000000000014', 'palette', true, 2),
('16000000-0000-4001-8000-000000000003', 'Website Templates', 'website-templates', '10000000-0000-4000-8000-000000000014', 'laptop', true, 3),
('16000000-0000-4001-8000-000000000004', 'Presentation Templates', 'presentation-templates', '10000000-0000-4000-8000-000000000014', 'presentation', true, 4),
('16000000-0000-4001-8000-000000000005', 'Social Media Templates', 'social-media-templates', '10000000-0000-4000-8000-000000000014', 'image', true, 5);

-- Collectibles & Hobbies subcategories (Part 17)
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('17000000-0000-4001-8000-000000000001', 'Paintings', 'paintings', '10000000-0000-4000-8000-000000000021', 'palette', true, 1),
('17000000-0000-4001-8000-000000000002', 'Sculptures', 'sculptures', '10000000-0000-4000-8000-000000000021', 'gem', true, 2),
('17000000-0000-4001-8000-000000000003', 'Crafts', 'art-crafts', '10000000-0000-4000-8000-000000000021', 'palette', true, 3),
('17000000-0000-4001-8000-000000000004', 'Furniture', 'antique-furniture', '10000000-0000-4000-8000-000000000022', 'armchair', true, 1),
('17000000-0000-4001-8000-000000000005', 'Jewelry', 'antique-jewelry', '10000000-0000-4000-8000-000000000022', 'gem', true, 2),
('17000000-0000-4001-8000-000000000006', 'Coins', 'antique-coins', '10000000-0000-4000-8000-000000000022', 'circle', true, 3),
('17000000-0000-4001-8000-000000000007', 'Sports', 'sports-memorabilia', '10000000-0000-4000-8000-000000000023', 'trophy', true, 1),
('17000000-0000-4001-8000-000000000008', 'Movies', 'movie-memorabilia', '10000000-0000-4000-8000-000000000023', 'film', true, 2),
('17000000-0000-4001-8000-000000000009', 'Music Collectibles', 'music-memorabilia', '10000000-0000-4000-8000-000000000023', 'music', true, 3),
('17000000-0000-4001-8000-000000000010', 'Model Kits', 'model-kits', '10000000-0000-4000-8000-000000000024', 'box', true, 1),
('17000000-0000-4001-8000-000000000011', 'RC Cars', 'rc-cars', '10000000-0000-4000-8000-000000000024', 'car', true, 2),
('17000000-0000-4001-8000-000000000012', 'Crafts', 'hobby-crafts', '10000000-0000-4000-8000-000000000024', 'palette', true, 3),
('17000000-0000-4001-8000-000000000013', 'DIY Tools', 'diy-tools', '10000000-0000-4000-8000-000000000024', 'wrench', true, 4);

-- =============================================
-- VERIFICATION & SUMMARY
-- =============================================

SELECT '✅ All sub-subcategories (Level 3) added successfully!' as status;

-- Verification: Count categories by level
WITH category_levels AS (
  SELECT 
    id,
    name,
    parent_id,
    CASE 
      WHEN parent_id IS NULL THEN 1
      WHEN parent_id IN (SELECT id FROM categories WHERE parent_id IS NULL) THEN 2
      ELSE 3
    END as level
  FROM categories
  WHERE is_active = true
)
SELECT 
  CASE 
    WHEN level = 1 THEN 'Level 1 (Main Categories)'
    WHEN level = 2 THEN 'Level 2 (Subcategories)'
    ELSE 'Level 3 (Sub-subcategories)'
  END as category_level,
  COUNT(*) as count
FROM category_levels
GROUP BY level
ORDER BY level;

-- Show total count
SELECT '🎉 Total categories: ' || COUNT(*) as summary
FROM categories
WHERE is_active = true;

