-- =============================================
-- SELLAR MOBILE APP - EXTENSIONS AND CORE SETUP
-- Migration 01: Essential extensions and core configuration
-- =============================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types for the application
DO $$
BEGIN
    -- User verification levels
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_level') THEN
        CREATE TYPE verification_level AS ENUM ('none', 'phone', 'email', 'identity', 'business', 'premium');
    END IF;
    
    -- Listing status types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
        CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'expired', 'suspended', 'deleted');
    END IF;
    
    -- Transaction status types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
    END IF;
    
    -- Message status types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'deleted');
    END IF;
    
    -- Moderation status types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moderation_status') THEN
        CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged', 'under_review');
    END IF;
END $$;

-- Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique usernames
CREATE OR REPLACE FUNCTION generate_unique_username(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
    username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Clean the base name
    base_name := LOWER(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9]', '', 'g'));
    
    -- Ensure minimum length
    IF LENGTH(base_name) < 3 THEN
        base_name := 'user' || base_name;
    END IF;
    
    -- Try the base name first
    username := base_name;
    
    -- If it exists, add numbers until we find a unique one
    WHILE EXISTS (SELECT 1 FROM profiles WHERE profiles.username = username) LOOP
        counter := counter + 1;
        username := base_name || counter::TEXT;
    END LOOP;
    
    RETURN username;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize phone numbers
CREATE OR REPLACE FUNCTION normalize_phone_number(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone IS NULL OR phone = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove all non-digit characters
    phone := REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
    
    -- Handle Ghana phone numbers
    IF LENGTH(phone) = 10 AND phone ~ '^0[2-9]' THEN
        -- Convert 0XXXXXXXXX to +233XXXXXXXXX
        phone := '+233' || SUBSTRING(phone FROM 2);
    ELSIF LENGTH(phone) = 9 AND phone ~ '^[2-9]' THEN
        -- Convert XXXXXXXXX to +233XXXXXXXXX
        phone := '+233' || phone;
    ELSIF LENGTH(phone) >= 10 AND phone ~ '^233' THEN
        -- Add + if missing
        phone := '+' || phone;
    END IF;
    
    RETURN phone;
END;
$$ LANGUAGE plpgsql;

-- Function to validate email addresses
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if user exists by email
CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = LOWER(TRIM(email_to_check))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated;

-- Create indexes for performance
-- These will be used by multiple tables
CREATE INDEX IF NOT EXISTS idx_created_at ON auth.users(created_at);
CREATE INDEX IF NOT EXISTS idx_email_confirmed_at ON auth.users(email_confirmed_at);

-- Success message
SELECT 'Extensions and core setup completed successfully!' as status;
