-- =============================================
-- SELLAR MOBILE APP - VERIFICATION SYSTEM
-- Migration 08: User verification and identity
-- =============================================

-- =============================================
-- USER VERIFICATION TABLE
-- =============================================

CREATE TABLE user_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Verification Type
    verification_type TEXT NOT NULL CHECK (verification_type IN ('phone', 'email', 'identity', 'business', 'address')),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired', 'cancelled')),
    
    -- Verification Data
    submitted_data JSONB DEFAULT '{}',
    documents JSONB DEFAULT '[]',
    verification_code TEXT,
    verification_token TEXT,
    
    -- Review Information
    reviewer_id UUID REFERENCES profiles(id),
    reviewer_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Context Information
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One active verification per type per user
    UNIQUE(user_id, verification_type)
);

-- =============================================
-- VERIFICATION DOCUMENTS TABLE
-- =============================================

CREATE TABLE verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL REFERENCES user_verification(id) ON DELETE CASCADE,
    
    -- Document Information
    document_type TEXT NOT NULL CHECK (document_type IN (
        'national_id', 'passport', 'drivers_license', 'voters_id',
        'business_registration', 'tax_certificate', 'utility_bill',
        'bank_statement', 'selfie', 'address_proof'
    )),
    
    -- File Information
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- Processing Status
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'verified', 'rejected')),
    
    -- OCR and Analysis Results
    ocr_data JSONB DEFAULT '{}',
    analysis_results JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    
    -- Review Information
    reviewer_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- VERIFICATION TEMPLATES TABLE
-- =============================================

CREATE TABLE verification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Information
    verification_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Requirements
    required_documents TEXT[] DEFAULT '{}',
    required_fields JSONB DEFAULT '{}',
    
    -- Configuration
    auto_approve BOOLEAN DEFAULT false,
    requires_manual_review BOOLEAN DEFAULT true,
    expiry_days INTEGER DEFAULT 365,
    
    -- Processing Settings
    enable_ocr BOOLEAN DEFAULT false,
    enable_face_match BOOLEAN DEFAULT false,
    min_confidence_score DECIMAL(3,2) DEFAULT 0.80,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- VERIFICATION HISTORY TABLE
-- =============================================

CREATE TABLE verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    verification_id UUID NOT NULL REFERENCES user_verification(id) ON DELETE CASCADE,
    
    -- Event Information
    event_type TEXT NOT NULL CHECK (event_type IN (
        'submitted', 'documents_uploaded', 'in_review', 'approved', 
        'rejected', 'expired', 'cancelled', 'resubmitted'
    )),
    
    -- Event Details
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Actor Information
    actor_id UUID REFERENCES profiles(id),
    actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'admin', 'system')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User verification indexes
CREATE INDEX idx_user_verification_user_id ON user_verification(user_id);
CREATE INDEX idx_user_verification_type ON user_verification(verification_type);
CREATE INDEX idx_user_verification_status ON user_verification(status);
CREATE INDEX idx_user_verification_reviewer_id ON user_verification(reviewer_id);
CREATE INDEX idx_user_verification_submitted_at ON user_verification(submitted_at);
CREATE INDEX idx_user_verification_expires_at ON user_verification(expires_at);

-- Verification documents indexes
CREATE INDEX idx_verification_documents_verification_id ON verification_documents(verification_id);
CREATE INDEX idx_verification_documents_document_type ON verification_documents(document_type);
CREATE INDEX idx_verification_documents_status ON verification_documents(status);

-- Verification templates indexes
CREATE INDEX idx_verification_templates_verification_type ON verification_templates(verification_type);
CREATE INDEX idx_verification_templates_is_active ON verification_templates(is_active);

-- Verification history indexes
CREATE INDEX idx_verification_history_user_id ON verification_history(user_id);
CREATE INDEX idx_verification_history_verification_id ON verification_history(verification_id);
CREATE INDEX idx_verification_history_event_type ON verification_history(event_type);
CREATE INDEX idx_verification_history_actor_id ON verification_history(actor_id);
CREATE INDEX idx_verification_history_created_at ON verification_history(created_at);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on user_verification
CREATE TRIGGER update_user_verification_updated_at
    BEFORE UPDATE ON user_verification
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on verification_documents
CREATE TRIGGER update_verification_documents_updated_at
    BEFORE UPDATE ON verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on verification_templates
CREATE TRIGGER update_verification_templates_updated_at
    BEFORE UPDATE ON verification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VERIFICATION FUNCTIONS
-- =============================================

