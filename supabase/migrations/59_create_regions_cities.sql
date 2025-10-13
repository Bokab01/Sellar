-- =============================================
-- REGIONS & CITIES TABLES
-- =============================================
-- Create dynamic regions and cities for location management
-- Enables multi-country expansion and admin control

-- Create countries table (future-proof for expansion)
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(3) UNIQUE NOT NULL,  -- ISO 3166-1 alpha-2 (GH, NG, KE)
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create regions table
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(country_id, name)
);

-- Create cities table
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(region_id, name)
);

-- Create indexes for efficient querying
CREATE INDEX idx_regions_country ON regions(country_id, is_active, display_order);
CREATE INDEX idx_cities_region ON cities(region_id, is_active, display_order);

-- Insert Ghana
INSERT INTO countries (id, code, name, is_active, display_order) VALUES
('10000000-0000-4000-8000-000000000001', 'GH', 'Ghana', true, 1);

-- Insert Ghana regions
INSERT INTO regions (id, country_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Greater Accra', 1),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Ashanti', 2),
('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Western', 3),
('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Central', 4),
('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Eastern', 5),
('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Volta', 6),
('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Northern', 7),
('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Upper East', 8),
('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'Upper West', 9),
('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'Western North', 10),
('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'Ahafo', 11),
('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'Bono', 12),
('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'Bono East', 13),
('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'Oti', 14),
('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000001', 'North East', 15),
('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000001', 'Savannah', 16);

-- Insert cities for Greater Accra
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000001', 'Accra', 1),
('20000000-0000-4000-8000-000000000001', 'Tema', 2),
('20000000-0000-4000-8000-000000000001', 'Kasoa', 3),
('20000000-0000-4000-8000-000000000001', 'Madina', 4),
('20000000-0000-4000-8000-000000000001', 'Adenta', 5),
('20000000-0000-4000-8000-000000000001', 'Teshie', 6),
('20000000-0000-4000-8000-000000000001', 'Nungua', 7),
('20000000-0000-4000-8000-000000000001', 'Dansoman', 8),
('20000000-0000-4000-8000-000000000001', 'Achimota', 9),
('20000000-0000-4000-8000-000000000001', 'East Legon', 10),
('20000000-0000-4000-8000-000000000001', 'Kokomlemle', 11),
('20000000-0000-4000-8000-000000000001', 'Labadi', 12),
('20000000-0000-4000-8000-000000000001', 'Osu', 13),
('20000000-0000-4000-8000-000000000001', 'Cantonments', 14),
('20000000-0000-4000-8000-000000000001', 'Airport Residential', 15);

-- Insert cities for Ashanti
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000002', 'Kumasi', 1),
('20000000-0000-4000-8000-000000000002', 'Obuasi', 2),
('20000000-0000-4000-8000-000000000002', 'Ejisu', 3),
('20000000-0000-4000-8000-000000000002', 'Mampong', 4),
('20000000-0000-4000-8000-000000000002', 'Konongo', 5),
('20000000-0000-4000-8000-000000000002', 'Bekwai', 6),
('20000000-0000-4000-8000-000000000002', 'Offinso', 7),
('20000000-0000-4000-8000-000000000002', 'Agogo', 8),
('20000000-0000-4000-8000-000000000002', 'Ejura', 9),
('20000000-0000-4000-8000-000000000002', 'Asante Mampong', 10),
('20000000-0000-4000-8000-000000000002', 'Juaso', 11),
('20000000-0000-4000-8000-000000000002', 'New Edubiase', 12),
('20000000-0000-4000-8000-000000000002', 'Adansi Fomena', 13);

-- Insert cities for Western
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000003', 'Sekondi-Takoradi', 1),
('20000000-0000-4000-8000-000000000003', 'Tarkwa', 2),
('20000000-0000-4000-8000-000000000003', 'Axim', 3),
('20000000-0000-4000-8000-000000000003', 'Half Assini', 4),
('20000000-0000-4000-8000-000000000003', 'Prestea', 5),
('20000000-0000-4000-8000-000000000003', 'Bogoso', 6);

-- Insert cities for Central
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000004', 'Cape Coast', 1),
('20000000-0000-4000-8000-000000000004', 'Elmina', 2),
('20000000-0000-4000-8000-000000000004', 'Winneba', 3),
('20000000-0000-4000-8000-000000000004', 'Kasoa', 4),
('20000000-0000-4000-8000-000000000004', 'Swedru', 5),
('20000000-0000-4000-8000-000000000004', 'Saltpond', 6);

-- Insert cities for Eastern
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000005', 'Koforidua', 1),
('20000000-0000-4000-8000-000000000005', 'Akosombo', 2),
('20000000-0000-4000-8000-000000000005', 'Nkawkaw', 3),
('20000000-0000-4000-8000-000000000005', 'Akim Oda', 4),
('20000000-0000-4000-8000-000000000005', 'Mpraeso', 5),
('20000000-0000-4000-8000-000000000005', 'Begoro', 6);

-- Insert cities for Volta
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000006', 'Ho', 1),
('20000000-0000-4000-8000-000000000006', 'Hohoe', 2),
('20000000-0000-4000-8000-000000000006', 'Keta', 3),
('20000000-0000-4000-8000-000000000006', 'Aflao', 4),
('20000000-0000-4000-8000-000000000006', 'Denu', 5),
('20000000-0000-4000-8000-000000000006', 'Kpando', 6);

-- Insert cities for Northern
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000007', 'Tamale', 1),
('20000000-0000-4000-8000-000000000007', 'Yendi', 2),
('20000000-0000-4000-8000-000000000007', 'Savelugu', 3),
('20000000-0000-4000-8000-000000000007', 'Tolon', 4),
('20000000-0000-4000-8000-000000000007', 'Gushegu', 5);

-- Insert cities for Upper East
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000008', 'Bolgatanga', 1),
('20000000-0000-4000-8000-000000000008', 'Navrongo', 2),
('20000000-0000-4000-8000-000000000008', 'Bawku', 3),
('20000000-0000-4000-8000-000000000008', 'Paga', 4);

-- Insert cities for Upper West
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000009', 'Wa', 1),
('20000000-0000-4000-8000-000000000009', 'Lawra', 2),
('20000000-0000-4000-8000-000000000009', 'Jirapa', 3),
('20000000-0000-4000-8000-000000000009', 'Tumu', 4);

-- Insert cities for Western North
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000010', 'Sefwi Wiawso', 1),
('20000000-0000-4000-8000-000000000010', 'Bibiani', 2),
('20000000-0000-4000-8000-000000000010', 'Juaboso', 3),
('20000000-0000-4000-8000-000000000010', 'Bodi', 4),
('20000000-0000-4000-8000-000000000010', 'Awaso', 5);

-- Insert cities for Ahafo
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000011', 'Goaso', 1),
('20000000-0000-4000-8000-000000000011', 'Bechem', 2),
('20000000-0000-4000-8000-000000000011', 'Hwidiem', 3),
('20000000-0000-4000-8000-000000000011', 'Kenyasi', 4),
('20000000-0000-4000-8000-000000000011', 'Mim', 5);

-- Insert cities for Bono
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000012', 'Sunyani', 1),
('20000000-0000-4000-8000-000000000012', 'Berekum', 2),
('20000000-0000-4000-8000-000000000012', 'Dormaa Ahenkro', 3),
('20000000-0000-4000-8000-000000000012', 'Wenchi', 4),
('20000000-0000-4000-8000-000000000012', 'Jaman North', 5);

-- Insert cities for Bono East
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000013', 'Techiman', 1),
('20000000-0000-4000-8000-000000000013', 'Atebubu', 2),
('20000000-0000-4000-8000-000000000013', 'Nkoranza', 3),
('20000000-0000-4000-8000-000000000013', 'Kintampo', 4),
('20000000-0000-4000-8000-000000000013', 'Prang', 5);

-- Insert cities for Oti
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000014', 'Dambai', 1),
('20000000-0000-4000-8000-000000000014', 'Kete Krachi', 2),
('20000000-0000-4000-8000-000000000014', 'Nkwanta', 3),
('20000000-0000-4000-8000-000000000014', 'Krachi East', 4),
('20000000-0000-4000-8000-000000000014', 'Krachi West', 5);

-- Insert cities for North East
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000015', 'Nalerigu', 1),
('20000000-0000-4000-8000-000000000015', 'Gambaga', 2),
('20000000-0000-4000-8000-000000000015', 'Walewale', 3),
('20000000-0000-4000-8000-000000000015', 'East Mamprusi', 4),
('20000000-0000-4000-8000-000000000015', 'West Mamprusi', 5);

-- Insert cities for Savannah
INSERT INTO cities (region_id, name, display_order) VALUES
('20000000-0000-4000-8000-000000000016', 'Damongo', 1),
('20000000-0000-4000-8000-000000000016', 'Bole', 2),
('20000000-0000-4000-8000-000000000016', 'Sawla', 3),
('20000000-0000-4000-8000-000000000016', 'Tuna', 4),
('20000000-0000-4000-8000-000000000016', 'West Gonja', 5);

-- Create triggers for auto-update timestamps
CREATE OR REPLACE FUNCTION update_countries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_regions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_countries_updated_at();

CREATE TRIGGER trigger_update_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION update_regions_updated_at();

CREATE TRIGGER trigger_update_cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION update_cities_updated_at();

-- Add RLS policies
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Allow all users to read active locations
CREATE POLICY "Allow all users to read active countries"
  ON countries
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow all users to read active regions"
  ON regions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow all users to read active cities"
  ON cities
  FOR SELECT
  USING (is_active = true);

-- Note: Admin modifications will be handled via service role key

-- Add comments
COMMENT ON TABLE countries IS 'Countries for multi-country expansion. Managed by admin dashboard.';
COMMENT ON TABLE regions IS 'Regions within countries. Managed by admin dashboard.';
COMMENT ON TABLE cities IS 'Cities within regions. Managed by admin dashboard.';

-- Create view for easy querying
CREATE OR REPLACE VIEW locations_hierarchy AS
SELECT 
  c.id as city_id,
  c.name as city_name,
  c.display_order as city_order,
  r.id as region_id,
  r.name as region_name,
  r.display_order as region_order,
  co.id as country_id,
  co.code as country_code,
  co.name as country_name
FROM cities c
JOIN regions r ON c.region_id = r.id
JOIN countries co ON r.country_id = co.id
WHERE c.is_active = true 
  AND r.is_active = true 
  AND co.is_active = true
ORDER BY co.display_order, r.display_order, c.display_order;

COMMENT ON VIEW locations_hierarchy IS 'Complete location hierarchy for easy querying';

