-- =============================================
-- SEED CATEGORY ATTRIBUTES
-- =============================================
-- Comprehensive attributes for major categories

-- =============================================
-- ELECTRONICS - Mobile Phones
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Mobile Phones (10000000-0000-4000-8000-000000000001)
('10000000-0000-4000-8000-000000000001', 'Brand', 'brand', 'Brand', 'Select brand', 'select', 'string', true, 
'[
  {"value": "apple", "label": "Apple"},
  {"value": "samsung", "label": "Samsung"},
  {"value": "huawei", "label": "Huawei"},
  {"value": "xiaomi", "label": "Xiaomi"},
  {"value": "oppo", "label": "Oppo"},
  {"value": "vivo", "label": "Vivo"},
  {"value": "tecno", "label": "Tecno"},
  {"value": "infinix", "label": "Infinix"},
  {"value": "itel", "label": "Itel"},
  {"value": "nokia", "label": "Nokia"},
  {"value": "google", "label": "Google"},
  {"value": "oneplus", "label": "OnePlus"},
  {"value": "realme", "label": "Realme"},
  {"value": "other", "label": "Other"}
]'::jsonb, 1, true, true, 'smartphone'),

('10000000-0000-4000-8000-000000000001', 'Model', 'model', 'Model', 'e.g., iPhone 15 Pro', 'text', 'string', true, null, 2, true, true, 'tag'),

('10000000-0000-4000-8000-000000000001', 'Storage', 'storage', 'Storage Capacity', 'Select storage', 'select', 'string', true,
'[
  {"value": "16gb", "label": "16GB"},
  {"value": "32gb", "label": "32GB"},
  {"value": "64gb", "label": "64GB"},
  {"value": "128gb", "label": "128GB"},
  {"value": "256gb", "label": "256GB"},
  {"value": "512gb", "label": "512GB"},
  {"value": "1tb", "label": "1TB"}
]'::jsonb, 3, true, true, 'hard-drive'),

('10000000-0000-4000-8000-000000000001', 'RAM', 'ram', 'RAM', 'Select RAM', 'select', 'string', false,
'[
  {"value": "2gb", "label": "2GB"},
  {"value": "3gb", "label": "3GB"},
  {"value": "4gb", "label": "4GB"},
  {"value": "6gb", "label": "6GB"},
  {"value": "8gb", "label": "8GB"},
  {"value": "12gb", "label": "12GB"},
  {"value": "16gb", "label": "16GB"}
]'::jsonb, 4, true, false, 'cpu'),

('10000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "excellent", "label": "Excellent"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"},
  {"value": "for_parts", "label": "For Parts/Not Working"}
]'::jsonb, 5, true, true, 'star'),

('10000000-0000-4000-8000-000000000001', 'Color', 'color', 'Color', 'e.g., Black, White, Blue', 'text', 'string', false, null, 6, true, false, 'palette'),

('10000000-0000-4000-8000-000000000001', 'Battery Health', 'battery_health', 'Battery Health (%)', '0-100', 'number', 'number', false, null, 7, false, false, 'battery'),

('10000000-0000-4000-8000-000000000001', 'Warranty', 'warranty', 'Warranty Status', 'Select warranty status', 'select', 'string', false,
'[
  {"value": "no_warranty", "label": "No Warranty"},
  {"value": "shop_warranty", "label": "Shop Warranty"},
  {"value": "manufacturer_warranty", "label": "Manufacturer Warranty"}
]'::jsonb, 8, false, false, 'shield'),

('10000000-0000-4000-8000-000000000001', 'Features', 'features', 'Key Features', 'Select features', 'multiselect', 'array', false,
'[
  {"value": "5g", "label": "5G"},
  {"value": "dual_sim", "label": "Dual SIM"},
  {"value": "expandable_storage", "label": "Expandable Storage"},
  {"value": "fast_charging", "label": "Fast Charging"},
  {"value": "wireless_charging", "label": "Wireless Charging"},
  {"value": "water_resistant", "label": "Water Resistant"},
  {"value": "fingerprint_scanner", "label": "Fingerprint Scanner"},
  {"value": "face_unlock", "label": "Face Unlock"}
]'::jsonb, 9, true, false, 'zap');

