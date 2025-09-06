-- Add missing columns to listings table for enhanced functionality

-- Add category_attributes column for category-specific attributes
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS category_attributes JSONB DEFAULT '{}'::jsonb;

-- Add SEO-related columns
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS seo_title TEXT;

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN listings.category_attributes IS 'Category-specific attributes stored as key-value pairs';
COMMENT ON COLUMN listings.seo_title IS 'SEO-optimized title for search engines';
COMMENT ON COLUMN listings.keywords IS 'Array of keywords extracted from title and description';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_listings_category_attributes 
ON listings USING GIN (category_attributes);

CREATE INDEX IF NOT EXISTS idx_listings_keywords 
ON listings USING GIN (keywords);

CREATE INDEX IF NOT EXISTS idx_listings_seo_title 
ON listings (seo_title);

-- Update existing listings to have empty category_attributes if NULL
UPDATE listings 
SET category_attributes = '{}'::jsonb 
WHERE category_attributes IS NULL;
