-- =============================================
-- ADD CONDITION ATTRIBUTES TO REMAINING CATEGORIES
-- =============================================
-- Adding condition to all physical product categories that don't have it yet

-- =============================================
-- ELECTRONICS - Remaining Categories
-- =============================================

-- Audio (10000000-0000-4000-8000-000000000004)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Wearables (10000000-0000-4000-8000-000000000005)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000005', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Cameras (10000000-0000-4000-8000-000000000006)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000006', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Gaming (10000000-0000-4000-8000-000000000007)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000007', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- =============================================
-- VEHICLES - Remaining Categories
-- =============================================

-- Commercial Vehicles (20000000-0000-4000-8000-000000000003)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "foreign_used", "label": "Foreign Used"},
  {"value": "locally_used", "label": "Locally Used"}
]'::jsonb, 1, true, true, 'star');

-- Vehicle Parts & Accessories (20000000-0000-4000-8000-000000000004)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"},
  {"value": "refurbished", "label": "Refurbished"}
]'::jsonb, 1, true, true, 'star');

-- Tires & Wheels (20000000-0000-4000-8000-000000000006)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000006', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 1, true, true, 'star');

-- Car Electronics & GPS (20000000-0000-4000-8000-000000000007)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000007', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"},
  {"value": "refurbished", "label": "Refurbished"}
]'::jsonb, 1, true, true, 'star');

-- Engines & Transmissions (20000000-0000-4000-8000-000000000005)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000005', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"},
  {"value": "refurbished", "label": "Refurbished"},
  {"value": "rebuilt", "label": "Rebuilt"}
]'::jsonb, 1, true, true, 'star');

-- Exhaust & Emission Systems (20000000-0000-4000-8000-000000000008)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000008', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 1, true, true, 'star');

-- Brakes & Suspension (20000000-0000-4000-8000-000000000009)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000009', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 1, true, true, 'star');

-- Body Parts & Panels (20000000-0000-4000-8000-000000000010) 
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000010', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 1, true, true, 'star');

-- Boats & Watercraft (20000000-0000-4000-8000-000000000011)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('20000000-0000-4000-8000-000000000011', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "foreign_used", "label": "Foreign Used"},
  {"value": "locally_used", "label": "Locally Used"}
]'::jsonb, 1, true, true, 'star');

-- =============================================
-- FASHION - Remaining Categories
-- =============================================

