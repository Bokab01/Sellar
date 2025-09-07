-- =============================================
-- CRITICAL FIX: PROFILES TABLE - CORRECTED TO MATCH APP
-- This replaces 02_profiles_and_auth.sql with exact app matches
-- =============================================

-- Drop and recreate profiles table with correct structure
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information (EXACT APP MATCH)
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    username TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT DEFAULT 'Accra, Greater Accra',
    
    -- App expects these exact fields
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_sales INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    credit_balance INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    response_time TEXT DEFAULT 'within_hours',
    
    -- Professional fields (EXACT APP MATCH)
    professional_title TEXT,
    years_of_experience INTEGER,
    
    -- Contact preferences (EXACT APP MATCH)
    preferred_contact_method TEXT DEFAULT 'app' CHECK (preferred_contact_method IN ('app', 'phone', 'email', 'whatsapp')),
    response_time_expectation TEXT DEFAULT 'within_hours' CHECK (response_time_expectation IN ('within_minutes', 'within_hours', 'within_day', 'within_week')),
    
    -- Privacy settings (EXACT APP MATCH)
    phone_visibility TEXT DEFAULT 'private' CHECK (phone_visibility IN ('public', 'contacts', 'private')),
    email_visibility TEXT DEFAULT 'private' CHECK (email_visibility IN ('public', 'contacts', 'private')),
    show_online_status BOOLEAN DEFAULT true,
    show_last_seen BOOLEAN DEFAULT true,
    
    -- Business fields (EXACT APP MATCH)
    is_business BOOLEAN DEFAULT false,
    business_name TEXT,
    business_type TEXT,
    business_description TEXT,
    business_phone TEXT,
    business_email TEXT,
    business_website TEXT,
    display_business_name BOOLEAN DEFAULT false,
    business_name_priority TEXT DEFAULT 'secondary' CHECK (business_name_priority IN ('primary', 'secondary', 'hidden')),
    
    -- Additional fields (EXACT APP MATCH)
    account_type TEXT,
    verification_status TEXT,
    
    -- Verification fields
    phone_verified BOOLEAN DEFAULT false,
    phone_verified_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMPTZ,
    business_verified BOOLEAN DEFAULT false,
    business_verified_at TIMESTAMPTZ,
    
    -- Additional fields for completeness
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    verification_level TEXT DEFAULT 'none' CHECK (verification_level IN ('none', 'phone', 'email', 'identity', 'business', 'premium')),
    
    -- Status fields
    is_active BOOLEAN DEFAULT true,
    is_suspended BOOLEAN DEFAULT false,
    suspension_reason TEXT,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    
    -- Counts
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    listings_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table (unchanged)
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

-- Security events table (unchanged)
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

-- Profile activity log (unchanged)
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

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_is_business ON profiles(is_business);
CREATE INDEX idx_profiles_is_verified ON profiles(is_verified);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
CREATE INDEX idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX idx_profiles_rating ON profiles(rating);

-- Triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'CRITICAL FIX: Profiles table corrected to match app exactly!' as status;