-- =============================================
-- VEHICLES - Cars
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, min_value, max_value, sort_order, show_in_search, show_in_card, icon) VALUES
-- Cars (20000000-0000-4000-8000-000000000001)
('20000000-0000-4000-8000-000000000001', 'Brand', 'brand', 'Brand', 'Select brand', 'select', 'string', true,
'[
  {"value": "toyota", "label": "Toyota"},
  {"value": "honda", "label": "Honda"},
  {"value": "nissan", "label": "Nissan"},
  {"value": "mazda", "label": "Mazda"},
  {"value": "mercedes", "label": "Mercedes-Benz"},
  {"value": "bmw", "label": "BMW"},
  {"value": "audi", "label": "Audi"},
  {"value": "volkswagen", "label": "Volkswagen"},
  {"value": "hyundai", "label": "Hyundai"},
  {"value": "kia", "label": "Kia"},
  {"value": "ford", "label": "Ford"},
  {"value": "chevrolet", "label": "Chevrolet"},
  {"value": "lexus", "label": "Lexus"},
  {"value": "land_rover", "label": "Land Rover"},
  {"value": "jeep", "label": "Jeep"},
  {"value": "other", "label": "Other"}
]'::jsonb, null, null, 1, true, true, 'car'),

('20000000-0000-4000-8000-000000000001', 'Model', 'model', 'Model', 'e.g., Camry, Corolla', 'text', 'string', true, null, null, null, 2, true, true, 'tag'),

('20000000-0000-4000-8000-000000000001', 'Year', 'year', 'Year of Manufacture', 'e.g., 2020', 'number', 'number', true, null, 1980, 2025, 3, true, true, 'calendar'),

('20000000-0000-4000-8000-000000000001', 'Mileage', 'mileage', 'Mileage (km)', 'e.g., 50000', 'number', 'number', true, null, 0, 999999, 4, true, true, 'gauge'),

('20000000-0000-4000-8000-000000000001', 'Transmission', 'transmission', 'Transmission', 'Select transmission', 'select', 'string', true,
'[
  {"value": "automatic", "label": "Automatic"},
  {"value": "manual", "label": "Manual"},
  {"value": "semi_automatic", "label": "Semi-Automatic"},
  {"value": "cvt", "label": "CVT"}
]'::jsonb, null, null, 5, true, true, 'settings'),

('20000000-0000-4000-8000-000000000001', 'Fuel Type', 'fuel_type', 'Fuel Type', 'Select fuel type', 'select', 'string', true,
'[
  {"value": "petrol", "label": "Petrol"},
  {"value": "diesel", "label": "Diesel"},
  {"value": "hybrid", "label": "Hybrid"},
  {"value": "electric", "label": "Electric"},
  {"value": "lpg", "label": "LPG/CNG"}
]'::jsonb, null, null, 6, true, true, 'zap'),

('20000000-0000-4000-8000-000000000001', 'Engine Size', 'engine_size', 'Engine Size (L)', 'e.g., 2.0', 'number', 'number', false, null, 0.5, 10.0, 7, true, false, 'cog'),

('20000000-0000-4000-8000-000000000001', 'Color', 'color', 'Exterior Color', 'Select color', 'select', 'string', false,
'[
  {"value": "black", "label": "Black"},
  {"value": "white", "label": "White"},
  {"value": "silver", "label": "Silver"},
  {"value": "gray", "label": "Gray"},
  {"value": "red", "label": "Red"},
  {"value": "blue", "label": "Blue"},
  {"value": "green", "label": "Green"},
  {"value": "gold", "label": "Gold"},
  {"value": "brown", "label": "Brown"},
  {"value": "other", "label": "Other"}
]'::jsonb, null, null, 8, true, false, 'palette'),

('20000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "foreign_used", "label": "Foreign Used"},
  {"value": "locally_used", "label": "Locally Used"}
]'::jsonb, null, null, 9, true, true, 'star'),

