-- =============================================
-- VIDEO GAMES & CONSOLES CATEGORY UPDATE
-- =============================================
-- This migration:
-- 1. Renames "Gaming" to "Video games & consoles"
-- 2. Adds Level 3 subcategories (Consoles, Games, Controllers, etc.)
-- 3. Adds comprehensive attributes for each subcategory

-- =============================================
-- STEP 1: Rename Gaming to Video games & consoles
-- =============================================
UPDATE categories
SET 
  name = 'Video games & consoles',
  slug = 'video-games-consoles'
WHERE id = '10000000-0000-4000-8000-000000000007'
  AND name = 'Gaming';

-- =============================================
-- STEP 2: Add Level 3 Subcategories
-- =============================================

-- Consoles
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8000-000000000001', 'Consoles', 'consoles', '10000000-0000-4000-8000-000000000007', 'gamepad-2', true, 1);

-- Games
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8000-000000000002', 'Games', 'games', '10000000-0000-4000-8000-000000000007', 'disc', true, 2);

-- Controllers
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8000-000000000003', 'Controllers', 'controllers', '10000000-0000-4000-8000-000000000007', 'gamepad', true, 3);

-- Gaming headsets
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8000-000000000004', 'Gaming headsets', 'gaming-headsets', '10000000-0000-4000-8000-000000000007', 'headphones', true, 4);

-- Simulators
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8000-000000000005', 'Simulators', 'simulators', '10000000-0000-4000-8000-000000000007', 'joystick', true, 5);

-- Virtual reality
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8000-000000000006', 'Virtual reality', 'virtual-reality', '10000000-0000-4000-8000-000000000007', 'glasses', true, 6);

-- Accessories
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8000-000000000007', 'Accessories', 'gaming-accessories', '10000000-0000-4000-8000-000000000007', 'cable', true, 7);

-- =============================================
-- STEP 3: Add Level 4 Subcategories for Virtual Reality
-- =============================================

-- VR headsets
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8006-000000000001', 'VR headsets', 'vr-headsets', '10000000-0000-4007-8000-000000000006', 'glasses', true, 1);

-- VR accessories
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8006-000000000002', 'VR accessories', 'vr-accessories', '10000000-0000-4007-8000-000000000006', 'cable', true, 2);

-- VR device parts
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8006-000000000003', 'VR device parts', 'vr-device-parts', '10000000-0000-4007-8000-000000000006', 'settings', true, 3);

-- =============================================
-- STEP 4: Add Level 4 Subcategories for Accessories
-- =============================================

-- Cases
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8007-000000000001', 'Cases', 'gaming-cases', '10000000-0000-4007-8000-000000000007', 'briefcase', true, 1);

-- Gaming holders & stands
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8007-000000000002', 'Gaming holders & stands', 'gaming-holders-stands', '10000000-0000-4007-8000-000000000007', 'monitor', true, 2);

-- Gaming chargers & charging docks
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8007-000000000003', 'Gaming chargers & charging docks', 'gaming-chargers-docks', '10000000-0000-4007-8000-000000000007', 'battery-charging', true, 3);

-- Game strategy guides
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8007-000000000004', 'Game strategy guides', 'game-strategy-guides', '10000000-0000-4007-8000-000000000007', 'book-open', true, 4);

-- Other accessories
INSERT INTO categories (id, name, slug, parent_id, icon, is_active, sort_order) VALUES
('10000000-0000-4007-8007-000000000005', 'Other accessories', 'other-gaming-accessories', '10000000-0000-4007-8000-000000000007', 'package', true, 5);

-- =============================================
-- STEP 5: Add Attributes for Consoles
-- =============================================

-- Condition
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Brand
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000001', 'Brand', 'brand', 'Brand', 'Select brand', 'select', 'string', true,
'[
  {"value": "sony_playstation", "label": "Sony PlayStation"},
  {"value": "microsoft_xbox", "label": "Microsoft Xbox"},
  {"value": "nintendo", "label": "Nintendo"},
  {"value": "valve_steam_deck", "label": "Valve Steam Deck"},
  {"value": "other", "label": "Other"}
]'::jsonb, 2, true, true, 'tag');

-- Model
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000001', 'Model', 'model', 'Model', 'e.g., PS5, Xbox Series X', 'text', 'string', false, null, 3, true, true, 'cpu');

-- Storage Capacity
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000001', 'Storage', 'storage', 'Storage Capacity', 'Select storage', 'select', 'string', false,
'[
  {"value": "500gb", "label": "500GB"},
  {"value": "1tb", "label": "1TB"},
  {"value": "2tb", "label": "2TB"},
  {"value": "custom", "label": "Custom"}
]'::jsonb, 4, true, true, 'hard-drive');

-- =============================================
-- STEP 6: Add Attributes for Games
-- =============================================

