import { storageHelpers } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export async function testStorageConnection(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('🔍 Testing storage connection...');
    
    // Test 1: Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return {
        success: false,
        error: 'Not authenticated',
        details: { authError, hasSession: !!session }
      };
    }
    
    console.log('✅ Authentication check passed');
    
    // Test 2: Test storage connectivity
    const storageTest = await storageHelpers.testStorageConnection();
    if (!storageTest.success) {
      return {
        success: false,
        error: storageTest.error,
        details: storageTest
      };
    }
    
    console.log('✅ Storage connectivity test passed');
    
    // Test 3: Try to list files in listing-images bucket (should be accessible)
    const { data: listData, error: listError } = await supabase.storage
      .from('listing-images')
      .list('', { limit: 1 });
    
    if (listError) {
      return {
        success: false,
        error: `Bucket access test failed: ${listError.message}`,
        details: { listError, buckets: storageTest.buckets }
      };
    }
    
    console.log('✅ Bucket access test passed');
    
    return {
      success: true,
      details: {
        buckets: storageTest.buckets,
        canListFiles: true,
        userId: session.user.id
      }
    };
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: { error }
    };
  }
}

export async function testImageUpload(): Promise<{
  success: boolean;
  error?: string;
  url?: string;
}> {
  try {
    console.log('🔍 Testing image upload...');
    
    // Create a simple test image (1x1 pixel JPEG)
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
    
    // Convert base64 to Uint8Array
    const binaryString = atob(testImageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Generate test filename
    const filename = `test/test_${Date.now()}.jpg`;
    
    // Try upload
    const { data, error } = await supabase.storage
      .from('listing-images')
      .upload(filename, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    
    if (error) {
      return {
        success: false,
        error: `Upload test failed: ${error.message}`
      };
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('listing-images')
      .getPublicUrl(data.path);
    
    // Clean up test file
    try {
      await supabase.storage
        .from('listing-images')
        .remove([data.path]);
    } catch (cleanupError) {
      console.warn('Failed to clean up test file:', cleanupError);
    }
    
    console.log('✅ Image upload test passed');
    
    return {
      success: true,
      url: urlData.publicUrl
    };
    
  } catch (error) {
    console.error('❌ Image upload test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
