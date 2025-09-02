-- =============================================
-- STORAGE POLICIES SETUP MIGRATION
-- Sets up RLS policies for all storage buckets
-- =============================================

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Public read access for listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

DROP POLICY IF EXISTS "Public read access for profile-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;

DROP POLICY IF EXISTS "Public read access for community-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own community images" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;

DROP POLICY IF EXISTS "Users can only access own verification documents" ON storage.objects;

-- =============================================
-- LISTING-IMAGES BUCKET POLICIES
-- =============================================

-- Allow public read access to listing images
CREATE POLICY "Public read access for listing-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'listing-images');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow users to update their own listing images
CREATE POLICY "Users can update own listing images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow users to delete their own listing images
CREATE POLICY "Users can delete own listing images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'listing-images' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- =============================================
-- PROFILE-IMAGES BUCKET POLICIES
-- =============================================

-- Allow public read access to profile images
CREATE POLICY "Public read access for profile-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'profile-images');

-- Allow users to manage their own profile images
CREATE POLICY "Users can manage own profile images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.role() = 'authenticated'
  AND (
    (string_to_array(name, '/'))[1] = 'avatars' AND (string_to_array(name, '/'))[2] = auth.uid()::text
    OR (string_to_array(name, '/'))[1] = 'covers' AND (string_to_array(name, '/'))[2] = auth.uid()::text
    OR (string_to_array(name, '/'))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can update own profile images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'profile-images' 
  AND (
    auth.uid()::text = (string_to_array(name, '/'))[2]
    OR auth.uid()::text = (string_to_array(name, '/'))[1]
  )
);

CREATE POLICY "Users can delete own profile images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'profile-images' 
  AND (
    auth.uid()::text = (string_to_array(name, '/'))[2]
    OR auth.uid()::text = (string_to_array(name, '/'))[1]
  )
);

-- =============================================
-- COMMUNITY-IMAGES BUCKET POLICIES
-- =============================================

-- Allow public read access to community images
CREATE POLICY "Public read access for community-images" ON storage.objects 
FOR SELECT USING (bucket_id = 'community-images');

-- Allow authenticated users to upload community images to their own folder
CREATE POLICY "Authenticated users can upload community images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'community-images' 
  AND auth.role() = 'authenticated'
  AND (
    (string_to_array(name, '/'))[1] = 'posts' AND (string_to_array(name, '/'))[2] = auth.uid()::text
    OR (string_to_array(name, '/'))[1] = auth.uid()::text
  )
);

-- Allow users to update their own community images
CREATE POLICY "Users can update own community images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'community-images' 
  AND (
    auth.uid()::text = (string_to_array(name, '/'))[2]
    OR auth.uid()::text = (string_to_array(name, '/'))[1]
  )
);

-- Allow users to delete their own community images
CREATE POLICY "Users can delete own community images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'community-images' 
  AND (
    auth.uid()::text = (string_to_array(name, '/'))[2]
    OR auth.uid()::text = (string_to_array(name, '/'))[1]
  )
);

-- =============================================
-- CHAT-ATTACHMENTS BUCKET POLICIES
-- =============================================

-- Allow authenticated users to read chat attachments (simplified for now)
CREATE POLICY "Authenticated users can read chat attachments" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'chat-attachments'
  AND auth.role() = 'authenticated'
);

-- Allow users to upload chat attachments to their own folder
CREATE POLICY "Users can upload chat attachments" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.role() = 'authenticated'
  AND (
    (string_to_array(name, '/'))[2] = auth.uid()::text
    OR (string_to_array(name, '/'))[1] = auth.uid()::text
  )
);

-- Allow users to delete their own chat attachments
CREATE POLICY "Users can delete own chat attachments" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'chat-attachments' 
  AND (
    auth.uid()::text = (string_to_array(name, '/'))[2]
    OR auth.uid()::text = (string_to_array(name, '/'))[1]
  )
);

-- =============================================
-- VERIFICATION-DOCUMENTS BUCKET POLICIES
-- =============================================

-- Private access only - users can only access their own verification documents
CREATE POLICY "Users can only access own verification documents" ON storage.objects 
FOR ALL USING (
  bucket_id = 'verification-documents'
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- =============================================
-- COMMENTS
-- =============================================

/*
Expected folder structure after this migration:

listing-images/
├── {user_id}/
│   ├── {listing_id}/
│   │   ├── image1.jpg
│   │   └── image2.jpg

profile-images/
├── avatars/
│   └── {user_id}/
│       └── avatar.jpg
├── covers/
│   └── {user_id}/
│       └── cover.jpg
├── {user_id}/
│   └── profile_pic.jpg

community-images/
├── posts/
│   └── {user_id}/
│       ├── {post_id}/
│       │   └── image.jpg
├── {user_id}/
│   └── post_image.jpg

chat-attachments/
├── {conversation_id}/
│   └── {user_id}/
│       └── attachment.jpg
├── {user_id}/
│   └── chat_file.jpg

verification-documents/
├── {user_id}/
│   ├── id_document.jpg
│   └── business_license.pdf
*/
