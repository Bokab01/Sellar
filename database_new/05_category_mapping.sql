-- Sellar Mobile App - Category ID Mapping
-- This script creates a mapping between frontend string IDs and database UUIDs
-- and provides functions to convert between them

-- =============================================
-- CATEGORY ID MAPPING TABLE
-- =============================================

-- Create a mapping table for frontend string IDs to database UUIDs
CREATE TABLE IF NOT EXISTS category_id_mapping (
    frontend_id TEXT PRIMARY KEY,
    database_uuid UUID NOT NULL REFERENCES categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INSERT CATEGORY MAPPINGS
-- =============================================

-- Main categories mapping
INSERT INTO category_id_mapping (frontend_id, database_uuid) VALUES
('electronics', '00000000-0000-4000-8000-000000000001'),
('fashion', '00000000-0000-4000-8000-000000000002'),
('vehicles', '00000000-0000-4000-8000-000000000003'),
('home-garden', '00000000-0000-4000-8000-000000000004'),
('health-sports', '00000000-0000-4000-8000-000000000005'),
('business', '00000000-0000-4000-8000-000000000006'),
('education', '00000000-0000-4000-8000-000000000007'),
('entertainment', '00000000-0000-4000-8000-000000000008'),
('food', '00000000-0000-4000-8000-000000000009'),
('services', '00000000-0000-4000-8000-000000000010'),
('baby-kids', '00000000-0000-4000-8000-000000000011'),
('beauty-health', '00000000-0000-4000-8000-000000000012'),
('pets-animals', '00000000-0000-4000-8000-000000000013'),
('art-crafts', '00000000-0000-4000-8000-000000000014'),
('tickets-events', '00000000-0000-4000-8000-000000000015'),
('general', '00000000-0000-4000-8000-000000000000');

-- Electronics subcategories mapping
INSERT INTO category_id_mapping (frontend_id, database_uuid) VALUES
('phones-tablets', '10000000-0000-4000-8000-000000000001'),
('computers', '10000000-0000-4000-8000-000000000002'),
('audio-video', '10000000-0000-4000-8000-000000000003'),
('gaming', '10000000-0000-4000-8000-000000000004'),
('home-appliances', '10000000-0000-4000-8000-000000000005');

-- Fashion subcategories mapping
INSERT INTO category_id_mapping (frontend_id, database_uuid) VALUES
('mens-fashion', '20000000-0000-4000-8000-000000000001'),
('womens-fashion', '20000000-0000-4000-8000-000000000002'),
('kids-fashion', '20000000-0000-4000-8000-000000000003');

-- Vehicles subcategories mapping
INSERT INTO category_id_mapping (frontend_id, database_uuid) VALUES
('cars', '30000000-0000-4000-8000-000000000001'),
('motorcycles', '30000000-0000-4000-8000-000000000002'),
('auto-parts', '30000000-0000-4000-8000-000000000003');

-- Home & Garden subcategories mapping
INSERT INTO category_id_mapping (frontend_id, database_uuid) VALUES
('furniture', '40000000-0000-4000-8000-000000000001'),
('home-decor', '40000000-0000-4000-8000-000000000002'),
('garden', '40000000-0000-4000-8000-000000000003');

-- =============================================
-- HELPER FUNCTIONS FOR CATEGORY MAPPING
-- =============================================

-- Function to get database UUID from frontend string ID
CREATE OR REPLACE FUNCTION get_category_uuid(frontend_category_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    category_uuid UUID;
BEGIN
    -- Try to find the mapping
    SELECT database_uuid INTO category_uuid
    FROM category_id_mapping
    WHERE frontend_id = frontend_category_id;
    
    -- If not found, try to find by slug in categories table
    IF category_uuid IS NULL THEN
        SELECT id INTO category_uuid
        FROM categories
        WHERE slug = frontend_category_id;
    END IF;
    
    -- If still not found, return the 'general' category UUID
    IF category_uuid IS NULL THEN
        category_uuid := '00000000-0000-4000-8000-000000000000';
    END IF;
    
    RETURN category_uuid;
END;
$$;

-- Function to get frontend string ID from database UUID
CREATE OR REPLACE FUNCTION get_category_frontend_id(category_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    frontend_id TEXT;
BEGIN
    -- Try to find the mapping
    SELECT frontend_id INTO frontend_id
    FROM category_id_mapping
    WHERE database_uuid = category_uuid;
    
    -- If not found, try to get slug from categories table
    IF frontend_id IS NULL THEN
        SELECT slug INTO frontend_id
        FROM categories
        WHERE id = category_uuid;
    END IF;
    
    -- If still not found, return 'general'
    IF frontend_id IS NULL THEN
        frontend_id := 'general';
    END IF;
    
    RETURN frontend_id;
END;
$$;

-- =============================================
-- UPDATE CATEGORIES WITH FRONTEND SLUGS
-- =============================================

-- Update categories table to include the frontend slugs
UPDATE categories SET slug = 'electronics' WHERE id = '00000000-0000-4000-8000-000000000001';
UPDATE categories SET slug = 'fashion' WHERE id = '00000000-0000-4000-8000-000000000002';
UPDATE categories SET slug = 'vehicles' WHERE id = '00000000-0000-4000-8000-000000000003';
UPDATE categories SET slug = 'home-garden' WHERE id = '00000000-0000-4000-8000-000000000004';
UPDATE categories SET slug = 'health-sports' WHERE id = '00000000-0000-4000-8000-000000000005';
UPDATE categories SET slug = 'business' WHERE id = '00000000-0000-4000-8000-000000000006';
UPDATE categories SET slug = 'education' WHERE id = '00000000-0000-4000-8000-000000000007';
UPDATE categories SET slug = 'entertainment' WHERE id = '00000000-0000-4000-8000-000000000008';
UPDATE categories SET slug = 'food' WHERE id = '00000000-0000-4000-8000-000000000009';
UPDATE categories SET slug = 'services' WHERE id = '00000000-0000-4000-8000-000000000010';
UPDATE categories SET slug = 'baby-kids' WHERE id = '00000000-0000-4000-8000-000000000011';
UPDATE categories SET slug = 'beauty-health' WHERE id = '00000000-0000-4000-8000-000000000012';
UPDATE categories SET slug = 'pets-animals' WHERE id = '00000000-0000-4000-8000-000000000013';
UPDATE categories SET slug = 'art-crafts' WHERE id = '00000000-0000-4000-8000-000000000014';
UPDATE categories SET slug = 'tickets-events' WHERE id = '00000000-0000-4000-8000-000000000015';
UPDATE categories SET slug = 'general' WHERE id = '00000000-0000-4000-8000-000000000000';

-- Update subcategories
UPDATE categories SET slug = 'phones-tablets' WHERE id = '10000000-0000-4000-8000-000000000001';
UPDATE categories SET slug = 'computers' WHERE id = '10000000-0000-4000-8000-000000000002';
UPDATE categories SET slug = 'audio-video' WHERE id = '10000000-0000-4000-8000-000000000003';
UPDATE categories SET slug = 'gaming' WHERE id = '10000000-0000-4000-8000-000000000004';
UPDATE categories SET slug = 'home-appliances' WHERE id = '10000000-0000-4000-8000-000000000005';

UPDATE categories SET slug = 'mens-fashion' WHERE id = '20000000-0000-4000-8000-000000000001';
UPDATE categories SET slug = 'womens-fashion' WHERE id = '20000000-0000-4000-8000-000000000002';
UPDATE categories SET slug = 'kids-fashion' WHERE id = '20000000-0000-4000-8000-000000000003';

UPDATE categories SET slug = 'cars' WHERE id = '30000000-0000-4000-8000-000000000001';
UPDATE categories SET slug = 'motorcycles' WHERE id = '30000000-0000-4000-8000-000000000002';
UPDATE categories SET slug = 'auto-parts' WHERE id = '30000000-0000-4000-8000-000000000003';

UPDATE categories SET slug = 'furniture' WHERE id = '40000000-0000-4000-8000-000000000001';
UPDATE categories SET slug = 'home-decor' WHERE id = '40000000-0000-4000-8000-000000000002';
UPDATE categories SET slug = 'garden' WHERE id = '40000000-0000-4000-8000-000000000003';

-- =============================================
-- EXAMPLE USAGE
-- =============================================

-- Example: Convert frontend category ID to database UUID
-- SELECT get_category_uuid('electronics'); -- Returns: 00000000-0000-4000-8000-000000000001

-- Example: Convert database UUID to frontend category ID  
-- SELECT get_category_frontend_id('00000000-0000-4000-8000-000000000001'); -- Returns: electronics

-- Example: Use in listing creation
-- INSERT INTO listings (category_id, ...) VALUES (get_category_uuid('phones-tablets'), ...);

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE category_id_mapping IS 'Maps frontend string category IDs to database UUIDs for compatibility';
COMMENT ON FUNCTION get_category_uuid(TEXT) IS 'Converts frontend category string ID to database UUID';
COMMENT ON FUNCTION get_category_frontend_id(UUID) IS 'Converts database category UUID to frontend string ID';
