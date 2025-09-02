-- =============================================
-- PROFILE MANAGEMENT SYSTEM MIGRATION
-- Enhanced profile editing with business integration
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- BUSINESS CATEGORIES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    name TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
    slug TEXT UNIQUE NOT NULL,
    description TEXT CHECK (char_length(description) <= 500),
    icon TEXT DEFAULT 'building',
    
    -- Hierarchy
    parent_id UUID REFERENCES business_categories(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PROFILE ACTIVITY LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS profile_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Activity Details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'profile_updated', 'business_profile_created', 'business_profile_updated',
        'avatar_changed', 'verification_submitted', 'business_verified'
    )),
    
    -- Activity Data
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    ip_address TEXT,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- BUSINESS HOURS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- Weekly Schedule (JSON structure for flexibility)
    schedule JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "17:00", "is_open": true},
        "tuesday": {"open": "09:00", "close": "17:00", "is_open": true},
        "wednesday": {"open": "09:00", "close": "17:00", "is_open": true},
        "thursday": {"open": "09:00", "close": "17:00", "is_open": true},
        "friday": {"open": "09:00", "close": "17:00", "is_open": true},
        "saturday": {"open": "09:00", "close": "15:00", "is_open": true},
        "sunday": {"open": "10:00", "close": "14:00", "is_open": false}
    }'::jsonb,
    
    -- Special Hours
    special_hours JSONB DEFAULT '[]'::jsonb, -- For holidays, special events
    
    -- Timezone
    timezone TEXT DEFAULT 'Africa/Accra',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SOCIAL MEDIA LINKS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS social_media_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Platform Details
    platform TEXT NOT NULL CHECK (platform IN (
        'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 
        'tiktok', 'whatsapp', 'telegram', 'website', 'other'
    )),
    
    -- Link Details
    url TEXT NOT NULL CHECK (char_length(url) >= 5 AND char_length(url) <= 500),
    display_name TEXT CHECK (char_length(display_name) <= 100),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint per platform per user
    UNIQUE(user_id, platform)
);

-- =============================================
-- ENHANCED PROFILE COLUMNS
-- =============================================

