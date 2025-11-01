-- =============================================
-- PHYSICAL SHOP FEATURE - PHASE 1: FOUNDATION
-- Migration: Add physical shop infrastructure
-- Date: 2025-02-01
-- =============================================

-- =============================================
-- PART 1: PROFILE EXTENSIONS FOR PHYSICAL SHOPS
-- =============================================

-- Add physical shop fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS business_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS business_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS business_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS business_map_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_directions_note TEXT,
ADD COLUMN IF NOT EXISTS accepts_pickup BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepts_walkin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_physical_shop BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN profiles.business_address IS 'Primary street address of physical shop';
COMMENT ON COLUMN profiles.business_address_line_2 IS 'Additional address info (suite, floor, etc.)';
COMMENT ON COLUMN profiles.business_city IS 'City where shop is located';
COMMENT ON COLUMN profiles.business_state IS 'State/Region (e.g., Greater Accra)';
COMMENT ON COLUMN profiles.business_postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN profiles.business_latitude IS 'Geographic latitude for map display';
COMMENT ON COLUMN profiles.business_longitude IS 'Geographic longitude for map display';
COMMENT ON COLUMN profiles.business_map_verified IS 'Whether coordinates have been verified';
COMMENT ON COLUMN profiles.business_directions_note IS 'Landmark-based directions (Ghana-specific)';
COMMENT ON COLUMN profiles.accepts_pickup IS 'Whether seller accepts in-person pickup';
COMMENT ON COLUMN profiles.accepts_walkin IS 'Whether shop accepts walk-in customers';
COMMENT ON COLUMN profiles.has_physical_shop IS 'Flag indicating seller has configured physical shop';

-- Create spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_location 
ON profiles (business_latitude, business_longitude) 
WHERE business_latitude IS NOT NULL 
  AND business_longitude IS NOT NULL 
  AND has_physical_shop = true;

-- Create index for pickup-enabled sellers
CREATE INDEX IF NOT EXISTS idx_profiles_accepts_pickup 
ON profiles (accepts_pickup) 
WHERE accepts_pickup = true;

-- =============================================
-- PART 2: BUSINESS PHOTOS TABLE
-- =============================================

-- Create table for shop photos (separate from avatar)
CREATE TABLE IF NOT EXISTS business_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(50) DEFAULT 'general' CHECK (photo_type IN ('storefront', 'interior', 'product_display', 'team', 'general')),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE business_photos IS 'Physical shop photos for Pro sellers';
COMMENT ON COLUMN business_photos.photo_type IS 'Type of photo: storefront, interior, product_display, team, general';
COMMENT ON COLUMN business_photos.is_primary IS 'Primary photo shown first in gallery';
COMMENT ON COLUMN business_photos.display_order IS 'Order for displaying photos (lower = first)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_photos_user_id 
ON business_photos(user_id);

CREATE INDEX IF NOT EXISTS idx_business_photos_primary 
ON business_photos(user_id, is_primary) 
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_business_photos_display_order 
ON business_photos(user_id, display_order);

-- Ensure only one primary photo per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_photos_one_primary_per_user 
ON business_photos(user_id) 
WHERE is_primary = true;

-- =============================================
-- PART 3: LISTING ENHANCEMENTS FOR PICKUP
-- =============================================

-- Add pickup-related columns to listings
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pickup_location_override TEXT,
ADD COLUMN IF NOT EXISTS pickup_preparation_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;

-- Add comments
COMMENT ON COLUMN listings.pickup_available IS 'Whether this listing offers pickup option';
COMMENT ON COLUMN listings.pickup_location_override IS 'Custom pickup location if different from shop address';
COMMENT ON COLUMN listings.pickup_preparation_time IS 'Estimated minutes until item ready for pickup';
COMMENT ON COLUMN listings.pickup_instructions IS 'Special instructions for pickup (e.g., "Call on arrival")';

