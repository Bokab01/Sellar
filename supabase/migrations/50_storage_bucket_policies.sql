-- Storage Bucket Policies for Sellar Mobile App
-- Configure proper access policies for all storage buckets

-- =============================================
-- VERIFICATION DOCUMENTS BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload verification documents
CREATE POLICY "Authenticated users can upload verification documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'verification-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view their own verification documents
CREATE POLICY "Users can view their own verification documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own verification documents
CREATE POLICY "Users can update their own verification documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own verification documents
CREATE POLICY "Users can delete their own verification documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'verification-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- LISTING IMAGES BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload listing images
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to listing images
CREATE POLICY "Anyone can view listing images" ON storage.objects
FOR SELECT USING (bucket_id = 'listing-images');

-- Allow users to update their own listing images
CREATE POLICY "Users can update their own listing images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own listing images
CREATE POLICY "Users can delete their own listing images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- PROFILE IMAGES BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload profile images
CREATE POLICY "Authenticated users can upload profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to profile images
CREATE POLICY "Anyone can view profile images" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-images');

-- Allow users to update their own profile images
CREATE POLICY "Users can update their own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own profile images
CREATE POLICY "Users can delete their own profile images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- =============================================
-- COMMUNITY IMAGES BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload community images
CREATE POLICY "Authenticated users can upload community images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'community-images' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to community images
CREATE POLICY "Anyone can view community images" ON storage.objects
FOR SELECT USING (bucket_id = 'community-images');

-- Allow users to update their own community images
CREATE POLICY "Users can update their own community images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'community-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own community images
CREATE POLICY "Users can delete their own community images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'community-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- =============================================
-- CHAT ATTACHMENTS BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload chat attachments
CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view chat attachments in their conversations
CREATE POLICY "Users can view chat attachments in their conversations" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to update their own chat attachments
CREATE POLICY "Users can update their own chat attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own chat attachments
CREATE POLICY "Users can delete their own chat attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- =============================================
-- SELLAR PRO VIDEOS BUCKET POLICIES
-- =============================================

-- Allow authenticated users to upload pro videos
CREATE POLICY "Authenticated users can upload pro videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'sellar-pro-videos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view their own pro videos
CREATE POLICY "Users can view their own pro videos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'sellar-pro-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own pro videos
CREATE POLICY "Users can update their own pro videos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'sellar-pro-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own pro videos
CREATE POLICY "Users can delete their own pro videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'sellar-pro-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