-- Condition
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000002', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Platform
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000002', 'Platform', 'platform', 'Platform', 'Select platform', 'select', 'string', true,
'[
  {"value": "playstation_5", "label": "PlayStation 5"},
  {"value": "playstation_4", "label": "PlayStation 4"},
  {"value": "xbox_series_x_s", "label": "Xbox Series X/S"},
  {"value": "xbox_one", "label": "Xbox One"},
  {"value": "nintendo_switch", "label": "Nintendo Switch"},
  {"value": "pc", "label": "PC"},
  {"value": "multi_platform", "label": "Multi-platform"}
]'::jsonb, 2, true, true, 'gamepad-2');

-- Genre
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000002', 'Genre', 'genre', 'Genre', 'Select genre', 'select', 'string', false,
'[
  {"value": "action", "label": "Action"},
  {"value": "adventure", "label": "Adventure"},
  {"value": "rpg", "label": "RPG"},
  {"value": "sports", "label": "Sports"},
  {"value": "racing", "label": "Racing"},
  {"value": "shooter", "label": "Shooter"},
  {"value": "strategy", "label": "Strategy"},
  {"value": "simulation", "label": "Simulation"},
  {"value": "puzzle", "label": "Puzzle"},
  {"value": "horror", "label": "Horror"}
]'::jsonb, 3, true, false, 'layers');

-- =============================================
-- STEP 7: Add Attributes for Controllers
-- =============================================

-- Condition
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000003', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Compatible With
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000003', 'Compatible With', 'compatible_with', 'Compatible With', 'Select platform', 'select', 'string', true,
'[
  {"value": "playstation", "label": "PlayStation"},
  {"value": "xbox", "label": "Xbox"},
  {"value": "nintendo_switch", "label": "Nintendo Switch"},
  {"value": "pc", "label": "PC"},
  {"value": "multi_platform", "label": "Multi-platform"}
]'::jsonb, 2, true, true, 'gamepad');

-- Connection Type
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000003', 'Connection Type', 'connection_type', 'Connection Type', 'Select connection type', 'select', 'string', false,
'[
  {"value": "wireless", "label": "Wireless"},
  {"value": "wired", "label": "Wired"},
  {"value": "bluetooth", "label": "Bluetooth"}
]'::jsonb, 3, true, false, 'wifi');

-- =============================================
-- STEP 8: Add Attributes for Gaming Headsets
-- =============================================

-- Condition
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000004', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Brand
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000004', 'Brand', 'brand', 'Brand', 'e.g., Razer, SteelSeries', 'text', 'string', false, null, 2, true, true, 'tag');

-- Connection Type
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000004', 'Connection Type', 'connection_type', 'Connection Type', 'Select connection type', 'select', 'string', false,
'[
  {"value": "wireless", "label": "Wireless"},
  {"value": "wired", "label": "Wired"},
  {"value": "bluetooth", "label": "Bluetooth"}
]'::jsonb, 3, true, false, 'wifi');

-- =============================================
-- STEP 9: Add Attributes for Simulators
-- =============================================

-- Condition
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000005', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Type
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000005', 'Type', 'type', 'Simulator Type', 'Select type', 'select', 'string', true,
'[
  {"value": "racing_wheel", "label": "Racing Wheel"},
  {"value": "flight_stick", "label": "Flight Stick"},
  {"value": "pedals", "label": "Pedals"},
  {"value": "complete_setup", "label": "Complete Setup"}
]'::jsonb, 2, true, true, 'joystick');

-- =============================================
-- STEP 10: Add Attributes for VR Headsets
-- =============================================

-- Condition
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8006-000000000001', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Brand
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8006-000000000001', 'Brand', 'brand', 'Brand', 'Select brand', 'select', 'string', true,
'[
  {"value": "meta_quest", "label": "Meta Quest"},
  {"value": "playstation_vr", "label": "PlayStation VR"},
  {"value": "htc_vive", "label": "HTC Vive"},
  {"value": "valve_index", "label": "Valve Index"},
  {"value": "other", "label": "Other"}
]'::jsonb, 2, true, true, 'tag');

-- =============================================
-- STEP 11: Add Attributes for Gaming Accessories
-- =============================================

-- Condition
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000007', 'Condition', 'condition', 'Condition', 'Select condition', 'select', 'string', true,
'[
  {"value": "brand_new", "label": "Brand New"},
  {"value": "like_new", "label": "Like New"},
  {"value": "good", "label": "Good"},
  {"value": "fair", "label": "Fair"}
]'::jsonb, 1, true, true, 'star');

-- Type
INSERT INTO category_attributes (category_id, name, slug, label, placeholder, field_type, data_type, is_required, options, sort_order, show_in_search, show_in_card, icon) VALUES
('10000000-0000-4007-8000-000000000007', 'Type', 'type', 'Accessory Type', 'e.g., Cable, Stand, Case', 'text', 'string', false, null, 2, true, false, 'package');
