-- =============================================
-- FIX: Add missing GDPR compliance tables
-- =============================================

-- Create data_export_requests table for GDPR data export requests
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Information
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Request Details
    request_type TEXT NOT NULL DEFAULT 'full_export' CHECK (request_type IN ('full_export', 'partial_export', 'specific_data')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_data_types TEXT[] DEFAULT '{}', -- Array of data types requested (e.g., ['profile', 'transactions', 'messages'])
    
    -- Processing Information
    file_url TEXT, -- URL to the exported data file
    file_size_bytes BIGINT,
    expires_at TIMESTAMPTZ, -- When the download link expires
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT, -- Admin notes about the request
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create data_deletion_requests table for GDPR data deletion requests
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Information
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Request Details
    request_type TEXT NOT NULL DEFAULT 'account_deletion' CHECK (request_type IN ('account_deletion', 'data_deletion', 'specific_data_deletion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
    deletion_scope TEXT NOT NULL DEFAULT 'full_account' CHECK (deletion_scope IN ('full_account', 'personal_data', 'specific_data')),
    
    -- Deletion Details
    data_types_to_delete TEXT[] DEFAULT '{}', -- Array of data types to delete
    reason TEXT, -- User's reason for deletion request
    verification_method TEXT, -- How the user was verified (email, phone, etc.)
    
    -- Processing Information
    retention_period_days INTEGER DEFAULT 30, -- How long to retain data before deletion
    scheduled_deletion_date TIMESTAMPTZ,
    actual_deletion_date TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    admin_notes TEXT, -- Admin notes about the request
    legal_hold BOOLEAN DEFAULT false, -- Whether data is under legal hold
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_created_at ON data_export_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_expires_at ON data_export_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_created_at ON data_deletion_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled_deletion_date ON data_deletion_requests(scheduled_deletion_date);

-- Add RLS policies for data_export_requests
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own export requests
CREATE POLICY "Users can view their own export requests" ON data_export_requests 
FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own export requests
CREATE POLICY "Users can create their own export requests" ON data_export_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending export requests
CREATE POLICY "Users can update their own pending export requests" ON data_export_requests 
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all export requests
CREATE POLICY "Admins can manage all export requests" ON data_export_requests 
FOR ALL USING (auth.role() = 'service_role');

-- Add RLS policies for data_deletion_requests
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own deletion requests
CREATE POLICY "Users can view their own deletion requests" ON data_deletion_requests 
FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own deletion requests
CREATE POLICY "Users can create their own deletion requests" ON data_deletion_requests 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending deletion requests
CREATE POLICY "Users can update their own pending deletion requests" ON data_deletion_requests 
FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'under_review'));

-- Admins can manage all deletion requests
CREATE POLICY "Admins can manage all deletion requests" ON data_deletion_requests 
FOR ALL USING (auth.role() = 'service_role');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_data_export_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_export_requests_updated_at_trigger
    BEFORE UPDATE ON data_export_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_data_export_requests_updated_at();

CREATE OR REPLACE FUNCTION update_data_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_deletion_requests_updated_at_trigger
    BEFORE UPDATE ON data_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_data_deletion_requests_updated_at();

-- Create function to process data export request
CREATE OR REPLACE FUNCTION process_data_export_request(
    p_request_id UUID,
    p_file_url TEXT,
    p_file_size_bytes BIGINT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- Get the request
    SELECT * INTO v_request 
    FROM data_export_requests 
    WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Export request not found');
    END IF;
    
    -- Check if request is in valid state for processing
    IF v_request.status NOT IN ('pending', 'processing') THEN
        RETURN json_build_object('success', false, 'error', 'Request is not in a processable state');
    END IF;
    
    -- Update the request
    UPDATE data_export_requests 
    SET status = 'completed',
        file_url = p_file_url,
        file_size_bytes = p_file_size_bytes,
        expires_at = COALESCE(p_expires_at, NOW() + INTERVAL '7 days'),
        processed_at = NOW(),
        completed_at = NOW()
    WHERE id = p_request_id;
    
    RETURN json_build_object(
        'success', true,
        'request_id', p_request_id,
        'message', 'Export request processed successfully'
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION process_data_export_request(UUID, TEXT, BIGINT, TIMESTAMPTZ) TO service_role;

-- Create function to process data deletion request
CREATE OR REPLACE FUNCTION process_data_deletion_request(
    p_request_id UUID,
    p_approved BOOLEAN,
    p_admin_notes TEXT DEFAULT NULL,
    p_scheduled_deletion_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
    v_new_status TEXT;
    v_deletion_date TIMESTAMPTZ;
BEGIN
    -- Get the request
    SELECT * INTO v_request 
    FROM data_deletion_requests 
    WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Deletion request not found');
    END IF;
    
    -- Check if request is in valid state for processing
    IF v_request.status NOT IN ('pending', 'under_review') THEN
        RETURN json_build_object('success', false, 'error', 'Request is not in a processable state');
    END IF;
    
    -- Determine new status and deletion date
    IF p_approved THEN
        v_new_status := 'approved';
        v_deletion_date := COALESCE(p_scheduled_deletion_date, NOW() + INTERVAL '30 days');
    ELSE
        v_new_status := 'rejected';
        v_deletion_date := NULL;
    END IF;
    
    -- Update the request
    UPDATE data_deletion_requests 
    SET status = v_new_status,
        admin_notes = p_admin_notes,
        scheduled_deletion_date = v_deletion_date,
        approved_at = CASE WHEN p_approved THEN NOW() ELSE NULL END,
        processed_at = NOW()
    WHERE id = p_request_id;
    
    RETURN json_build_object(
        'success', true,
        'request_id', p_request_id,
        'status', v_new_status,
        'scheduled_deletion_date', v_deletion_date,
        'message', 'Deletion request processed successfully'
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION process_data_deletion_request(UUID, BOOLEAN, TEXT, TIMESTAMPTZ) TO service_role;

-- Add comments to document the tables
COMMENT ON TABLE data_export_requests IS 'Stores GDPR data export requests from users';
COMMENT ON TABLE data_deletion_requests IS 'Stores GDPR data deletion requests from users';
COMMENT ON FUNCTION process_data_export_request(UUID, TEXT, BIGINT, TIMESTAMPTZ) IS 'Processes a data export request and marks it as completed';
COMMENT ON FUNCTION process_data_deletion_request(UUID, BOOLEAN, TEXT, TIMESTAMPTZ) IS 'Processes a data deletion request with approval/rejection';

-- Success message
SELECT 'GDPR compliance tables (data_export_requests, data_deletion_requests) created successfully!' as status;