('20000000-0000-4000-8000-000000000001', 'Body Type', 'body_type', 'Body Type', 'Select body type', 'select', 'string', false,
'[
  {"value": "sedan", "label": "Sedan"},
  {"value": "suv", "label": "SUV"},
  {"value": "hatchback", "label": "Hatchback"},
  {"value": "coupe", "label": "Coupe"},
  {"value": "convertible", "label": "Convertible"},
  {"value": "wagon", "label": "Wagon"},
  {"value": "pickup", "label": "Pickup Truck"},
  {"value": "van", "label": "Van"},
  {"value": "minivan", "label": "Minivan"}
]'::jsonb, null, null, 10, true, false, 'car'),

('20000000-0000-4000-8000-000000000001', 'Features', 'features', 'Features', 'Select features', 'multiselect', 'array', false,
'[
  {"value": "ac", "label": "Air Conditioning"},
  {"value": "leather_seats", "label": "Leather Seats"},
  {"value": "sunroof", "label": "Sunroof"},
  {"value": "navigation", "label": "Navigation System"},
  {"value": "backup_camera", "label": "Backup Camera"},
  {"value": "bluetooth", "label": "Bluetooth"},
  {"value": "cruise_control", "label": "Cruise Control"},
  {"value": "parking_sensors", "label": "Parking Sensors"},
  {"value": "alloy_wheels", "label": "Alloy Wheels"},
  {"value": "keyless_entry", "label": "Keyless Entry"}
]'::jsonb, null, null, 11, true, false, 'zap'),

('20000000-0000-4000-8000-000000000001', 'Registered', 'registered', 'Registered', 'Is the car registered?', 'boolean', 'boolean', false, null, null, null, 12, true, false, 'check-circle'),

('20000000-0000-4000-8000-000000000001', 'Number of Owners', 'owners', 'Number of Previous Owners', 'e.g., 1', 'number', 'number', false, null, 0, 20, 13, false, false, 'users');

-- =============================================
-- REAL ESTATE - Houses for Sale
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, min_value, max_value, sort_order, show_in_search, show_in_card, icon) VALUES
-- Houses for Sale (30000000-0000-4000-8000-000000000001)
('30000000-0000-4000-8000-000000000001', 'Property Type', 'property_type', 'Property Type', 'Select type', 'select', 'string', true,
'[
  {"value": "detached", "label": "Detached House"},
  {"value": "semi_detached", "label": "Semi-Detached"},
  {"value": "townhouse", "label": "Townhouse"},
  {"value": "bungalow", "label": "Bungalow"},
  {"value": "villa", "label": "Villa"},
  {"value": "mansion", "label": "Mansion"}
]'::jsonb, null, null, 1, true, true, 'home'),

('30000000-0000-4000-8000-000000000001', 'Bedrooms', 'bedrooms', 'Bedrooms', 'Number of bedrooms', 'number', 'number', true, null, 1, 20, 2, true, true, 'bed'),

('30000000-0000-4000-8000-000000000001', 'Bathrooms', 'bathrooms', 'Bathrooms', 'Number of bathrooms', 'number', 'number', true, null, 1, 20, 3, true, true, 'droplet'),

('30000000-0000-4000-8000-000000000001', 'Land Size', 'land_size', 'Land Size (sq m)', 'e.g., 500', 'number', 'number', false, null, 50, 100000, 4, true, false, 'square'),

('30000000-0000-4000-8000-000000000001', 'Built Area', 'built_area', 'Built Area (sq m)', 'e.g., 300', 'number', 'number', false, null, 20, 10000, 5, true, false, 'square'),

('30000000-0000-4000-8000-000000000001', 'Parking Spaces', 'parking', 'Parking Spaces', 'Number of parking spaces', 'number', 'number', false, null, 0, 10, 6, true, false, 'car'),

('30000000-0000-4000-8000-000000000001', 'Furnishing', 'furnishing', 'Furnishing Status', 'Select furnishing', 'select', 'string', false,
'[
  {"value": "furnished", "label": "Fully Furnished"},
  {"value": "semi_furnished", "label": "Semi-Furnished"},
  {"value": "unfurnished", "label": "Unfurnished"}
]'::jsonb, null, null, 7, true, true, 'armchair'),

