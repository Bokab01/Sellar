-- Create file_uploads table for audit logging
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(bucket, path)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created ON file_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_uploads_bucket_path ON file_uploads(bucket, path);
CREATE INDEX IF NOT EXISTS idx_file_uploads_deleted ON file_uploads(deleted_at) WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own uploads
CREATE POLICY "Users can view own uploads"
  ON file_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Edge functions can insert uploads (service role)
CREATE POLICY "Service role can insert uploads"
  ON file_uploads FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Edge functions can update uploads (service role)
CREATE POLICY "Service role can update uploads"
  ON file_uploads FOR UPDATE
  TO service_role
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE file_uploads IS 'Audit log for all file uploads to R2 storage';
COMMENT ON COLUMN file_uploads.user_id IS 'User who uploaded the file';
COMMENT ON COLUMN file_uploads.bucket IS 'R2 bucket name';
COMMENT ON COLUMN file_uploads.path IS 'File path within the bucket';
COMMENT ON COLUMN file_uploads.file_size IS 'File size in bytes';
COMMENT ON COLUMN file_uploads.content_type IS 'MIME type of the file';
COMMENT ON COLUMN file_uploads.deleted_at IS 'Timestamp when file was deleted (soft delete)';

