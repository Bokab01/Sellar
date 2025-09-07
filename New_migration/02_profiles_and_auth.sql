-- =============================================
-- SELLAR MOBILE APP - PROFILES AND AUTHENTICATION
-- Migration 02: User profiles and authentication system
-- =============================================

-- =============================================
-- PROFILES TABLE
-- =============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    username TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT DEFAULT 'Accra, Greater Accra',
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    
    -- Business Information
    is_business BOOLEAN DEFAULT false,
    business_name TEXT,
    business_type TEXT,
    business_registration_number TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_email TEXT,
    business_website TEXT,
    business_description TEXT,
    business_established_year INTEGER,
    business_employee_count TEXT CHECK (business_employee_count IN ('1', '2-10', '11-50', '51-200', '200+')),
    business_services TEXT[],
    business_coverage_areas TEXT[],
    business_category_id UUID,
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT false,
    verification_level verification_level DEFAULT 'none',
    verification_documents JSONB DEFAULT '[]',
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMPTZ,
    business_verified BOOLEAN DEFAULT false,
    business_verified_at TIMESTAMPTZ,
    verification_badges TEXT[] DEFAULT '{}',
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_suspended BOOLEAN DEFAULT false,
    suspension_reason TEXT,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    banned_until TIMESTAMPTZ,
    moderation_notes TEXT,
    
    -- Privacy Settings
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'contacts', 'private')),
    show_phone BOOLEAN DEFAULT false,
    show_email BOOLEAN DEFAULT false,
    show_location BOOLEAN DEFAULT true,
    phone_visibility TEXT DEFAULT 'contacts' CHECK (phone_visibility IN ('public', 'contacts', 'private')),
    email_visibility TEXT DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private')),
    show_online_status BOOLEAN DEFAULT true,
    show_last_seen BOOLEAN DEFAULT true,
    
    -- Activity Tracking
    total_listings INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Professional Information
    professional_title TEXT,
    years_of_experience INTEGER,
    specializations TEXT[],
    
    -- Contact Preferences
    preferred_contact_method TEXT DEFAULT 'app' CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp')),
    response_time_expectation TEXT DEFAULT 'within_hours' CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week')),
    
    -- Business Display Preferences
    display_business_name BOOLEAN DEFAULT false,
    business_name_priority TEXT DEFAULT 'secondary' CHECK (business_name_priority IN ('primary', 'secondary', 'hidden')),
    
    -- Profile Completion
    profile_completion_percentage INTEGER DEFAULT 0,
    last_profile_update TIMESTAMPTZ DEFAULT NOW(),
    
    -- Trust and Reputation
    trust_score INTEGER DEFAULT 0,
    trust_score_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Social Counts
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    listings_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER SETTINGS TABLE
-- =============================================

CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Settings
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    marketing_emails BOOLEAN DEFAULT true,
    
    -- Notification Types
    notify_new_messages BOOLEAN DEFAULT true,
    notify_listing_updates BOOLEAN DEFAULT true,
    notify_offers BOOLEAN DEFAULT true,
    notify_reviews BOOLEAN DEFAULT true,
    notify_follows BOOLEAN DEFAULT true,
    notify_promotions BOOLEAN DEFAULT true,
    
    -- App Preferences
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'GHS',
    timezone TEXT DEFAULT 'Africa/Accra',
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    
    -- Privacy Settings
    allow_search_by_email BOOLEAN DEFAULT false,
    allow_search_by_phone BOOLEAN DEFAULT false,
    show_activity_status BOOLEAN DEFAULT true,
    
    -- Security Settings
    two_factor_enabled BOOLEAN DEFAULT false,
    login_notifications BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================
-- SECURITY EVENTS TABLE
-- =============================================

CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Event Information
    event_type TEXT NOT NULL CHECK (event_type IN (
        'signup_attempt', 'login_attempt', 'login', 'failed_login', 'logout',
        'password_reset', 'password_change', 'email_verification', 'email_change',
        'profile_update', 'suspicious_activity', 'rate_limit_exceeded',
        'account_lockout', 'account_locked', 'device_change',
        'mfa_enabled', 'mfa_disabled', 'input_threat'
    )),
    
    -- Context Information
    email TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    location_info JSONB DEFAULT '{}',
    
    -- Event Details
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROFILE ACTIVITY LOG
-- =============================================

CREATE TABLE profile_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Activity Information
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'profile_created', 'profile_updated', 'avatar_changed', 'business_info_updated',
        'verification_requested', 'verification_completed', 'settings_changed',
        'privacy_updated', 'account_suspended', 'account_reactivated'
    )),
    
    -- Activity Details
    description TEXT,
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_phone ON profiles USING btree (normalize_phone_number(phone));
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_is_business ON profiles(is_business);
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX idx_profiles_verification_level ON profiles(verification_level);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
CREATE INDEX idx_profiles_last_seen_at ON profiles(last_seen_at);
CREATE INDEX idx_profiles_rating_average ON profiles(rating_average);
CREATE INDEX idx_profiles_trust_score ON profiles(trust_score);

-- Unique constraint on normalized phone numbers
CREATE UNIQUE INDEX profiles_phone_unique_idx ON profiles (normalize_phone_number(phone)) 
WHERE normalize_phone_number(phone) IS NOT NULL;

-- User settings indexes
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Security events indexes
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);

-- Profile activity log indexes
CREATE INDEX idx_profile_activity_log_user_id ON profile_activity_log(user_id);
CREATE INDEX idx_profile_activity_log_activity_type ON profile_activity_log(activity_type);
CREATE INDEX idx_profile_activity_log_created_at ON profile_activity_log(created_at);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on user_settings
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Profiles and authentication tables created successfully!' as status;