-- Add additional profile fields for enhanced profile management
DO $$
BEGIN
    -- Professional Information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'professional_title') THEN
        ALTER TABLE profiles ADD COLUMN professional_title TEXT CHECK (char_length(professional_title) <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'years_of_experience') THEN
        ALTER TABLE profiles ADD COLUMN years_of_experience INTEGER CHECK (years_of_experience >= 0 AND years_of_experience <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'specializations') THEN
        ALTER TABLE profiles ADD COLUMN specializations TEXT[] DEFAULT '{}';
    END IF;
    
    -- Business Profile Enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_category_id') THEN
        ALTER TABLE profiles ADD COLUMN business_category_id UUID REFERENCES business_categories(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_description') THEN
        ALTER TABLE profiles ADD COLUMN business_description TEXT CHECK (char_length(business_description) <= 2000);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_established_year') THEN
        ALTER TABLE profiles ADD COLUMN business_established_year INTEGER CHECK (business_established_year >= 1900 AND business_established_year <= EXTRACT(YEAR FROM NOW()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_employee_count') THEN
        ALTER TABLE profiles ADD COLUMN business_employee_count TEXT CHECK (business_employee_count IN ('1', '2-5', '6-10', '11-25', '26-50', '51-100', '100+'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_services') THEN
        ALTER TABLE profiles ADD COLUMN business_services TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_coverage_areas') THEN
        ALTER TABLE profiles ADD COLUMN business_coverage_areas TEXT[] DEFAULT '{}';
    END IF;
    
    -- Contact Preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_contact_method') THEN
        ALTER TABLE profiles ADD COLUMN preferred_contact_method TEXT DEFAULT 'app' CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'response_time_expectation') THEN
        ALTER TABLE profiles ADD COLUMN response_time_expectation TEXT DEFAULT 'within_hours' CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week'));
    END IF;
    
    -- Privacy Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_visibility') THEN
        ALTER TABLE profiles ADD COLUMN phone_visibility TEXT DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_visibility') THEN
        ALTER TABLE profiles ADD COLUMN email_visibility TEXT DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_online_status') THEN
        ALTER TABLE profiles ADD COLUMN show_online_status BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_last_seen') THEN
        ALTER TABLE profiles ADD COLUMN show_last_seen BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Profile Completion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_completion_percentage') THEN
        ALTER TABLE profiles ADD COLUMN profile_completion_percentage INTEGER DEFAULT 0 CHECK (profile_completion_percentage >= 0 AND profile_completion_percentage <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_profile_update') THEN
        ALTER TABLE profiles ADD COLUMN last_profile_update TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Verification Level (if not already exists from core schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
        ALTER TABLE profiles ADD COLUMN verification_level TEXT DEFAULT 'none' CHECK (verification_level IN ('none', 'phone', 'email', 'identity', 'business'));
    END IF;
    
    -- Account Status (if not already exists from core schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_suspended') THEN
        ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Business Display Preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_business_name') THEN
        ALTER TABLE profiles ADD COLUMN display_business_name BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_name_priority') THEN
        ALTER TABLE profiles ADD COLUMN business_name_priority TEXT DEFAULT 'secondary' CHECK (business_name_priority IN ('primary', 'secondary', 'hidden'));
    END IF;
END $$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Business categories indexes
CREATE INDEX IF NOT EXISTS idx_business_categories_parent_id ON business_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_business_categories_slug ON business_categories(slug);
CREATE INDEX IF NOT EXISTS idx_business_categories_is_active ON business_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_business_categories_sort_order ON business_categories(sort_order);

-- Profile activity log indexes
CREATE INDEX IF NOT EXISTS idx_profile_activity_log_user_id ON profile_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_activity_log_activity_type ON profile_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_profile_activity_log_created_at ON profile_activity_log(created_at DESC);

-- Business hours indexes
CREATE INDEX IF NOT EXISTS idx_business_hours_user_id ON business_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_is_active ON business_hours(is_active);

-- Social media links indexes
CREATE INDEX IF NOT EXISTS idx_social_media_links_user_id ON social_media_links(user_id);
CREATE INDEX IF NOT EXISTS idx_social_media_links_platform ON social_media_links(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_links_is_active ON social_media_links(is_active);

-- Enhanced profile indexes
CREATE INDEX IF NOT EXISTS idx_profiles_business_category_id ON profiles(business_category_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_business ON profiles(is_business);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_level ON profiles(verification_level);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completion ON profiles(profile_completion_percentage);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_links ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - BUSINESS CATEGORIES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active business categories" ON business_categories;

-- Anyone can view active business categories
CREATE POLICY "Anyone can view active business categories" ON business_categories
    FOR SELECT USING (is_active = true);

-- =============================================
-- RLS POLICIES - PROFILE ACTIVITY LOG
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own activity log" ON profile_activity_log;
DROP POLICY IF EXISTS "System can insert activity logs" ON profile_activity_log;

-- Users can view their own activity log
CREATE POLICY "Users can view own activity log" ON profile_activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert activity logs
CREATE POLICY "System can insert activity logs" ON profile_activity_log
    FOR INSERT WITH CHECK (true);

-- =============================================
-- RLS POLICIES - BUSINESS HOURS
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view business hours" ON business_hours;
DROP POLICY IF EXISTS "Users can manage own business hours" ON business_hours;

-- Anyone can view business hours for active businesses
CREATE POLICY "Anyone can view business hours" ON business_hours
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = business_hours.user_id 
            AND profiles.is_business = true 
            AND profiles.is_active = true
        )
    );

-- Users can manage their own business hours
CREATE POLICY "Users can manage own business hours" ON business_hours
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - SOCIAL MEDIA LINKS
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view social media links" ON social_media_links;
DROP POLICY IF EXISTS "Users can manage own social media links" ON social_media_links;

-- Anyone can view active social media links
CREATE POLICY "Anyone can view social media links" ON social_media_links
    FOR SELECT USING (is_active = true);

-- Users can manage their own social media links
CREATE POLICY "Users can manage own social media links" ON social_media_links
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables (drop existing first for idempotency)
DROP TRIGGER IF EXISTS update_business_categories_updated_at ON business_categories;
CREATE TRIGGER update_business_categories_updated_at
    BEFORE UPDATE ON business_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_hours_updated_at ON business_hours;
CREATE TRIGGER update_business_hours_updated_at
    BEFORE UPDATE ON business_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_social_media_links_updated_at ON social_media_links;
CREATE TRIGGER update_social_media_links_updated_at
    BEFORE UPDATE ON social_media_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PROFILE MANAGEMENT FUNCTIONS
-- =============================================

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    completion_score INTEGER := 0;
    total_fields INTEGER := 20; -- Total weighted fields
    profile_record RECORD;
BEGIN
    -- Get profile data
    SELECT * INTO profile_record FROM profiles WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Basic fields (5 points each)
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
        completion_score := completion_score + 5;
    END IF;
    
    IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN
        completion_score := completion_score + 5;
    END IF;
    
    IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
        completion_score := completion_score + 5;
    END IF;
    
    IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
        completion_score := completion_score + 5;
    END IF;
    
    IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
        completion_score := completion_score + 5;
    END IF;
    
    -- Avatar (10 points)
    IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
        completion_score := completion_score + 10;
    END IF;
    
    -- Verification (15 points)
    IF profile_record.is_verified = true THEN
        completion_score := completion_score + 15;
    END IF;
    
    -- Business profile bonus (if applicable)
    IF profile_record.is_business = true THEN
        -- Business name (10 points)
        IF profile_record.business_name IS NOT NULL AND profile_record.business_name != '' THEN
            completion_score := completion_score + 10;
        END IF;
        
        -- Business description (10 points)
        IF profile_record.business_description IS NOT NULL AND profile_record.business_description != '' THEN
            completion_score := completion_score + 10;
        END IF;
        
        -- Business category (5 points)
        IF profile_record.business_category_id IS NOT NULL THEN
            completion_score := completion_score + 5;
        END IF;
        
        -- Business contact info (10 points)
        IF (profile_record.business_phone IS NOT NULL AND profile_record.business_phone != '') OR 
           (profile_record.business_email IS NOT NULL AND profile_record.business_email != '') THEN
            completion_score := completion_score + 10;
        END IF;
        
        -- Adjust total for business profiles
        total_fields := 30;
    END IF;
    
    -- Calculate percentage
    RETURN LEAST(100, (completion_score * 100) / total_fields);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log profile activity
CREATE OR REPLACE FUNCTION log_profile_activity(
    user_uuid UUID,
    activity_type_param TEXT,
    old_values_param JSONB DEFAULT '{}'::jsonb,
    new_values_param JSONB DEFAULT '{}'::jsonb,
    metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO profile_activity_log (
        user_id,
        activity_type,
        old_values,
        new_values,
        metadata
    ) VALUES (
        user_uuid,
        activity_type_param,
        old_values_param,
        new_values_param,
        metadata_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update profile completion on profile changes
CREATE OR REPLACE FUNCTION update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update completion percentage
    NEW.profile_completion_percentage := calculate_profile_completion(NEW.id);
    NEW.last_profile_update := now();
    
    -- Log the activity if this is an update
    IF TG_OP = 'UPDATE' THEN
        PERFORM log_profile_activity(
            NEW.id,
            'profile_updated',
            to_jsonb(OLD),
            to_jsonb(NEW),
            jsonb_build_object('trigger', 'profile_update')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile completion updates
DROP TRIGGER IF EXISTS update_profile_completion_trigger ON profiles;
CREATE TRIGGER update_profile_completion_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completion();

-- =============================================
-- SEED DATA - BUSINESS CATEGORIES
-- =============================================

INSERT INTO business_categories (name, slug, description, icon, sort_order) VALUES
-- Main Categories
('Retail & Commerce', 'retail-commerce', 'Shops, stores, and retail businesses', 'shopping-bag', 1),
('Food & Beverage', 'food-beverage', 'Restaurants, cafes, and food services', 'utensils', 2),
('Professional Services', 'professional-services', 'Legal, accounting, consulting services', 'briefcase', 3),
('Health & Wellness', 'health-wellness', 'Healthcare, fitness, and wellness services', 'heart', 4),
('Technology & IT', 'technology-it', 'Software, hardware, and IT services', 'laptop', 5),
('Construction & Real Estate', 'construction-real-estate', 'Building, renovation, and property services', 'home', 6),
('Transportation & Logistics', 'transportation-logistics', 'Delivery, shipping, and transport services', 'truck', 7),
('Education & Training', 'education-training', 'Schools, tutoring, and training services', 'graduation-cap', 8),
('Beauty & Personal Care', 'beauty-personal-care', 'Salons, spas, and personal care services', 'scissors', 9),
('Entertainment & Events', 'entertainment-events', 'Event planning, entertainment services', 'calendar', 10),
('Agriculture & Farming', 'agriculture-farming', 'Farming, livestock, and agricultural services', 'tractor', 11),
('Manufacturing & Production', 'manufacturing-production', 'Manufacturing and production businesses', 'factory', 12),
('Financial Services', 'financial-services', 'Banking, insurance, and financial services', 'dollar-sign', 13),
('Other Services', 'other-services', 'Other business services not listed above', 'more-horizontal', 99)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify all tables were created successfully
SELECT 
    'business_categories' as table_name,
    COUNT(*) as row_count
FROM business_categories
UNION ALL
SELECT 
    'profile_activity_log' as table_name,
    COUNT(*) as row_count
FROM profile_activity_log
UNION ALL
SELECT 
    'business_hours' as table_name,
    COUNT(*) as row_count
FROM business_hours
UNION ALL
SELECT 
    'social_media_links' as table_name,
    COUNT(*) as row_count
FROM social_media_links;

-- Show created indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE tablename IN ('business_categories', 'profile_activity_log', 'business_hours', 'social_media_links')
ORDER BY tablename, indexname;
