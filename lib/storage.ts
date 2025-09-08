import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface UploadResult {
  url: string;
  path: string;
}

// Updated bucket names to match your Supabase setup
export const STORAGE_BUCKETS = {
  LISTINGS: 'listing-images',
  PROFILES: 'profile-images', 
  COMMUNITY: 'community-images',
  CHAT: 'chat-attachments',
  VERIFICATION: 'verification-documents'
} as const;

export const storageHelpers = {
  async uploadImage(
    uri: string, 
    bucket: string = STORAGE_BUCKETS.PROFILES, // Use profile-images as default
    folder: string = '',
    userId?: string,
    retries: number = 3,
    enableOptimization: boolean = true
  ): Promise<UploadResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${retries} for image: ${uri}`);
        
        // Get original image dimensions first
        const originalImageInfo = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
        
        // Calculate optimal dimensions while preserving aspect ratio
        const maxWidth = 1920;
        const maxHeight = 1920;
        
        let targetWidth = originalImageInfo.width;
        let targetHeight = originalImageInfo.height;
        
        // Only resize if the image is larger than our maximum dimensions
        if (originalImageInfo.width > maxWidth || originalImageInfo.height > maxHeight) {
          const aspectRatio = originalImageInfo.width / originalImageInfo.height;
          
          if (originalImageInfo.width > originalImageInfo.height) {
            // Landscape: limit by width
            targetWidth = maxWidth;
            targetHeight = Math.round(maxWidth / aspectRatio);
          } else {
            // Portrait or square: limit by height
            targetHeight = maxHeight;
            targetWidth = Math.round(maxHeight * aspectRatio);
          }
        }
        
        console.log(`Original: ${originalImageInfo.width}x${originalImageInfo.height}, Target: ${targetWidth}x${targetHeight}`);
        
        // Enhanced compression with aspect ratio preservation
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          uri,
          [
            { resize: { width: targetWidth, height: targetHeight } }, // Preserve aspect ratio
          ],
          {
            compress: 0.9, // Higher quality (0.9 instead of 0.85)
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        console.log('Image compressed successfully:', manipulatedImage.uri);

        // Generate unique filename based on bucket type
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        
        let filename: string;
        if (bucket === STORAGE_BUCKETS.LISTINGS) {
          filename = `${userId || 'anonymous'}/${folder || 'listing'}/${timestamp}_${randomId}.jpg`;
        } else if (bucket === STORAGE_BUCKETS.PROFILES) {
          filename = `avatars/${userId || 'anonymous'}/${timestamp}_${randomId}.jpg`;
        } else if (bucket === STORAGE_BUCKETS.COMMUNITY) {
          filename = `posts/${userId || 'anonymous'}/${folder || timestamp}/${timestamp}_${randomId}.jpg`;
        } else if (bucket === STORAGE_BUCKETS.CHAT) {
          filename = `${folder}/${userId || 'anonymous'}/${timestamp}_${randomId}.jpg`;
        } else if (bucket === STORAGE_BUCKETS.VERIFICATION) {
          filename = `${userId || 'anonymous'}/${timestamp}_${randomId}.jpg`;
        } else {
          filename = `${userId || 'anonymous'}/${timestamp}_${randomId}.jpg`;
        }

        // Check if we have a valid session first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No authenticated session found');
        }

        // Try direct file upload using the manipulated image URI
        console.log('Attempting direct file upload with filename:', filename);
        console.log('Image URI:', manipulatedImage.uri);
        
        // Create a file-like object from the URI
        const fileUri = manipulatedImage.uri;
        
        // Try using FileSystem upload for React Native
        try {
          console.log('Trying FileSystem upload method...');
          
          const { data: fsData, error: fsError } = await supabase.storage
            .from(bucket)
            .upload(filename, {
              uri: fileUri,
              type: 'image/jpeg',
              name: filename.split('/').pop() || 'image.jpg'
            } as any, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!fsError && fsData) {
            console.log('FileSystem upload successful:', fsData.path);
            
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(fsData.path);

            return {
              url: urlData.publicUrl,
              path: fsData.path,
            };
          }
          
          throw new Error(fsError?.message || 'FileSystem upload failed');
        } catch (fsUploadError) {
          console.log('FileSystem upload failed, trying alternative method...', fsUploadError);
        }

        // Alternative: Try reading file as base64 and uploading
        try {
          console.log('Trying base64 upload method...');
          
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          
          const { data: b64Data, error: b64Error } = await supabase.storage
            .from(bucket)
            .upload(filename, buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (!b64Error && b64Data) {
            console.log('Base64 upload successful:', b64Data.path);
            
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(b64Data.path);

            return {
              url: urlData.publicUrl,
              path: b64Data.path,
            };
          }
          
          throw new Error(b64Error?.message || 'Base64 upload failed');
        } catch (b64UploadError) {
          console.log('Base64 upload failed, trying blob method...', b64UploadError);
        }

        // If we reach here, all direct upload methods failed
        console.log('All direct upload methods failed, trying improved blob method...');
        
        // Improved fallback to blob method with better error handling
        try {
          // Try to read the file directly using FileSystem instead of fetch
          console.log('Reading file using FileSystem...');
          const fileInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
          
          if (!fileInfo.exists) {
            throw new Error('Manipulated image file does not exist');
          }
          
          console.log('File info:', fileInfo);
          
          // Read file as base64 and convert to Uint8Array
          const base64Data = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Convert base64 to Uint8Array
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          console.log('File converted to bytes, size:', bytes.length);
          
          const { data: blobData, error: blobError } = await supabase.storage
            .from(bucket)
            .upload(filename, bytes, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (blobError) {
            throw new Error(`Upload failed: ${blobError.message}`);
          }
          
          console.log('Blob upload successful:', blobData.path);
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(blobData.path);

          // Trigger image optimization pipeline if enabled
          if (enableOptimization && userId) {
            try {
              console.log('🔄 Triggering image optimization pipeline...');
              await triggerImageOptimization(bucket, blobData.path, userId);
            } catch (optimizationError) {
              console.warn('⚠️ Image optimization failed (non-critical):', optimizationError);
              // Don't fail the upload if optimization fails
            }
          }

          return {
            url: urlData.publicUrl,
            path: blobData.path,
          };
        } catch (fileSystemError) {
          console.log('FileSystem method failed, trying fetch with retry...', fileSystemError);
          
          // Last resort: try fetch with retry and better error handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // Increased timeout
          
          try {
            const response = await fetch(manipulatedImage.uri, {
              signal: controller.signal,
              headers: {
                'Accept': 'image/*',
              },
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            console.log('Image converted to blob, size:', blob.size);
            
            const { data: blobData, error: blobError } = await supabase.storage
              .from(bucket)
              .upload(filename, blob, {
                contentType: 'image/jpeg',
                upsert: true,
              });

            if (blobError) {
              throw new Error(`Upload failed: ${blobError.message}`);
            }
            
            console.log('Blob upload successful:', blobData.path);
            
            // Get public URL
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(blobData.path);

            return {
              url: urlData.publicUrl,
              path: blobData.path,
            };
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw new Error(`All upload methods failed. Last error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
          }
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Upload attempt ${attempt} failed:`, error);
        
        if (attempt === retries) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Upload failed after all retries');
  },

  async uploadMultipleImages(
    uris: string[],
    bucket: string = STORAGE_BUCKETS.LISTINGS,
    folder: string = '',
    userId?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    console.log(`Starting upload of ${uris.length} images`);
    
    for (let i = 0; i < uris.length; i++) {
      try {
        console.log(`Uploading image ${i + 1}/${uris.length}`);
        const result = await this.uploadImage(uris[i], bucket, folder, userId);
        results.push(result);
        
        // Report progress
        const progress = (i + 1) / uris.length;
        console.log(`Upload progress: ${Math.round(progress * 100)}%`);
        onProgress?.(progress);
      } catch (error) {
        console.error(`Failed to upload image ${i + 1}/${uris.length}:`, error);
        throw new Error(`Failed to upload image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`Successfully uploaded ${results.length} images`);
    return results;
  },

  async deleteImage(path: string, bucket: string = STORAGE_BUCKETS.LISTINGS): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Image delete error:', error);
      throw error;
    }
  },

  getImageUrl(path: string, bucket: string = STORAGE_BUCKETS.LISTINGS): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  },

  // Convenience methods for specific upload types
  async uploadListingImage(uri: string, userId: string, listingId?: string): Promise<UploadResult> {
    return this.uploadImage(uri, STORAGE_BUCKETS.LISTINGS, listingId || 'general', userId);
  },

  async uploadProfileAvatar(uri: string, userId: string): Promise<UploadResult> {
    return this.uploadImage(uri, STORAGE_BUCKETS.PROFILES, 'avatars', userId);
  },

  async uploadCommunityImage(uri: string, userId: string, postId?: string): Promise<UploadResult> {
    return this.uploadImage(uri, STORAGE_BUCKETS.COMMUNITY, postId || 'general', userId);
  },

  async uploadChatAttachment(uri: string, userId: string, conversationId: string): Promise<UploadResult> {
    return this.uploadImage(uri, STORAGE_BUCKETS.CHAT, conversationId, userId);
  },

  async uploadVerificationDocument(uri: string, userId: string): Promise<UploadResult> {
    return this.uploadImage(uri, STORAGE_BUCKETS.VERIFICATION, '', userId);
  },

  // Test storage connectivity
  async testStorageConnection(): Promise<{ success: boolean; error?: string; buckets?: string[] }> {
    try {
      // Instead of listing buckets (which anon users can't do), 
      // test by trying to access each required bucket directly
      const requiredBuckets = Object.values(STORAGE_BUCKETS);
      const workingBuckets: string[] = [];
      const failedBuckets: string[] = [];
      
      console.log('Testing storage buckets individually...');
      
      for (const bucket of requiredBuckets) {
        try {
          // Try to list files in the bucket (this should work if bucket exists and has proper policies)
          const { data, error } = await supabase.storage
            .from(bucket)
            .list('', { limit: 1 });
          
          if (error) {
            // If error is about permissions, bucket exists but we can't access it
            if (error.message.includes('not found') || error.message.includes('does not exist')) {
              failedBuckets.push(bucket);
              console.log(`❌ Bucket ${bucket}: Does not exist`);
            } else {
              // Other errors might be permission-related but bucket exists
              workingBuckets.push(bucket);
              console.log(`✅ Bucket ${bucket}: Exists (${error.message})`);
            }
          } else {
            workingBuckets.push(bucket);
            console.log(`✅ Bucket ${bucket}: Accessible`);
          }
        } catch (err) {
          failedBuckets.push(bucket);
          console.log(`❌ Bucket ${bucket}: Error - ${err instanceof Error ? err.message : 'Unknown'}`);
        }
      }
      
      if (workingBuckets.length === 0) {
        return { 
          success: false, 
          error: `No working buckets found. Failed: ${failedBuckets.join(', ')}`,
          buckets: workingBuckets 
        };
      }
      
      if (failedBuckets.length > 0) {
        return { 
          success: true, 
          error: `Some buckets unavailable: ${failedBuckets.join(', ')}`,
          buckets: workingBuckets 
        };
      }

      return { success: true, buckets: workingBuckets };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
};

// Helper function to trigger image optimization
async function triggerImageOptimization(bucket: string, path: string, userId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn('No session available for image optimization');
      return;
    }

    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/image-optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        bucket,
        originalPath: path,
        userId,
        options: {
          generateSizes: true,
          formats: ['jpeg', 'webp'],
          quality: 85
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Optimization failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Image optimization completed:', result.message);
  } catch (error) {
    console.error('Image optimization error:', error);
    throw error;
  }
}