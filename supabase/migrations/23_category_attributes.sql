-- =============================================
-- CATEGORY ATTRIBUTES SYSTEM
-- =============================================
-- This migration creates a dynamic attributes system where each category
-- can have custom fields that automatically appear when creating/editing listings

-- =============================================
-- CREATE CATEGORY ATTRIBUTES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS category_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Attribute details
  name VARCHAR(100) NOT NULL, -- e.g., "Brand", "Model", "Year"
  slug VARCHAR(100) NOT NULL, -- e.g., "brand", "model", "year"
  label VARCHAR(100) NOT NULL, -- Display label for UI
  placeholder VARCHAR(255), -- Placeholder text for input
  help_text TEXT, -- Optional help text
  
  -- Field type and validation
  field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'select', 'multiselect', 'boolean', 'date', 'range'
  data_type VARCHAR(50) NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'array', 'object'
  
  -- Field options (for select, multiselect, etc.)
  options JSONB, -- Array of options: [{"value": "toyota", "label": "Toyota"}, ...]
  
  -- Validation rules
  is_required BOOLEAN DEFAULT false,
  min_value NUMERIC, -- For number/range fields
  max_value NUMERIC, -- For number/range fields
  min_length INTEGER, -- For text fields
  max_length INTEGER, -- For text fields
  pattern VARCHAR(255), -- Regex pattern for validation
  validation_message VARCHAR(255), -- Custom validation error message
  
  -- UI/UX
  icon VARCHAR(50), -- Icon name for the field
  sort_order INTEGER NOT NULL DEFAULT 0,
  show_in_search BOOLEAN DEFAULT true, -- Show as filter in search
  show_in_card BOOLEAN DEFAULT false, -- Show on listing cards
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_category_attributes_category_id ON category_attributes(category_id);
CREATE INDEX idx_category_attributes_slug ON category_attributes(slug);
CREATE INDEX idx_category_attributes_active ON category_attributes(is_active);
CREATE INDEX idx_category_attributes_search ON category_attributes(show_in_search) WHERE show_in_search = true;

-- Add unique constraint for category_id + slug
CREATE UNIQUE INDEX idx_category_attributes_unique ON category_attributes(category_id, slug) WHERE is_active = true;

-- =============================================
-- UPDATE LISTINGS TABLE TO STORE ATTRIBUTES
-- =============================================

-- Add attributes column to listings table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'attributes'
  ) THEN
    ALTER TABLE listings ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX idx_listings_attributes ON listings USING GIN (attributes);
  END IF;
END $$;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get attributes for a category (including parent categories)
CREATE OR REPLACE FUNCTION get_category_attributes(p_category_id UUID)
RETURNS TABLE (
  id UUID,
  category_id UUID,
  name VARCHAR(100),
  slug VARCHAR(100),
  label VARCHAR(100),
  placeholder VARCHAR(255),
  help_text TEXT,
  field_type VARCHAR(50),
  data_type VARCHAR(50),
  options JSONB,
  is_required BOOLEAN,
  min_value NUMERIC,
  max_value NUMERIC,
  min_length INTEGER,
  max_length INTEGER,
  pattern VARCHAR(255),
  validation_message VARCHAR(255),
  icon VARCHAR(50),
  sort_order INTEGER,
  show_in_search BOOLEAN,
  show_in_card BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Start with the selected category
    SELECT c.id, c.parent_id, 1 as level
    FROM categories c
    WHERE c.id = p_category_id
    
    UNION ALL
    
    -- Get parent categories
    SELECT c.id, c.parent_id, ct.level + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.id = ct.parent_id
  )
  SELECT DISTINCT ON (ca.slug)
    ca.id,
    ca.category_id,
    ca.name,
    ca.slug,
    ca.label,
    ca.placeholder,
    ca.help_text,
    ca.field_type,
    ca.data_type,
    ca.options,
    ca.is_required,
    ca.min_value,
    ca.max_value,
    ca.min_length,
    ca.max_length,
    ca.pattern,
    ca.validation_message,
    ca.icon,
    ca.sort_order,
    ca.show_in_search,
    ca.show_in_card
  FROM category_attributes ca
  INNER JOIN category_tree ct ON ca.category_id = ct.id
  WHERE ca.is_active = true
  ORDER BY ca.slug, ct.level ASC, ca.sort_order ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate listing attributes against category schema
CREATE OR REPLACE FUNCTION validate_listing_attributes()
RETURNS TRIGGER AS $$
DECLARE
  v_attribute RECORD;
  v_value TEXT;
  v_numeric_value NUMERIC;
BEGIN
  -- Get all required attributes for this category
  FOR v_attribute IN 
    SELECT * FROM get_category_attributes(NEW.category_id) WHERE is_required = true
  LOOP
    -- Check if required attribute exists
    IF NOT (NEW.attributes ? v_attribute.slug) THEN
      RAISE EXCEPTION 'Required attribute "%" is missing', v_attribute.label;
    END IF;
    
    -- Validate based on data type
    v_value := NEW.attributes->>v_attribute.slug;
    
    IF v_value IS NULL OR v_value = '' THEN
      RAISE EXCEPTION 'Required attribute "%" cannot be empty', v_attribute.label;
    END IF;
    
    -- Validate number fields
    IF v_attribute.data_type = 'number' THEN
      BEGIN
        v_numeric_value := v_value::NUMERIC;
        
        IF v_attribute.min_value IS NOT NULL AND v_numeric_value < v_attribute.min_value THEN
          RAISE EXCEPTION 'Attribute "%" must be at least %', v_attribute.label, v_attribute.min_value;
        END IF;
        
        IF v_attribute.max_value IS NOT NULL AND v_numeric_value > v_attribute.max_value THEN
          RAISE EXCEPTION 'Attribute "%" must be at most %', v_attribute.label, v_attribute.max_value;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Attribute "%" must be a valid number', v_attribute.label;
      END;
    END IF;
    
    -- Validate string length
    IF v_attribute.data_type = 'string' THEN
      IF v_attribute.min_length IS NOT NULL AND LENGTH(v_value) < v_attribute.min_length THEN
        RAISE EXCEPTION 'Attribute "%" must be at least % characters', v_attribute.label, v_attribute.min_length;
      END IF;
      
      IF v_attribute.max_length IS NOT NULL AND LENGTH(v_value) > v_attribute.max_length THEN
        RAISE EXCEPTION 'Attribute "%" must be at most % characters', v_attribute.label, v_attribute.max_length;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation (optional - can be enabled later)
-- DROP TRIGGER IF EXISTS validate_listing_attributes_trigger ON listings;
-- CREATE TRIGGER validate_listing_attributes_trigger
--   BEFORE INSERT OR UPDATE ON listings
--   FOR EACH ROW
--   EXECUTE FUNCTION validate_listing_attributes();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE category_attributes ENABLE ROW LEVEL SECURITY;

-- Everyone can read active attributes
CREATE POLICY "Anyone can view active category attributes"
  ON category_attributes FOR SELECT
  USING (is_active = true);

-- Note: Admin management of attributes should be done via service role or direct database access
-- For now, attributes are managed through migrations

SELECT '✅ Category attributes system created successfully!' as status;