('30000000-0000-4000-8000-000000000001', 'Year Built', 'year_built', 'Year Built', 'e.g., 2020', 'number', 'number', false, null, 1900, 2025, 8, true, false, 'calendar'),

('30000000-0000-4000-8000-000000000001', 'Features', 'features', 'Features', 'Select features', 'multiselect', 'array', false,
'[
  {"value": "swimming_pool", "label": "Swimming Pool"},
  {"value": "garden", "label": "Garden"},
  {"value": "garage", "label": "Garage"},
  {"value": "security", "label": "24/7 Security"},
  {"value": "balcony", "label": "Balcony"},
  {"value": "terrace", "label": "Terrace"},
  {"value": "gym", "label": "Gym"},
  {"value": "generator", "label": "Generator"},
  {"value": "water_tank", "label": "Water Tank"},
  {"value": "solar_panels", "label": "Solar Panels"}
]'::jsonb, null, null, 9, true, false, 'zap');

-- =============================================
-- ELECTRONICS - Computers
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Computers (10000000-0000-4000-8000-000000000002)
('10000000-0000-4000-8000-000000000002', 'Brand', 'brand', 'Brand', 'Select brand', 'select', 'string', true,
'[
  {"value": "apple", "label": "Apple"},
  {"value": "dell", "label": "Dell"},
  {"value": "hp", "label": "HP"},
  {"value": "lenovo", "label": "Lenovo"},
  {"value": "asus", "label": "ASUS"},
  {"value": "acer", "label": "Acer"},
  {"value": "msi", "label": "MSI"},
  {"value": "microsoft", "label": "Microsoft"},
  {"value": "samsung", "label": "Samsung"},
  {"value": "other", "label": "Other"}
]'::jsonb, 1, true, true, 'laptop'),

('10000000-0000-4000-8000-000000000002', 'Model', 'model', 'Model', 'e.g., MacBook Pro 16', 'text', 'string', true, null, 2, true, false, 'tag'),

('10000000-0000-4000-8000-000000000002', 'Processor', 'processor', 'Processor', 'e.g., Intel i7, M2', 'text', 'string', false, null, 3, true, false, 'cpu'),

('10000000-0000-4000-8000-000000000002', 'RAM', 'ram', 'RAM', 'Select RAM', 'select', 'string', true,
'[
  {"value": "4gb", "label": "4GB"},
  {"value": "8gb", "label": "8GB"},
  {"value": "16gb", "label": "16GB"},
  {"value": "32gb", "label": "32GB"},
  {"value": "64gb", "label": "64GB"}
]'::jsonb, 4, true, true, 'cpu'),

('10000000-0000-4000-8000-000000000002', 'Storage', 'storage', 'Storage', 'Select storage', 'select', 'string', true,
'[
  {"value": "128gb", "label": "128GB SSD"},
  {"value": "256gb", "label": "256GB SSD"},
  {"value": "512gb", "label": "512GB SSD"},
  {"value": "1tb", "label": "1TB SSD"},
  {"value": "2tb", "label": "2TB SSD"},
  {"value": "500gb_hdd", "label": "500GB HDD"},
  {"value": "1tb_hdd", "label": "1TB HDD"}
]'::jsonb, 5, true, true, 'hard-drive'),

('10000000-0000-4000-8000-000000000002', 'Screen Size', 'screen_size', 'Screen Size', 'Select screen size', 'select', 'string', false,
'[
  {"value": "13", "label": "13 inches"},
  {"value": "14", "label": "14 inches"},
  {"value": "15", "label": "15 inches"},
  {"value": "16", "label": "16 inches"},
  {"value": "17", "label": "17 inches"},
  {"value": "24", "label": "24 inches"},
  {"value": "27", "label": "27 inches"}
]'::jsonb, 6, true, false, 'monitor'),

