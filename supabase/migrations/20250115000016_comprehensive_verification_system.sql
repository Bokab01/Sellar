-- =============================================
-- COMPREHENSIVE VERIFICATION SYSTEM
-- User Identity, Phone, Email, Business Verification
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USER VERIFICATION TABLE
-- =============================================

-- Create user_verification table for managing verification requests
CREATE TABLE IF NOT EXISTS user_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('phone', 'email', 'identity', 'business', 'address')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired', 'cancelled')),
  
  -- Verification Data
  submitted_data JSONB DEFAULT '{}'::jsonb, -- Form data submitted by user
  documents JSONB DEFAULT '[]'::jsonb, -- Array of document URLs and metadata
  verification_code TEXT, -- For phone/email verification
  verification_token TEXT, -- Secure token for verification links
  
  -- Review Information
  reviewer_id UUID REFERENCES profiles(id),
  reviewer_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, verification_type) -- One active verification per type per user
);

-- =============================================
-- ENSURE USER_VERIFICATION TABLE HAS ALL COLUMNS
-- =============================================

-- Add missing columns to user_verification table if they don't exist
DO $$
BEGIN
    -- Add created_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'created_at') THEN
        ALTER TABLE user_verification ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'updated_at') THEN
        ALTER TABLE user_verification ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Add submitted_data if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'submitted_data') THEN
        ALTER TABLE user_verification ADD COLUMN submitted_data JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add documents if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'documents') THEN
        ALTER TABLE user_verification ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add verification_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'verification_code') THEN
        ALTER TABLE user_verification ADD COLUMN verification_code TEXT;
    END IF;
    
    -- Add verification_token if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'verification_token') THEN
        ALTER TABLE user_verification ADD COLUMN verification_token TEXT;
    END IF;
    
    -- Add reviewer_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'reviewer_id') THEN
        ALTER TABLE user_verification ADD COLUMN reviewer_id UUID REFERENCES profiles(id);
    END IF;
    
    -- Add reviewer_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'reviewer_notes') THEN
        ALTER TABLE user_verification ADD COLUMN reviewer_notes TEXT;
    END IF;
    
    -- Add rejection_reason if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'rejection_reason') THEN
        ALTER TABLE user_verification ADD COLUMN rejection_reason TEXT;
    END IF;
    
    -- Add submitted_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'submitted_at') THEN
        ALTER TABLE user_verification ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Add reviewed_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'reviewed_at') THEN
        ALTER TABLE user_verification ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;
    
    -- Add approved_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'approved_at') THEN
        ALTER TABLE user_verification ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    
    -- Add expires_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'expires_at') THEN
        ALTER TABLE user_verification ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    
    -- Add ip_address if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'ip_address') THEN
        ALTER TABLE user_verification ADD COLUMN ip_address INET;
    END IF;
    
    -- Add user_agent if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'user_agent') THEN
        ALTER TABLE user_verification ADD COLUMN user_agent TEXT;
    END IF;
    
    -- Add device_info if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_verification' AND column_name = 'device_info') THEN
        ALTER TABLE user_verification ADD COLUMN device_info JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- =============================================
-- VERIFICATION DOCUMENTS TABLE
-- =============================================

