-- =============================================
-- FIX: Add missing verification tables and relationships
-- =============================================

-- Create verification_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS verification_documents (
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

-- Create verification_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS verification_templates (
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for ON CONFLICT
    UNIQUE(verification_type, name)
);

-- Create verification_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS verification_history (
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

-- Enable RLS on new tables
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for verification_documents
CREATE POLICY "Users can view their own verification documents" ON verification_documents
    FOR SELECT USING (
        verification_id IN (
            SELECT id FROM user_verification WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create verification documents" ON verification_documents
    FOR INSERT WITH CHECK (
        verification_id IN (
            SELECT id FROM user_verification WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own verification documents" ON verification_documents
    FOR UPDATE USING (
        verification_id IN (
            SELECT id FROM user_verification WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for verification_templates (public read access)
CREATE POLICY "Anyone can view verification templates" ON verification_templates
    FOR SELECT USING (is_active = true);

-- Create RLS policies for verification_history
CREATE POLICY "Users can view their own verification history" ON verification_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create verification history" ON verification_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_documents_verification_id ON verification_documents(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_document_type ON verification_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_verification_documents_status ON verification_documents(status);

CREATE INDEX IF NOT EXISTS idx_verification_templates_verification_type ON verification_templates(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_templates_is_active ON verification_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_verification_history_user_id ON verification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_verification_id ON verification_history(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_event_type ON verification_history(event_type);
CREATE INDEX IF NOT EXISTS idx_verification_history_actor_id ON verification_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_created_at ON verification_history(created_at);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_verification_documents_updated_at
    BEFORE UPDATE ON verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_templates_updated_at
    BEFORE UPDATE ON verification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default verification templates if they don't exist
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
    ARRAY['national_id', 'selfie'],
    '{"full_name": {"type": "string", "required": true}, "date_of_birth": {"type": "date", "required": true}}',
    false,
    true,
    1095
),
(
    'business',
    'Business Verification',
    'Verify business registration and details',
    ARRAY['business_registration', 'tax_certificate'],
    '{"business_name": {"type": "string", "required": true}, "registration_number": {"type": "string", "required": true}}',
    false,
    true,
    1095
),
(
    'address',
    'Address Verification',
    'Verify physical address with utility bill',
    ARRAY['utility_bill'],
    '{"address": {"type": "string", "required": true}}',
    false,
    true,
    365
)
ON CONFLICT (verification_type, name) DO NOTHING;

-- Add missing functions for verification system
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync email verification from auth
CREATE OR REPLACE FUNCTION sync_email_verification_from_auth(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Update email verification status from auth.users
    UPDATE profiles 
    SET 
        email_verified = (
            SELECT email_confirmed_at IS NOT NULL 
            FROM auth.users 
            WHERE id = user_uuid
        ),
        email_verified_at = (
            SELECT email_confirmed_at 
            FROM auth.users 
            WHERE id = user_uuid
        )
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_verification_event(UUID, UUID, TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_email_verification_from_auth(UUID) TO authenticated;

-- Success message
SELECT 'Verification tables and relationships fixed successfully!' as status;
