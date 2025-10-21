import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export interface R2UploadResult {
  url: string;
  path: string;
  cdnUrl: string;
}

// R2 Bucket mapping (Supabase bucket name -> R2 bucket name)
export const R2_BUCKETS = {
  LISTINGS: 'media-listings',
  VIDEOS: 'media-videos',
  COMMUNITY: 'media-community',
  CHAT: 'chat-attachments',
  VERIFICATION: 'verification-documents',
} as const;

/**
 * Secure R2 Storage Service using Supabase Edge Functions
 * - No credentials exposed in client
 * - All operations authenticated
 * - Automatic audit logging
 */
class R2StorageServiceSecure {
  private edgeFunctionUrl: string;

  constructor() {
    this.edgeFunctionUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  }

  /**
   * Optimize image before upload
   */
  private async optimizeImage(uri: string): Promise<string> {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1920 } }], // Max width 1920px
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipResult.uri;
    } catch (error) {
      console.error('Image optimization failed, using original:', error);
      return uri; // Fallback to original on error
    }
  }

  /**
   * Upload image to R2 via Edge Function
   */
  async uploadImage(
    uri: string,
    bucket: string,
    folder: string = '',
    userId?: string,
    enableOptimization: boolean = true
  ): Promise<R2UploadResult> {
    try {
      console.log('📤 [Secure] Uploading image via Edge Function...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please sign in.');
      }

      if (!userId) {
        userId = session.user.id;
      }

      // Optimize image if enabled
      let finalUri = uri;
      if (enableOptimization && !uri.includes('.gif')) {
        finalUri = await this.optimizeImage(uri);
      }

      // Read file as base64
      const fileData = await FileSystem.readAsStringAsync(finalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(finalUri);
      const fileName = uri.split('/').pop() || 'image.jpg';
      const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      
      const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const contentType = contentTypeMap[extension] || 'image/jpeg';

      // Get file size (type-safe)
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      console.log('📦 File info:', {
        bucket,
        folder,
        userId,
        size: fileSize,
        type: contentType,
      });

      // Call Edge Function
      const response = await fetch(
        `${this.edgeFunctionUrl}/functions/v1/r2-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: fileData,
            bucket,
            folder,
            userId,
            fileName,
            contentType,
            fileSize,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Upload failed';
        
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        console.error('❌ Edge Function error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
        });
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ [Secure] Upload successful!');
      console.log('🔗 URL:', result.url);

      return {
        url: result.url,
        path: result.path,
        cdnUrl: result.cdnUrl || result.url,
      };
    } catch (error) {
      console.error('❌ [Secure] Upload failed:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    uris: string[],
    bucket: string,
    folder: string = '',
    userId?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<R2UploadResult[]> {
    const results: R2UploadResult[] = [];
    
    for (let i = 0; i < uris.length; i++) {
      try {
        const result = await this.uploadImage(uris[i], bucket, folder, userId);
        results.push(result);
        onProgress?.(i + 1, uris.length);
      } catch (error) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Delete file from R2 via Edge Function
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      console.log('🗑️ [Secure] Deleting file via Edge Function...', { bucket, path });

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please sign in.');
      }

      // Call Edge Function
      const response = await fetch(
        `${this.edgeFunctionUrl}/functions/v1/r2-delete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucket,
            path,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      console.log('✅ [Secure] File deleted successfully');
    } catch (error) {
      console.error('❌ [Secure] Delete failed:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public URL for a file (for display purposes)
   * Note: This doesn't verify the file exists, it just constructs the URL
   */
  getPublicUrl(bucket: string, path: string): string {
    // Map Supabase bucket names to R2 bucket names
    const R2_BUCKET_MAPPING: Record<string, string> = {
      'listing-images': 'media-listings',
      'community-images': 'media-community',
      'chat-attachments': 'chat-attachments',
      'sellar-pro-videos': 'media-videos',
    };

    const r2Bucket = R2_BUCKET_MAPPING[bucket] || bucket;
    
    // Get the bucket URL from environment
    const bucketUrlKey = `R2_${r2Bucket.toUpperCase().replace(/-/g, '_')}_URL`;
    const bucketUrl = process.env[`EXPO_PUBLIC_${bucketUrlKey}`];
    
    if (!bucketUrl) {
      console.warn(`⚠️ No public URL configured for bucket: ${r2Bucket}`);
      return `https://pub-placeholder.r2.dev/${path}`;
    }

    return `${bucketUrl}/${path}`;
  }

  /**
   * Get signed URL for private files (e.g., verification documents)
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    try {
      console.log('🔐 [Secure] Getting signed URL via Edge Function...');

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Not authenticated. Please sign in.');
      }

      // Call Edge Function
      const response = await fetch(
        `${this.edgeFunctionUrl}/functions/v1/r2-signed-url`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucket,
            path,
            expiresIn,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get signed URL');
      }

      const result = await response.json();
      console.log('✅ [Secure] Signed URL generated');

      return result.url;
    } catch (error) {
      console.error('❌ [Secure] Failed to get signed URL:', error);
      throw new Error(`Failed to get signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload video (Note: Videos should be uploaded to Supabase due to memory constraints)
   * This is a placeholder for when chunked upload is implemented
   */
  async uploadVideo(
    uri: string,
    bucket: string,
    folder: string = '',
    userId?: string
  ): Promise<R2UploadResult> {
    // For now, videos are not supported via Edge Functions due to size
    // They should continue to use direct Supabase upload
    throw new Error('Video upload via Edge Functions not yet implemented. Use Supabase for videos.');
  }
}

// Export singleton instance
export const r2StorageSecure = new R2StorageServiceSecure();

// Backward compatibility: export as r2Storage
export const r2Storage = r2StorageSecure;