('10000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 7, true, true, 'star');

-- =============================================
-- ELECTRONICS - Tablets
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Tablets (10000000-0000-4000-8000-000000000003)
('10000000-0000-4000-8000-000000000003', 'Brand', 'brand', 'Brand', 'Select brand', 'select', 'string', true,
'[
  {"value": "apple", "label": "Apple"},
  {"value": "samsung", "label": "Samsung"},
  {"value": "huawei", "label": "Huawei"},
  {"value": "lenovo", "label": "Lenovo"},
  {"value": "microsoft", "label": "Microsoft"},
  {"value": "amazon", "label": "Amazon"},
  {"value": "other", "label": "Other"}
]'::jsonb, 1, true, true, 'tablet'),

('10000000-0000-4000-8000-000000000003', 'Model', 'model', 'Model', 'e.g., iPad Pro, Galaxy Tab', 'text', 'string', true, null, 2, true, true, 'tag'),

('10000000-0000-4000-8000-000000000003', 'Storage', 'storage', 'Storage', 'Select storage', 'select', 'string', true,
'[
  {"value": "32gb", "label": "32GB"},
  {"value": "64gb", "label": "64GB"},
  {"value": "128gb", "label": "128GB"},
  {"value": "256gb", "label": "256GB"},
  {"value": "512gb", "label": "512GB"},
  {"value": "1tb", "label": "1TB"}
]'::jsonb, 3, true, true, 'hard-drive'),

('10000000-0000-4000-8000-000000000003', 'Screen Size', 'screen_size', 'Screen Size', 'Select screen size', 'select', 'string', false,
'[
  {"value": "7", "label": "7 inches"},
  {"value": "8", "label": "8 inches"},
  {"value": "10", "label": "10 inches"},
  {"value": "11", "label": "11 inches"},
  {"value": "12", "label": "12 inches"}
]'::jsonb, 4, true, false, 'tablet'),

('10000000-0000-4000-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 5, true, true, 'star');

-- =============================================
-- VEHICLES - Motorcycles
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, min_value, max_value, sort_order, show_in_search, show_in_card, icon) VALUES
-- Motorcycles (20000000-0000-4000-8000-000000000002)
('20000000-0000-4000-8000-000000000002', 'Brand', 'brand', 'Brand', 'Select brand', 'select', 'string', true,
'[
  {"value": "honda", "label": "Honda"},
  {"value": "yamaha", "label": "Yamaha"},
  {"value": "suzuki", "label": "Suzuki"},
  {"value": "kawasaki", "label": "Kawasaki"},
  {"value": "bajaj", "label": "Bajaj"},
  {"value": "tvs", "label": "TVS"},
  {"value": "royal_enfield", "label": "Royal Enfield"},
  {"value": "harley", "label": "Harley-Davidson"},
  {"value": "bmw", "label": "BMW"},
  {"value": "other", "label": "Other"}
]'::jsonb, null, null, 1, true, true, 'bike'),

('20000000-0000-4000-8000-000000000002', 'Model', 'model', 'Model', 'e.g., CBR 600', 'text', 'string', true, null, null, null, 2, true, true, 'tag'),

('20000000-0000-4000-8000-000000000002', 'Year', 'year', 'Year', 'e.g., 2020', 'number', 'number', true, null, 1980, 2025, 3, true, false, 'calendar'),

('20000000-0000-4000-8000-000000000002', 'Engine Size', 'engine_size', 'Engine Size (cc)', 'e.g., 125', 'number', 'number', true, null, 50, 2000, 4, true, true, 'cog'),

('20000000-0000-4000-8000-000000000002', 'Mileage', 'mileage', 'Mileage (km)', 'e.g., 15000', 'number', 'number', false, null, 0, 999999, 5, true, false, 'gauge'),

('20000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "foreign_used", "label": "Foreign Used"},
  {"value": "locally_used", "label": "Locally Used"}
]'::jsonb, null, null, 6, true, true, 'star'),

('20000000-0000-4000-8000-000000000002', 'Registered', 'registered', 'Registered', 'Is it registered?', 'boolean', 'boolean', false, null, null, null, 7, true, false, 'check-circle');

-- =============================================
-- REAL ESTATE - Apartments for Rent
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, min_value, max_value, sort_order, show_in_search, show_in_card, icon) VALUES
-- Apartments for Rent (30000000-0000-4000-8000-000000000002)
('30000000-0000-4000-8000-000000000002', 'Bedrooms', 'bedrooms', 'Bedrooms', 'Number of bedrooms', 'number', 'number', true, null, 0, 10, 1, true, true, 'bed'),

