-- =============================================
-- CREATE DATA EXPORT REQUESTS TABLE FOR GDPR COMPLIANCE
-- =============================================
-- Issue: GDPRCompliance component references non-existent 'data_export_requests' table
-- Solution: Create the table with proper structure for GDPR data export requests
-- =============================================

-- Create data_export_requests table
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    file_size_bytes BIGINT,
    format VARCHAR(10) DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),
    includes_deleted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE data_export_requests IS 'Tracks user data export requests for GDPR compliance';
COMMENT ON COLUMN data_export_requests.user_id IS 'The user requesting data export';
COMMENT ON COLUMN data_export_requests.status IS 'Status of the export request: pending, processing, completed, failed, cancelled';
COMMENT ON COLUMN data_export_requests.download_url IS 'Temporary URL for downloading the exported data';
COMMENT ON COLUMN data_export_requests.expires_at IS 'When the download URL expires (typically 7 days)';
COMMENT ON COLUMN data_export_requests.file_size_bytes IS 'Size of the exported data file in bytes';
COMMENT ON COLUMN data_export_requests.format IS 'Export format: json, csv, or pdf';
COMMENT ON COLUMN data_export_requests.includes_deleted IS 'Whether to include soft-deleted data in the export';
COMMENT ON COLUMN data_export_requests.metadata IS 'Additional metadata about the export (sections included, filters applied, etc.)';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id 
ON data_export_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_status 
ON data_export_requests(status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_expires 
ON data_export_requests(expires_at) 
WHERE status = 'completed' AND download_url IS NOT NULL;

-- Add RLS policies
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can only view their own export requests
CREATE POLICY data_export_requests_select_policy ON data_export_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own export requests
CREATE POLICY data_export_requests_insert_policy ON data_export_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending export requests
CREATE POLICY data_export_requests_update_policy ON data_export_requests
    FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

-- Create trigger for updated_at
CREATE TRIGGER update_data_export_requests_updated_at
    BEFORE UPDATE ON data_export_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON INDEX idx_data_export_requests_user_id IS 'Optimize queries by user';
COMMENT ON INDEX idx_data_export_requests_status IS 'Optimize status-based queries with chronological order';
COMMENT ON INDEX idx_data_export_requests_expires IS 'Optimize cleanup queries for expired download URLs';