-- Function to log verification history
CREATE OR REPLACE FUNCTION log_verification_event(
    p_user_id UUID,
    p_verification_id UUID,
    p_event_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_actor_type TEXT DEFAULT 'user',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    history_id UUID;
BEGIN
    INSERT INTO verification_history (
        user_id, verification_id, event_type, description,
        actor_id, actor_type, metadata
    )
    VALUES (
        p_user_id, p_verification_id, p_event_type, p_description,
        p_actor_id, p_actor_type, p_metadata
    )
    RETURNING id INTO history_id;
    
    RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update profile verification status
CREATE OR REPLACE FUNCTION update_profile_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile verification status when verification is approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        CASE NEW.verification_type
            WHEN 'phone' THEN
                UPDATE profiles 
                SET phone_verified = true, phone_verified_at = NOW()
                WHERE id = NEW.user_id;
                
            WHEN 'email' THEN
                UPDATE profiles 
                SET email_verified = true, email_verified_at = NOW()
                WHERE id = NEW.user_id;
                
            WHEN 'identity' THEN
                UPDATE profiles 
                SET identity_verified = true, identity_verified_at = NOW()
                WHERE id = NEW.user_id;
                
            WHEN 'business' THEN
                UPDATE profiles 
                SET business_verified = true, business_verified_at = NOW()
                WHERE id = NEW.user_id;
        END CASE;
        
        -- Update overall verification status
        UPDATE profiles 
        SET 
            is_verified = (
                phone_verified = true OR 
                email_verified = true OR 
                identity_verified = true
            ),
            verification_level = CASE
                WHEN identity_verified = true AND business_verified = true THEN 'premium'
                WHEN identity_verified = true THEN 'identity'
                WHEN business_verified = true THEN 'business'
                WHEN phone_verified = true AND email_verified = true THEN 'email'
                WHEN phone_verified = true THEN 'phone'
                ELSE 'none'
            END
        WHERE id = NEW.user_id;
        
        -- Log the event
        PERFORM log_verification_event(
            NEW.user_id,
            NEW.id,
            'approved',
            'Verification approved: ' || NEW.verification_type,
            NEW.reviewer_id,
            'admin'
        );
        
    -- Handle rejection
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        PERFORM log_verification_event(
            NEW.user_id,
            NEW.id,
            'rejected',
            'Verification rejected: ' || COALESCE(NEW.rejection_reason, 'No reason provided'),
            NEW.reviewer_id,
            'admin'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile verification status
CREATE TRIGGER update_profile_verification_status_trigger
    AFTER UPDATE ON user_verification
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_verification_status();

-- Function to create verification request
CREATE OR REPLACE FUNCTION create_verification_request(
    p_user_id UUID,
    p_verification_type TEXT,
    p_submitted_data JSONB DEFAULT '{}',
    p_documents JSONB DEFAULT '[]'
)
RETURNS UUID AS $$
DECLARE
    verification_id UUID;
    template_record RECORD;
    expiry_date TIMESTAMPTZ;
BEGIN
    -- Get verification template
    SELECT * INTO template_record
    FROM verification_templates
    WHERE verification_type = p_verification_type
    AND is_active = true
    LIMIT 1;
    
    -- Calculate expiry date
    IF template_record.expiry_days IS NOT NULL THEN
        expiry_date := NOW() + (template_record.expiry_days || ' days')::INTERVAL;
    END IF;
    
    -- Create verification request
    INSERT INTO user_verification (
        user_id, verification_type, submitted_data, documents, expires_at
    )
    VALUES (
        p_user_id, p_verification_type, p_submitted_data, p_documents, expiry_date
    )
    ON CONFLICT (user_id, verification_type) 
    DO UPDATE SET
        status = 'pending',
        submitted_data = p_submitted_data,
        documents = p_documents,
        submitted_at = NOW(),
        expires_at = expiry_date,
        updated_at = NOW()
    RETURNING id INTO verification_id;
    
    -- Log the event
    PERFORM log_verification_event(
        p_user_id,
        verification_id,
        'submitted',
        'Verification request submitted: ' || p_verification_type,
        p_user_id,
        'user'
    );
    
    RETURN verification_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL VERIFICATION TEMPLATES
-- =============================================

-- Insert default verification templates
INSERT INTO verification_templates (
    verification_type, name, description, required_documents, 
    required_fields, auto_approve, requires_manual_review, expiry_days
) VALUES
(
    'phone',
    'Phone Number Verification',
    'Verify phone number with SMS code',
    '{}',
    '{"phone": {"type": "string", "required": true}}',
    true,
    false,
    365
),
(
    'email',
    'Email Address Verification',
    'Verify email address with confirmation link',
    '{}',
    '{"email": {"type": "string", "required": true}}',
    true,
    false,
    365
),
(
    'identity',
    'Identity Verification',
    'Verify identity with government-issued ID',
    '["national_id", "selfie"]',
    '{"full_name": {"type": "string", "required": true}, "date_of_birth": {"type": "date", "required": true}}',
    false,
    true,
    1095
),
(
    'business',
    'Business Verification',
    'Verify business registration and details',
    '["business_registration", "tax_certificate"]',
    '{"business_name": {"type": "string", "required": true}, "registration_number": {"type": "string", "required": true}}',
    false,
    true,
    1095
),
(
    'address',
    'Address Verification',
    'Verify physical address with utility bill',
    '["utility_bill"]',
    '{"address": {"type": "string", "required": true}}',
    false,
    true,
    365
)
ON CONFLICT (verification_type, name) DO NOTHING;

-- Success message
SELECT 'Verification system tables created successfully!' as status;