('30000000-0000-4000-8000-000000000002', 'Bathrooms', 'bathrooms', 'Bathrooms', 'Number of bathrooms', 'number', 'number', true, null, 1, 10, 2, true, true, 'droplet'),

('30000000-0000-4000-8000-000000000002', 'Furnishing', 'furnishing', 'Furnishing', 'Select furnishing', 'select', 'string', true,
'[
  {"value": "furnished", "label": "Fully Furnished"},
  {"value": "semi_furnished", "label": "Semi-Furnished"},
  {"value": "unfurnished", "label": "Unfurnished"}
]'::jsonb, null, null, 3, true, true, 'armchair'),

('30000000-0000-4000-8000-000000000002', 'Area', 'area', 'Area (sq m)', 'e.g., 100', 'number', 'number', false, null, 20, 1000, 4, true, false, 'square'),

('30000000-0000-4000-8000-000000000002', 'Parking', 'parking', 'Parking Spaces', 'Number of parking', 'number', 'number', false, null, 0, 5, 5, true, false, 'car'),

('30000000-0000-4000-8000-000000000002', 'Features', 'features', 'Features', 'Select features', 'multiselect', 'array', false,
'[
  {"value": "ac", "label": "Air Conditioning"},
  {"value": "balcony", "label": "Balcony"},
  {"value": "security", "label": "24/7 Security"},
  {"value": "elevator", "label": "Elevator"},
  {"value": "generator", "label": "Generator"},
  {"value": "water", "label": "Water Supply"},
  {"value": "pool", "label": "Swimming Pool"},
  {"value": "gym", "label": "Gym"}
]'::jsonb, null, null, 6, true, false, 'zap');

-- =============================================
-- FASHION - Men's Clothing
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Men's Clothing (40000000-0000-4000-8000-000000000001)
('40000000-0000-4000-8000-000000000001', 'Brand', 'brand', 'Brand', 'e.g., Nike, Adidas', 'text', 'string', false, null, 1, true, false, 'tag'),

('40000000-0000-4000-8000-000000000001', 'Size', 'size', 'Size', 'Select size', 'select', 'string', true,
'[
  {"value": "xs", "label": "XS"},
  {"value": "s", "label": "S"},
  {"value": "m", "label": "M"},
  {"value": "l", "label": "L"},
  {"value": "xl", "label": "XL"},
  {"value": "2xl", "label": "2XL"},
  {"value": "3xl", "label": "3XL"},
  {"value": "4xl", "label": "4XL"}
]'::jsonb, 2, true, true, 'ruler'),

