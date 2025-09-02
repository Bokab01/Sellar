-- =============================================
-- SUPABASE STORAGE BUCKET POLICIES
-- Run these in Supabase SQL Editor AFTER creating buckets via dashboard
-- =============================================

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- LISTINGS BUCKET POLICIES
-- =============================================

-- Allow public read access to listings
CREATE POLICY "Public read access for listings" ON storage.objects 
FOR SELECT USING (bucket_id = 'listings');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload listings" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'listings' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update own listing files" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'listings' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own listing files" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'listings' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- =============================================
-- PROFILES BUCKET POLICIES
-- =============================================

-- Allow public read access to profile images
CREATE POLICY "Public read access for profiles" ON storage.objects 
FOR SELECT USING (bucket_id = 'profiles');

-- Allow users to manage their own profile images
CREATE POLICY "Users can manage own profile images" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'profiles' 
  AND auth.role() = 'authenticated'
  AND (
    (string_to_array(name, '/'))[1] = 'avatars' AND (string_to_array(name, '/'))[2] = auth.uid()::text
    OR (string_to_array(name, '/'))[1] = 'covers' AND (string_to_array(name, '/'))[2] = auth.uid()::text
  )
);

CREATE POLICY "Users can update own profile images" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

CREATE POLICY "Users can delete own profile images" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- =============================================
-- COMMUNITY BUCKET POLICIES
-- =============================================

-- Allow public read access to community posts
CREATE POLICY "Public read access for community" ON storage.objects 
FOR SELECT USING (bucket_id = 'community');

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload community content" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'community' 
  AND auth.role() = 'authenticated'
  AND (string_to_array(name, '/'))[2] = auth.uid()::text
);

-- Allow users to update their own community files
CREATE POLICY "Users can update own community files" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'community' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Allow users to delete their own community files
CREATE POLICY "Users can delete own community files" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'community' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- =============================================
-- VERIFICATION POLICIES (for private documents)
-- =============================================

-- Create a private verification folder policy
CREATE POLICY "Users can only access own verification documents" ON storage.objects 
FOR ALL USING (
  bucket_id = 'profiles'
  AND (string_to_array(name, '/'))[1] = 'verification'
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);