-- Create verification_documents table for document management
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES user_verification(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Document Information
  document_type TEXT NOT NULL CHECK (document_type IN (
    'national_id', 'passport', 'drivers_license', 'voters_id', 
    'business_registration', 'tax_certificate', 'utility_bill', 
    'bank_statement', 'selfie', 'selfie_with_id'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Verification Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  
  -- Security
  is_encrypted BOOLEAN DEFAULT FALSE,
  encryption_key TEXT,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- VERIFICATION TEMPLATES TABLE
-- =============================================

-- Create verification_templates for different verification types
CREATE TABLE IF NOT EXISTS verification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_type TEXT NOT NULL UNIQUE,
  
  -- Template Configuration
  title TEXT NOT NULL,
  description TEXT,
  instructions JSONB DEFAULT '[]'::jsonb, -- Step-by-step instructions
  required_documents JSONB DEFAULT '[]'::jsonb, -- Required document types
  optional_documents JSONB DEFAULT '[]'::jsonb, -- Optional document types
  required_fields JSONB DEFAULT '[]'::jsonb, -- Required form fields
  
  -- Settings
  auto_approve BOOLEAN DEFAULT FALSE,
  review_required BOOLEAN DEFAULT TRUE,
  expiry_days INTEGER DEFAULT 30,
  max_attempts INTEGER DEFAULT 3,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- VERIFICATION HISTORY TABLE
-- =============================================

-- Create verification_history for audit trail
CREATE TABLE IF NOT EXISTS verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES user_verification(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Action Information
  action TEXT NOT NULL CHECK (action IN (
    'submitted', 'updated', 'reviewed', 'approved', 'rejected', 
    'expired', 'cancelled', 'document_uploaded', 'document_removed'
  )),
  actor_id UUID REFERENCES profiles(id), -- Who performed the action
  actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'admin', 'system')),
  
  -- Details
  details JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- UPDATE PROFILES TABLE
-- =============================================

-- Add verification-related columns to profiles if they don't exist
DO $$
BEGIN
    -- Verification Status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
        ALTER TABLE profiles ADD COLUMN verification_level TEXT DEFAULT 'none' CHECK (verification_level IN ('none', 'phone', 'email', 'identity', 'business', 'premium'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_badges') THEN
        ALTER TABLE profiles ADD COLUMN verification_badges JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Phone Verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_verified') THEN
        ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_verified_at') THEN
        ALTER TABLE profiles ADD COLUMN phone_verified_at TIMESTAMPTZ;
    END IF;
    
    -- Email Verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
        ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_verified_at') THEN
        ALTER TABLE profiles ADD COLUMN email_verified_at TIMESTAMPTZ;
    END IF;
    
    -- Identity Verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'identity_verified') THEN
        ALTER TABLE profiles ADD COLUMN identity_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'identity_verified_at') THEN
        ALTER TABLE profiles ADD COLUMN identity_verified_at TIMESTAMPTZ;
    END IF;
    
    -- Business Verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_verified') THEN
        ALTER TABLE profiles ADD COLUMN business_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_verified_at') THEN
        ALTER TABLE profiles ADD COLUMN business_verified_at TIMESTAMPTZ;
    END IF;
    
    -- Trust Score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trust_score') THEN
        ALTER TABLE profiles ADD COLUMN trust_score INTEGER DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trust_score_updated_at') THEN
        ALTER TABLE profiles ADD COLUMN trust_score_updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- =============================================
-- INSERT DEFAULT VERIFICATION TEMPLATES
-- =============================================

-- Insert default verification templates
INSERT INTO verification_templates (verification_type, title, description, instructions, required_documents, required_fields, expiry_days, max_attempts)
VALUES 
-- Phone Verification
('phone', 'Phone Number Verification', 'Verify your phone number to increase account security and trust.', 
 '[
   "Enter your phone number",
   "We will send you a verification code via SMS",
   "Enter the code to verify your phone number"
 ]'::jsonb,
 '[]'::jsonb,
 '["phone_number"]'::jsonb,
 7, 5),

-- Email Verification
('email', 'Email Address Verification', 'Verify your email address to secure your account and receive important notifications.',
 '[
   "Check your email inbox",
   "Click the verification link in the email",
   "Your email will be verified automatically"
 ]'::jsonb,
 '[]'::jsonb,
 '["email_address"]'::jsonb,
 7, 3),

-- Identity Verification
('identity', 'Identity Verification', 'Verify your identity to build trust and access premium features.',
 '[
   "Prepare a valid government-issued ID (National ID, Passport, or Driver''s License)",
   "Take a clear photo of your ID document",
   "Take a selfie holding your ID document",
   "Fill in your personal information",
   "Submit for review"
 ]'::jsonb,
 '["national_id", "selfie_with_id"]'::jsonb,
 '["full_name", "date_of_birth", "id_number", "id_type"]'::jsonb,
 30, 3),