-- Create index for pickup-enabled listings
CREATE INDEX IF NOT EXISTS idx_listings_pickup_available 
ON listings (pickup_available, status) 
WHERE pickup_available = true AND status = 'active';

-- =============================================
-- PART 4: RLS POLICIES FOR BUSINESS PHOTOS
-- =============================================

-- Enable RLS on business_photos
ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view business photos
CREATE POLICY "Anyone can view business photos"
ON business_photos FOR SELECT
USING (true);

-- Policy: Users can insert their own business photos
CREATE POLICY "Users can insert own business photos"
ON business_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own business photos
CREATE POLICY "Users can update own business photos"
ON business_photos FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own business photos
CREATE POLICY "Users can delete own business photos"
ON business_photos FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- PART 5: HELPER FUNCTIONS
-- =============================================

-- Function to calculate distance between two coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    earth_radius CONSTANT DECIMAL := 6371; -- Earth's radius in km
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Handle NULL inputs
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance IS 'Calculate distance in kilometers between two lat/long coordinates using Haversine formula';

-- Function to find shops near a location
CREATE OR REPLACE FUNCTION find_nearby_shops(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km DECIMAL DEFAULT 10,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    user_id UUID,
    business_name VARCHAR,
    business_address TEXT,
    business_latitude DECIMAL,
    business_longitude DECIMAL,
    distance_km DECIMAL,
    accepts_pickup BOOLEAN,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.business_name,
        p.business_address,
        p.business_latitude,
        p.business_longitude,
        calculate_distance(p_latitude, p_longitude, p.business_latitude, p.business_longitude) AS distance_km,
        p.accepts_pickup,
        p.is_verified
    FROM profiles p
    WHERE p.has_physical_shop = true
      AND p.business_latitude IS NOT NULL
      AND p.business_longitude IS NOT NULL
      AND calculate_distance(p_latitude, p_longitude, p.business_latitude, p.business_longitude) <= p_radius_km
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_nearby_shops IS 'Find physical shops within specified radius of a location';

-- Function to check if shop is currently open
CREATE OR REPLACE FUNCTION is_shop_open(
    p_user_id UUID,
    p_check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_schedule JSONB;
    v_day_of_week INTEGER;
    v_day_name TEXT;
    v_day_schedule JSONB;
    v_is_open BOOLEAN;
    v_open_time TIME;
    v_close_time TIME;
    v_current_time TIME;
BEGIN
    -- Get business hours schedule
    SELECT schedule INTO v_schedule
    FROM business_hours
    WHERE user_id = p_user_id AND is_active = true;

    -- If no schedule found, return false
    IF v_schedule IS NULL THEN
        RETURN false;
    END IF;

    -- Get day of week (0=Sunday, 1=Monday, etc.)
    v_day_of_week := EXTRACT(DOW FROM p_check_time);
    
    -- Map to day name
    v_day_name := CASE v_day_of_week
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END;

    -- Get schedule for this day
    v_day_schedule := v_schedule->v_day_name;

    -- If no schedule for this day, shop is closed
    IF v_day_schedule IS NULL THEN
        RETURN false;
    END IF;

    -- Check if shop is open today
    v_is_open := (v_day_schedule->>'is_open')::BOOLEAN;
    IF NOT v_is_open THEN
        RETURN false;
    END IF;

    -- Get open/close times
    v_open_time := (v_day_schedule->>'open')::TIME;
    v_close_time := (v_day_schedule->>'close')::TIME;
    v_current_time := p_check_time::TIME;

    -- Check if current time is within business hours
    RETURN v_current_time >= v_open_time AND v_current_time <= v_close_time;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_shop_open IS 'Check if a shop is currently open based on business hours';

-- =============================================
-- PART 6: VIEWS FOR ENHANCED QUERIES
-- =============================================

-- View: Shops with location and distance calculation ready
CREATE OR REPLACE VIEW physical_shops AS
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.business_name,
    p.business_type,
    p.business_description,
    p.business_address,
    p.business_address_line_2,
    p.business_city,
    p.business_state,
    p.business_postal_code,
    p.business_latitude,
    p.business_longitude,
    p.business_directions_note,
    p.accepts_pickup,
    p.accepts_walkin,
    p.business_phone,
    p.business_email,
    p.business_website,
    p.is_verified,
    p.rating,
    p.total_sales,
    p.total_reviews,
    p.avatar_url,
    (SELECT COUNT(*) FROM business_photos WHERE user_id = p.id) as photo_count,
    (SELECT photo_url FROM business_photos WHERE user_id = p.id AND is_primary = true LIMIT 1) as primary_photo_url
FROM profiles p
WHERE p.has_physical_shop = true
  AND p.business_latitude IS NOT NULL
  AND p.business_longitude IS NOT NULL;

COMMENT ON VIEW physical_shops IS 'All sellers with configured physical shops';

-- =============================================
-- PART 7: TRIGGERS
-- =============================================

-- Trigger: Update updated_at on business_photos
CREATE OR REPLACE FUNCTION update_business_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_photos_updated_at
    BEFORE UPDATE ON business_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_business_photos_updated_at();

-- Trigger: Auto-update has_physical_shop flag when address/coordinates are set
CREATE OR REPLACE FUNCTION update_has_physical_shop_flag()
RETURNS TRIGGER AS $$
BEGIN
    -- Set has_physical_shop to true if all required fields are present
    IF NEW.business_address IS NOT NULL 
       AND NEW.business_latitude IS NOT NULL 
       AND NEW.business_longitude IS NOT NULL THEN
        NEW.has_physical_shop := true;
    ELSE
        NEW.has_physical_shop := false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_has_physical_shop_flag
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_has_physical_shop_flag();

-- =============================================
-- PART 8: VALIDATION CONSTRAINTS
-- =============================================

-- Ensure coordinates are valid ranges
ALTER TABLE profiles 
ADD CONSTRAINT check_latitude_range 
CHECK (business_latitude IS NULL OR (business_latitude >= -90 AND business_latitude <= 90));

ALTER TABLE profiles 
ADD CONSTRAINT check_longitude_range 
CHECK (business_longitude IS NULL OR (business_longitude >= -180 AND business_longitude <= 180));

-- Ensure preparation time is reasonable (max 7 days = 10080 minutes)
ALTER TABLE listings
ADD CONSTRAINT check_pickup_preparation_time
CHECK (pickup_preparation_time IS NULL OR (pickup_preparation_time >= 0 AND pickup_preparation_time <= 10080));

-- Note: Pickup location validation moved to trigger (check constraints cannot use subqueries)
-- Validation logic: pickup_available requires either has_physical_shop OR pickup_location_override
-- This is handled by the validate_pickup_availability() trigger below

-- Trigger function to validate pickup availability
CREATE OR REPLACE FUNCTION validate_pickup_availability()
RETURNS TRIGGER AS $$
DECLARE
    v_has_physical_shop BOOLEAN;
BEGIN
    -- Only validate if pickup is enabled
    IF NEW.pickup_available = true THEN
        -- Check if seller has physical shop
        SELECT has_physical_shop INTO v_has_physical_shop
        FROM profiles
        WHERE id = NEW.user_id;
        
        -- If no physical shop and no override location, reject
        IF (v_has_physical_shop IS NOT TRUE) AND (NEW.pickup_location_override IS NULL OR NEW.pickup_location_override = '') THEN
            RAISE EXCEPTION 'Pickup requires either a physical shop or a pickup location override';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
CREATE TRIGGER trigger_validate_pickup_availability
    BEFORE INSERT OR UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION validate_pickup_availability();

-- =============================================
-- PART 9: GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION calculate_distance TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_shops TO authenticated;
GRANT EXECUTE ON FUNCTION is_shop_open TO authenticated;

-- =============================================
-- PHASE 1 COMPLETE
-- =============================================

-- Migration complete
-- Supabase automatically tracks migrations in schema_migrations table

