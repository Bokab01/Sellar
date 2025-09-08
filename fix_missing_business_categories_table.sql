-- =============================================
-- FIX: Add missing business_categories table
-- =============================================

-- Create business_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Information
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES business_categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_categories_parent_id ON business_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_business_categories_slug ON business_categories(slug);
CREATE INDEX IF NOT EXISTS idx_business_categories_is_active ON business_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_business_categories_sort_order ON business_categories(sort_order);

-- Add RLS policies
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active business categories
CREATE POLICY "Anyone can view active business categories" ON business_categories
    FOR SELECT USING (is_active = true);

-- Only authenticated users can insert/update/delete (for admin purposes)
CREATE POLICY "Authenticated users can manage business categories" ON business_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_business_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_categories_updated_at_trigger
    BEFORE UPDATE ON business_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_business_categories_updated_at();

-- Insert default business categories
INSERT INTO business_categories (name, slug, description, icon, sort_order) VALUES
    ('Technology & IT', 'technology-it', 'Software, hardware, and IT services', 'laptop', 1),
    ('Healthcare & Medical', 'healthcare-medical', 'Medical services, healthcare providers', 'heart', 2),
    ('Legal Services', 'legal-services', 'Lawyers, legal consultation, legal advice', 'scale', 3),
    ('Financial Services', 'financial-services', 'Banking, accounting, financial consulting', 'dollar-sign', 4),
    ('Real Estate', 'real-estate', 'Property sales, rentals, real estate services', 'home', 5),
    ('Education & Training', 'education-training', 'Schools, tutoring, professional training', 'graduation-cap', 6),
    ('Consulting', 'consulting', 'Business consulting, management consulting', 'users', 7),
    ('Marketing & Advertising', 'marketing-advertising', 'Digital marketing, advertising agencies', 'megaphone', 8),
    ('Construction & Renovation', 'construction-renovation', 'Building, renovation, construction services', 'hammer', 9),
    ('Automotive Services', 'automotive-services', 'Car repair, maintenance, automotive services', 'car', 10),
    ('Beauty & Wellness', 'beauty-wellness', 'Salons, spas, wellness services', 'sparkles', 11),
    ('Food & Catering', 'food-catering', 'Restaurants, catering, food services', 'utensils', 12),
    ('Transportation & Logistics', 'transportation-logistics', 'Delivery, shipping, transportation services', 'truck', 13),
    ('Entertainment & Events', 'entertainment-events', 'Event planning, entertainment services', 'music', 14),
    ('Home Services', 'home-services', 'Cleaning, maintenance, home improvement', 'wrench', 15),
    ('Professional Services', 'professional-services', 'Various professional services', 'briefcase', 16),
    ('Creative Services', 'creative-services', 'Design, photography, creative work', 'palette', 17),
    ('Security Services', 'security-services', 'Security, surveillance, protection services', 'shield', 18),
    ('Environmental Services', 'environmental-services', 'Environmental consulting, green services', 'leaf', 19),
    ('Other Business Services', 'other-business-services', 'Miscellaneous business services', 'more-horizontal', 20)
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'business_categories table created successfully with default data!' as status;