-- Business Verification
('business', 'Business Verification', 'Verify your business to access business features and build customer trust.',
 '[
   "Prepare your business registration documents",
   "Prepare your tax identification certificate",
   "Take photos of your business premises (optional)",
   "Fill in your business information",
   "Submit for review"
 ]'::jsonb,
 '["business_registration"]'::jsonb,
 '["business_name", "business_type", "registration_number", "tax_id", "business_address"]'::jsonb,
 30, 3),

-- Address Verification
('address', 'Address Verification', 'Verify your address for location-based services and delivery.',
 '[
   "Prepare a recent utility bill or bank statement",
   "Ensure the document shows your name and address clearly",
   "Document should be dated within the last 3 months",
   "Submit for review"
 ]'::jsonb,
 '["utility_bill"]'::jsonb,
 '["street_address", "city", "region", "postal_code"]'::jsonb,
 30, 3)

ON CONFLICT (verification_type) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  instructions = EXCLUDED.instructions,
  required_documents = EXCLUDED.required_documents,
  required_fields = EXCLUDED.required_fields,
  updated_at = now();

-- =============================================
-- CREATE INDEXES
-- =============================================

-- User Verification Indexes
CREATE INDEX IF NOT EXISTS user_verification_user_id_idx ON user_verification(user_id);
CREATE INDEX IF NOT EXISTS user_verification_type_status_idx ON user_verification(verification_type, status);
CREATE INDEX IF NOT EXISTS user_verification_status_idx ON user_verification(status);
CREATE INDEX IF NOT EXISTS user_verification_submitted_at_idx ON user_verification(submitted_at);
CREATE INDEX IF NOT EXISTS user_verification_expires_at_idx ON user_verification(expires_at);

-- Verification Documents Indexes
CREATE INDEX IF NOT EXISTS verification_documents_verification_id_idx ON verification_documents(verification_id);
CREATE INDEX IF NOT EXISTS verification_documents_user_id_idx ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS verification_documents_type_status_idx ON verification_documents(document_type, status);

-- Verification History Indexes
CREATE INDEX IF NOT EXISTS verification_history_verification_id_idx ON verification_history(verification_id);
CREATE INDEX IF NOT EXISTS verification_history_user_id_idx ON verification_history(user_id);
CREATE INDEX IF NOT EXISTS verification_history_action_idx ON verification_history(action);
CREATE INDEX IF NOT EXISTS verification_history_created_at_idx ON verification_history(created_at);

-- Profiles Verification Indexes
CREATE INDEX IF NOT EXISTS profiles_verification_level_idx ON profiles(verification_level);
CREATE INDEX IF NOT EXISTS profiles_is_verified_idx ON profiles(is_verified);
CREATE INDEX IF NOT EXISTS profiles_trust_score_idx ON profiles(trust_score);

-- =============================================
-- CREATE TRIGGERS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_user_verification_updated_at ON user_verification;
CREATE TRIGGER update_user_verification_updated_at BEFORE UPDATE ON user_verification
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_verification_documents_updated_at ON verification_documents;
CREATE TRIGGER update_verification_documents_updated_at BEFORE UPDATE ON verification_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_verification_templates_updated_at ON verification_templates;
CREATE TRIGGER update_verification_templates_updated_at BEFORE UPDATE ON verification_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

-- User Verification Policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own verification requests" ON user_verification;
CREATE POLICY "Users can view their own verification requests"
  ON user_verification FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own verification requests" ON user_verification;
CREATE POLICY "Users can create their own verification requests"
  ON user_verification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending verification requests" ON user_verification;
CREATE POLICY "Users can update their own pending verification requests"
  ON user_verification FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Verification Documents Policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own verification documents" ON verification_documents;
CREATE POLICY "Users can view their own verification documents"
  ON verification_documents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upload their own verification documents" ON verification_documents;
CREATE POLICY "Users can upload their own verification documents"
  ON verification_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pending documents" ON verification_documents;
