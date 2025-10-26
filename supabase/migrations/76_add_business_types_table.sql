-- =============================================
-- ADD BUSINESS TYPES TABLE
-- =============================================
-- Create a centralized table for business types/categories
-- to provide consistent options across the app

-- Create business_types table
CREATE TABLE IF NOT EXISTS business_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name for UI
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active business types
CREATE INDEX IF NOT EXISTS idx_business_types_active ON business_types(is_active, sort_order);

-- Seed initial business types
INSERT INTO business_types (name, slug, description, icon, sort_order, is_active) VALUES
('Retail', 'retail', 'Selling physical goods directly to consumers', 'Store', 1, true),
('Service', 'service', 'Providing services to customers', 'Briefcase', 2, true),
('Manufacturing', 'manufacturing', 'Producing goods from raw materials', 'Factory', 3, true),
('Wholesale', 'wholesale', 'Selling goods in bulk to retailers', 'Package', 4, true),
('E-commerce', 'ecommerce', 'Online retail business', 'ShoppingCart', 5, true),
('Food & Beverage', 'food_beverage', 'Restaurants, cafes, food production', 'UtensilsCrossed', 6, true),
('Technology', 'technology', 'IT services, software development', 'Laptop', 7, true),
('Consulting', 'consulting', 'Professional advisory services', 'Lightbulb', 8, true),
('Construction', 'construction', 'Building and construction services', 'HardHat', 9, true),
('Healthcare', 'healthcare', 'Medical and health services', 'Heart', 10, true),
('Education', 'education', 'Training and educational services', 'GraduationCap', 11, true),
('Real Estate', 'real_estate', 'Property sales and rental services', 'Home', 12, true),
('Transportation', 'transportation', 'Logistics and transport services', 'Truck', 13, true),
('Financial Services', 'financial_services', 'Banking, insurance, investments', 'DollarSign', 14, true),
('Beauty & Wellness', 'beauty_wellness', 'Salon, spa, and wellness services', 'Sparkles', 15, true),
('Agriculture', 'agriculture', 'Farming and agricultural products', 'Sprout', 16, true),
('Entertainment', 'entertainment', 'Event planning, media, recreation', 'Music', 17, true),
('Automotive', 'automotive', 'Car sales, repairs, and services', 'Car', 18, true),
('Fashion', 'fashion', 'Clothing, accessories, and design', 'Shirt', 19, true),
('Other', 'other', 'Other business types', 'MoreHorizontal', 99, true)
ON CONFLICT (slug) DO NOTHING;

-- Add comment
COMMENT ON TABLE business_types IS 'Standardized business type categories for user profiles and listings';

