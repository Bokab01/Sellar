-- =============================================
-- FIX: Add missing requested_at columns to GDPR tables
-- =============================================

-- Add requested_at column to data_export_requests table if it doesn't exist
ALTER TABLE data_export_requests 
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();

-- Add requested_at column to data_deletion_requests table if it doesn't exist
ALTER TABLE data_deletion_requests 
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to set requested_at to created_at value if requested_at is NULL
UPDATE data_export_requests 
SET requested_at = created_at 
WHERE requested_at IS NULL;

UPDATE data_deletion_requests 
SET requested_at = created_at 
WHERE requested_at IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN data_export_requests.requested_at IS 'When the user requested the data export';
COMMENT ON COLUMN data_deletion_requests.requested_at IS 'When the user requested the data deletion';

-- Success message
SELECT 'requested_at columns added to GDPR tables successfully!' as status;