CREATE POLICY "Users can update their own pending documents"
  ON verification_documents FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Verification Templates Policies (Public read access) (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view active verification templates" ON verification_templates;
CREATE POLICY "Anyone can view active verification templates"
  ON verification_templates FOR SELECT
  USING (is_active = true);

-- Verification History Policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own verification history" ON verification_history;
CREATE POLICY "Users can view their own verification history"
  ON verification_history FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to calculate trust score based on verifications
CREATE OR REPLACE FUNCTION calculate_trust_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    profile_record profiles%ROWTYPE;
BEGIN
    SELECT * INTO profile_record FROM profiles WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Base score for having an account
    score := 10;
    
    -- Email verification: +15 points
    IF profile_record.email_verified THEN
        score := score + 15;
    END IF;
    
    -- Phone verification: +20 points
    IF profile_record.phone_verified THEN
        score := score + 20;
    END IF;
    
    -- Identity verification: +35 points
    IF profile_record.identity_verified THEN
        score := score + 35;
    END IF;
    
    -- Business verification: +20 points
    IF profile_record.business_verified THEN
        score := score + 20;
    END IF;
    
    -- Ensure score doesn't exceed 100
    IF score > 100 THEN
        score := 100;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update verification badges
CREATE OR REPLACE FUNCTION update_verification_badges(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    badges JSONB := '[]'::jsonb;
    profile_record profiles%ROWTYPE;
BEGIN
    SELECT * INTO profile_record FROM profiles WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN badges;
    END IF;
    
    -- Add badges based on verifications
    IF profile_record.email_verified THEN
        badges := badges || '["email_verified"]'::jsonb;
    END IF;
    
    IF profile_record.phone_verified THEN
        badges := badges || '["phone_verified"]'::jsonb;
    END IF;
    
    IF profile_record.identity_verified THEN
        badges := badges || '["identity_verified"]'::jsonb;
    END IF;
    
    IF profile_record.business_verified THEN
        badges := badges || '["business_verified"]'::jsonb;
    END IF;
    
    -- Update the profile
    UPDATE profiles 
    SET 
        verification_badges = badges,
        trust_score = calculate_trust_score(user_uuid),
        trust_score_updated_at = now()
    WHERE id = user_uuid;
    
    RETURN badges;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle verification approval
CREATE OR REPLACE FUNCTION approve_verification(verification_uuid UUID, reviewer_uuid UUID DEFAULT NULL, notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    verification_record user_verification%ROWTYPE;
    verification_type_val TEXT;
    user_uuid UUID;
BEGIN
    -- Get verification record
    SELECT * INTO verification_record FROM user_verification WHERE id = verification_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    verification_type_val := verification_record.verification_type;
    user_uuid := verification_record.user_id;
    
    -- Update verification status
    UPDATE user_verification 
    SET 
        status = 'approved',
        reviewer_id = reviewer_uuid,
        reviewer_notes = notes,
        reviewed_at = now(),
        approved_at = now()
    WHERE id = verification_uuid;
    
    -- Update profile based on verification type
    CASE verification_type_val
        WHEN 'email' THEN
            UPDATE profiles SET email_verified = TRUE, email_verified_at = now() WHERE id = user_uuid;
        WHEN 'phone' THEN
            UPDATE profiles SET phone_verified = TRUE, phone_verified_at = now() WHERE id = user_uuid;
        WHEN 'identity' THEN
            UPDATE profiles SET identity_verified = TRUE, identity_verified_at = now() WHERE id = user_uuid;
        WHEN 'business' THEN
            UPDATE profiles SET business_verified = TRUE, business_verified_at = now() WHERE id = user_uuid;
    END CASE;
    
    -- Update verification level and badges
    PERFORM update_verification_badges(user_uuid);
    
    -- Add to history
    INSERT INTO verification_history (verification_id, user_id, action, actor_id, actor_type, notes)
    VALUES (verification_uuid, user_uuid, 'approved', reviewer_uuid, 'admin', notes);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- VERIFICATION COMPLETE
-- =============================================

SELECT 'Comprehensive verification system migration completed successfully' as status;
