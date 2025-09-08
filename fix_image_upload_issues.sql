-- =============================================
-- FIX: Image Upload Issues - Storage Policies and Buckets
-- =============================================

-- =============================================
-- STORAGE BUCKETS SETUP
-- =============================================

-- Create storage buckets (matching frontend STORAGE_BUCKETS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('listing-images', 'listing-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('community-images', 'community-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('chat-attachments', 'chat-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('verification-documents', 'verification-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own community images" ON storage.objects;

DROP POLICY IF EXISTS "Users can view chat attachments they're involved in" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete chat attachments they uploaded" ON storage.objects;

DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own verification documents" ON storage.objects;

-- Profile images bucket policies
CREATE POLICY "Users can view all profile images" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can update their own profile images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own profile images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Listing images bucket policies
CREATE POLICY "Anyone can view listing images" ON storage.objects
    FOR SELECT USING (bucket_id = 'listing-images');

CREATE POLICY "Authenticated users can upload listing images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'listing-images' 
        AND auth.role() = 'authenticated'
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can update their own listing images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'listing-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own listing images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'listing-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Community images bucket policies
CREATE POLICY "Anyone can view community images" ON storage.objects
    FOR SELECT USING (bucket_id = 'community-images');

CREATE POLICY "Authenticated users can upload community images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'community-images' 
        AND auth.role() = 'authenticated'
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can update their own community images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'community-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own community images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'community-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Chat attachments bucket policies (private)
CREATE POLICY "Users can view chat attachments they're involved in" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat-attachments' 
        AND (
            auth.uid()::text = (storage.foldername(name))[1] OR
            auth.uid()::text = (storage.foldername(name))[2]
        )
    );

CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-attachments' 
        AND auth.role() = 'authenticated'
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    );

CREATE POLICY "Users can delete chat attachments they uploaded" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'chat-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Verification documents bucket policies (private)
CREATE POLICY "Users can view their own verification documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can upload their own verification documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND (storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    );

CREATE POLICY "Users can delete their own verification documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'verification-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- =============================================
-- STORAGE HELPER FUNCTIONS
-- =============================================

-- Function to generate secure file path
CREATE OR REPLACE FUNCTION generate_storage_path(
    bucket_name TEXT,
    user_id UUID,
    file_extension TEXT,
    subfolder TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    timestamp_str TEXT;
    random_str TEXT;
    path TEXT;
BEGIN
    -- Generate timestamp string
    timestamp_str := to_char(NOW(), 'YYYY/MM/DD');
    
    -- Generate random string
    random_str := encode(gen_random_bytes(8), 'hex');
    
    -- Build path
    IF subfolder IS NOT NULL THEN
        path := user_id::TEXT || '/' || subfolder || '/' || timestamp_str || '/' || random_str || '.' || file_extension;
    ELSE
        path := user_id::TEXT || '/' || timestamp_str || '/' || random_str || '.' || file_extension;
    END IF;
    
    RETURN path;
END;
$$ LANGUAGE plpgsql;

-- Function to validate file upload
CREATE OR REPLACE FUNCTION validate_file_upload(
    bucket_name TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    bucket_config RECORD;
    allowed_types TEXT[];
    max_size INTEGER;
BEGIN
    -- Get bucket configuration
    SELECT * INTO bucket_config FROM storage.buckets WHERE id = bucket_name;
    
    IF bucket_config IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check file size
    IF bucket_config.file_size_limit IS NOT NULL AND file_size > bucket_config.file_size_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Check MIME type
    IF bucket_config.allowed_mime_types IS NOT NULL THEN
        IF NOT (mime_type = ANY(bucket_config.allowed_mime_types)) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STORAGE USAGE TRACKING
-- =============================================

-- Create storage usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS storage_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Usage by bucket
    profile_images_size BIGINT DEFAULT 0,
    listing_images_size BIGINT DEFAULT 0,
    community_images_size BIGINT DEFAULT 0,
    chat_attachments_size BIGINT DEFAULT 0,
    verification_documents_size BIGINT DEFAULT 0,
    
    -- Total usage
    total_size BIGINT DEFAULT 0,
    
    -- Limits
    storage_limit BIGINT DEFAULT 104857600, -- 100MB default
    
    -- Timestamps
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Function to calculate user storage usage
CREATE OR REPLACE FUNCTION calculate_user_storage_usage(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    profile_images_total BIGINT := 0;
    listing_images_total BIGINT := 0;
    community_images_total BIGINT := 0;
    chat_attachments_total BIGINT := 0;
    verification_documents_total BIGINT := 0;
    total_usage BIGINT := 0;
BEGIN
    -- Calculate usage by bucket
    SELECT COALESCE(SUM(size), 0) INTO profile_images_total
    FROM storage.objects 
    WHERE bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = p_user_id::TEXT;
    
    SELECT COALESCE(SUM(size), 0) INTO listing_images_total
    FROM storage.objects 
    WHERE bucket_id = 'listing-images' 
    AND (storage.foldername(name))[1] = p_user_id::TEXT;
    
    SELECT COALESCE(SUM(size), 0) INTO community_images_total
    FROM storage.objects 
    WHERE bucket_id = 'community-images' 
    AND (storage.foldername(name))[1] = p_user_id::TEXT;
    
    SELECT COALESCE(SUM(size), 0) INTO chat_attachments_total
    FROM storage.objects 
    WHERE bucket_id = 'chat-attachments' 
    AND ((storage.foldername(name))[1] = p_user_id::TEXT OR (storage.foldername(name))[2] = p_user_id::TEXT);
    
    SELECT COALESCE(SUM(size), 0) INTO verification_documents_total
    FROM storage.objects 
    WHERE bucket_id = 'verification-documents' 
    AND (storage.foldername(name))[1] = p_user_id::TEXT;
    
    total_usage := profile_images_total + listing_images_total + community_images_total + chat_attachments_total + verification_documents_total;
    
    -- Update or insert usage record
    INSERT INTO storage_usage (
        user_id, profile_images_size, listing_images_size, community_images_size, 
        chat_attachments_size, verification_documents_size, total_size, last_calculated_at
    )
    VALUES (
        p_user_id, profile_images_total, listing_images_total, community_images_total,
        chat_attachments_total, verification_documents_total, total_usage, NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        profile_images_size = EXCLUDED.profile_images_size,
        listing_images_size = EXCLUDED.listing_images_size,
        community_images_size = EXCLUDED.community_images_size,
        chat_attachments_size = EXCLUDED.chat_attachments_size,
        verification_documents_size = EXCLUDED.verification_documents_size,
        total_size = EXCLUDED.total_size,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Indexes for storage usage
CREATE INDEX IF NOT EXISTS idx_storage_usage_user_id ON storage_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_total_size ON storage_usage(total_size);

-- Success message
SELECT 'Storage buckets, policies, and functions created successfully!' as status;