-- Kids & Baby Clothing (40000000-0000-4000-8000-000000000003)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('40000000-0000-4000-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 1, true, true, 'star');

-- Bags & Luggage (40000000-0000-4000-8000-000000000005)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('40000000-0000-4000-8000-000000000005', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 1, true, true, 'star');

-- Jewelry & Watches (40000000-0000-4000-8000-000000000006)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('40000000-0000-4000-8000-000000000006', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"}
]'::jsonb, 1, true, true, 'star');

-- Traditional / Cultural Wear (40000000-0000-4000-8000-000000000007)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('40000000-0000-4000-8000-000000000007', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 1, true, true, 'star');

-- =============================================
-- HOME & FURNITURE - Remaining Categories
-- =============================================

-- Kitchen & Dining (50000000-0000-4000-8000-000000000003)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('50000000-0000-4000-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Home Décor (50000000-0000-4000-8000-000000000004)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('50000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Appliances (50000000-0000-4000-8000-000000000005)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('50000000-0000-4000-8000-000000000005', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Outdoor Furniture (50000000-0000-4000-8000-000000000006)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('50000000-0000-4000-8000-000000000006', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- =============================================
-- SPORTS, BABY, BOOKS, MEDIA - Remaining Categories
-- =============================================

-- Team Sports (70000000-0000-4000-8000-000000000002)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('70000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Outdoor Gear (70000000-0000-4000-8000-000000000003)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('70000000-0000-4000-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Bicycles & Scooters (70000000-0000-4000-8000-000000000004)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('70000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Baby Essentials (80000000-0000-4000-8000-000000000002)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('80000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"}
]'::jsonb, 1, true, true, 'star');

-- Toys & Games (80000000-0000-4000-8000-000000000004)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('80000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- School Supplies (80000000-0000-4000-8000-000000000005)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('80000000-0000-4000-8000-000000000005', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"}
]'::jsonb, 1, true, true, 'star');

-- Music (90000000-0000-4000-8000-000000000003)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('90000000-0000-4000-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Movies & Games (90000000-0000-4000-8000-000000000004)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('90000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"}
]'::jsonb, 1, true, true, 'star');

-- Pet Accessories (d0000000-0000-4000-8000-000000000002)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('d0000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"}
]'::jsonb, 1, true, true, 'star');

-- =============================================
-- INDUSTRIAL & BUSINESS - All Categories
-- =============================================

-- Office Equipment (e0000000-0000-4000-8000-000000000001)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('e0000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Industrial Machinery (e0000000-0000-4000-8000-000000000002)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('e0000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"},
  {"value": "refurbished", "label": "Refurbished"}
]'::jsonb, 1, true, true, 'star');

-- Building & Construction (e0000000-0000-4000-8000-000000000003)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('e0000000-0000-4000-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "used", "label": "Used"},
  {"value": "refurbished", "label": "Refurbished"}
]'::jsonb, 1, true, true, 'star');

-- Wholesale & Bulk (e0000000-0000-4000-8000-000000000004)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('e0000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "bulk", "label": "Bulk"}
]'::jsonb, 1, true, true, 'star');

-- Retail Supplies (e0000000-0000-4000-8000-000000000005)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('e0000000-0000-4000-8000-000000000005', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"}
]'::jsonb, 1, true, true, 'star');

-- =============================================
-- COLLECTIBLES & HOBBIES - All Categories (Special Grading)
-- =============================================

-- Art (10000000-0000-4000-8000-000000000021)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000021', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "original", "label": "Original"},
  {"value": "reproduction", "label": "Reproduction"},
  {"value": "new", "label": "New"}
]'::jsonb, 1, true, true, 'star');

-- Antiques (10000000-0000-4000-8000-000000000022)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000022', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "excellent", "label": "Excellent"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"},
  {"value": "poor", "label": "Poor (For Restoration)"}
]'::jsonb, 1, true, true, 'star');

-- Memorabilia (10000000-0000-4000-8000-000000000023)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000023', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "mint", "label": "Mint"},
  {"value": "near_mint", "label": "Near Mint"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Hobbies (10000000-0000-4000-8000-000000000024)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000024', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- =============================================
-- MISCELLANEOUS CATEGORIES
-- =============================================

-- Free Items / Giveaways (10000000-0000-4000-8000-000000000031)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000031', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Lost & Found (10000000-0000-4000-8000-000000000032) - condition helpful for found items
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000032', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Swap / Exchange Deals (10000000-0000-4000-8000-000000000033)
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4000-8000-000000000033', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

SELECT '✅ Added condition attributes to 39 additional categories!' as status;
SELECT COUNT(*) || ' total condition attributes now in system' as summary FROM category_attributes WHERE slug = 'condition';

-- =============================================
-- SUMMARY BREAKDOWN
-- =============================================
SELECT '
📊 CONDITION ATTRIBUTES ADDED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Electronics: 4 categories (Audio, Wearables, Cameras, Gaming)
✅ Vehicles: 9 categories (Commercial, Parts, Tires, GPS, Engines, Exhaust, Brakes, Body Parts, Boats)
✅ Fashion: 4 categories (Kids Clothing, Bags, Jewelry, Traditional Wear)
✅ Home & Furniture: 4 categories (Kitchen, Décor, Appliances, Outdoor)
✅ Sports & Others: 9 categories (Team Sports, Outdoor Gear, Bicycles, Baby Essentials, Toys, School Supplies, Music, Movies, Pet Accessories)
✅ Industrial & Business: 5 categories (Office Equipment, Machinery, Construction, Wholesale, Retail)
✅ Collectibles & Hobbies: 4 categories (Art, Antiques, Memorabilia, Hobbies)
✅ Miscellaneous: 3 categories (Free Items, Lost & Found, Swap/Exchange)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 TOTAL NEW: 39 categories
📦 TOTAL IN SYSTEM: 16 existing + 39 new = 55 categories with condition
' as summary;