('40000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 3, true, true, 'star'),

('40000000-0000-4000-8000-000000000001', 'Color', 'color', 'Color', 'e.g., Black, Blue', 'text', 'string', false, null, 4, true, false, 'palette'),

('40000000-0000-4000-8000-000000000001', 'Material', 'material', 'Material', 'e.g., Cotton, Polyester', 'text', 'string', false, null, 5, false, false, 'package');

-- =============================================
-- FASHION - Women's Clothing
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Women's Clothing (40000000-0000-4000-8000-000000000002)
('40000000-0000-4000-8000-000000000002', 'Brand', 'brand', 'Brand', 'e.g., Zara, H&M', 'text', 'string', false, null, 1, true, false, 'tag'),

('40000000-0000-4000-8000-000000000002', 'Size', 'size', 'Size', 'Select size', 'select', 'string', true,
'[
  {"value": "xs", "label": "XS"},
  {"value": "s", "label": "S"},
  {"value": "m", "label": "M"},
  {"value": "l", "label": "L"},
  {"value": "xl", "label": "XL"},
  {"value": "2xl", "label": "2XL"},
  {"value": "3xl", "label": "3XL"}
]'::jsonb, 2, true, true, 'ruler'),

('40000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 3, true, true, 'star'),

('40000000-0000-4000-8000-000000000002', 'Color', 'color', 'Color', 'e.g., Red, Pink', 'text', 'string', false, null, 4, true, false, 'palette');

-- =============================================
-- FASHION - Shoes
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Shoes (40000000-0000-4000-8000-000000000004)
('40000000-0000-4000-8000-000000000004', 'Brand', 'brand', 'Brand', 'e.g., Nike, Adidas', 'text', 'string', false, null, 1, true, false, 'tag'),

('40000000-0000-4000-8000-000000000004', 'Size', 'size', 'Size (EU)', 'Select size', 'select', 'string', true,
'[
  {"value": "35", "label": "35"},
  {"value": "36", "label": "36"},
  {"value": "37", "label": "37"},
  {"value": "38", "label": "38"},
  {"value": "39", "label": "39"},
  {"value": "40", "label": "40"},
  {"value": "41", "label": "41"},
  {"value": "42", "label": "42"},
  {"value": "43", "label": "43"},
  {"value": "44", "label": "44"},
  {"value": "45", "label": "45"},
  {"value": "46", "label": "46"}
]'::jsonb, 2, true, true, 'footprints'),

('40000000-0000-4000-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "used", "label": "Used"}
]'::jsonb, 3, true, true, 'star'),

('40000000-0000-4000-8000-000000000004', 'Color', 'color', 'Color', 'e.g., Black, White', 'text', 'string', false, null, 4, true, false, 'palette'),

('40000000-0000-4000-8000-000000000004', 'Gender', 'gender', 'Gender', 'Select gender', 'select', 'string', false,
'[
  {"value": "men", "label": "Men"},
  {"value": "women", "label": "Women"},
  {"value": "unisex", "label": "Unisex"}
]'::jsonb, 5, true, false, 'users');

-- =============================================
-- HOME & FURNITURE - Living Room
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Living Room (50000000-0000-4000-8000-000000000001)
('50000000-0000-4000-8000-000000000001', 'Material', 'material', 'Material', 'Select material', 'select', 'string', false,
'[
  {"value": "wood", "label": "Wood"},
  {"value": "metal", "label": "Metal"},
  {"value": "glass", "label": "Glass"},
  {"value": "leather", "label": "Leather"},
  {"value": "fabric", "label": "Fabric"},
  {"value": "plastic", "label": "Plastic"}
]'::jsonb, 1, true, false, 'package'),

('50000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 2, true, true, 'star'),

('50000000-0000-4000-8000-000000000001', 'Color', 'color', 'Color', 'e.g., Brown, Gray', 'text', 'string', false, null, 3, true, false, 'palette');

-- =============================================
-- HOME & FURNITURE - Bedroom
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Bedroom (50000000-0000-4000-8000-000000000002)
('50000000-0000-4000-8000-000000000002', 'Size', 'size', 'Size', 'Select size', 'select', 'string', false,
'[
  {"value": "single", "label": "Single"},
  {"value": "double", "label": "Double"},
  {"value": "queen", "label": "Queen"},
  {"value": "king", "label": "King"}
]'::jsonb, 1, true, true, 'bed'),

('50000000-0000-4000-8000-000000000002', 'Material', 'material', 'Material', 'Select material', 'select', 'string', false,
'[
  {"value": "wood", "label": "Wood"},
  {"value": "metal", "label": "Metal"},
  {"value": "upholstered", "label": "Upholstered"}
]'::jsonb, 2, true, false, 'package'),

('50000000-0000-4000-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 3, true, true, 'star');

-- =============================================
-- BABY & KIDS - Baby Gear
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Baby Gear (80000000-0000-4000-8000-000000000001)
('80000000-0000-4000-8000-000000000001', 'Brand', 'brand', 'Brand', 'e.g., Graco, Chicco', 'text', 'string', false, null, 1, true, false, 'tag'),

('80000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"}
]'::jsonb, 2, true, true, 'star'),

('80000000-0000-4000-8000-000000000001', 'Age Range', 'age_range', 'Age Range', 'Select age range', 'select', 'string', false,
'[
  {"value": "0-6m", "label": "0-6 months"},
  {"value": "6-12m", "label": "6-12 months"},
  {"value": "1-2y", "label": "1-2 years"},
  {"value": "2-4y", "label": "2-4 years"}
]'::jsonb, 3, true, false, 'baby');

-- =============================================
-- SPORTS & FITNESS - Fitness Equipment
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Fitness Equipment (70000000-0000-4000-8000-000000000001)
('70000000-0000-4000-8000-000000000001', 'Brand', 'brand', 'Brand', 'e.g., Bowflex, NordicTrack', 'text', 'string', false, null, 1, true, false, 'tag'),

('70000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 2, true, true, 'star');

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, min_value, max_value, sort_order, show_in_search, show_in_card, icon) VALUES
('70000000-0000-4000-8000-000000000001', 'Weight', 'weight', 'Weight/Capacity (kg)', 'e.g., 50', 'number', 'number', false, null, 1, 500, 3, true, false, 'dumbbell');

-- =============================================
-- BOOKS & MEDIA - Books
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
-- Books (90000000-0000-4000-8000-000000000001)
('90000000-0000-4000-8000-000000000001', 'Author', 'author', 'Author', 'Book author', 'text', 'string', false, null, 1, true, false, 'user'),

('90000000-0000-4000-8000-000000000001', 'Genre', 'genre', 'Genre', 'Select genre', 'select', 'string', false,
'[
  {"value": "fiction", "label": "Fiction"},
  {"value": "non_fiction", "label": "Non-Fiction"},
  {"value": "educational", "label": "Educational"},
  {"value": "religious", "label": "Religious"},
  {"value": "children", "label": "Children"},
  {"value": "biography", "label": "Biography"}
]'::jsonb, 2, true, false, 'book'),

('90000000-0000-4000-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "acceptable", "label": "Acceptable"}
]'::jsonb, 3, true, true, 'star'),

('90000000-0000-4000-8000-000000000001', 'Language', 'language', 'Language', 'Select language', 'select', 'string', false,
'[
  {"value": "english", "label": "English"},
  {"value": "french", "label": "French"},
  {"value": "twi", "label": "Twi"},
  {"value": "ga", "label": "Ga"},
  {"value": "ewe", "label": "Ewe"}
]'::jsonb, 4, true, false, 'globe');

-- =============================================
-- PETS - Pet Sales
-- =============================================

INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, min_value, max_value, sort_order, show_in_search, show_in_card, icon) VALUES
-- Pet Sales (d0000000-0000-4000-8000-000000000001)
('d0000000-0000-4000-8000-000000000001', 'Breed', 'breed', 'Breed', 'e.g., Labrador, Persian', 'text', 'string', false, null, null, null, 1, true, true, 'tag'),

('d0000000-0000-4000-8000-000000000001', 'Age', 'age', 'Age', 'e.g., 2 months, 1 year', 'text', 'string', false, null, null, null, 2, true, false, 'calendar'),

('d0000000-0000-4000-8000-000000000001', 'Gender', 'gender', 'Gender', 'Select gender', 'select', 'string', false,
'[
  {"value": "male", "label": "Male"},
  {"value": "female", "label": "Female"}
]'::jsonb, null, null, 3, true, false, 'heart'),

('d0000000-0000-4000-8000-000000000001', 'Vaccinated', 'vaccinated', 'Vaccinated', 'Is vaccinated?', 'boolean', 'boolean', false, null, null, null, 4, true, false, 'shield'),

('d0000000-0000-4000-8000-000000000001', 'Health Status', 'health_status', 'Health Status', 'Select status', 'select', 'string', false,
'[
  {"value": "excellent", "label": "Excellent"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, null, null, 5, true, false, 'heart-pulse');

SELECT '✅ Category attributes seeded successfully!' as status;
SELECT COUNT(*) || ' attributes created' as summary FROM category_attributes;

