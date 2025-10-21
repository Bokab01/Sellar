import { r2StorageSecure as r2Storage, R2_BUCKETS } from './r2StorageSecure';
import { storageHelpers, STORAGE_BUCKETS } from './storage';

export interface HybridUploadResult {
  url: string;
  path: string;
  provider: 'supabase' | 'r2';
  cdnUrl?: string;
}

type StorageProvider = 'supabase' | 'r2' | 'r2-private';

/**
 * Hybrid Storage Router
 * Routes storage operations to either Supabase or Cloudflare R2 based on content type
 */
class HybridStorageService {
  private isR2Initialized = true; // Always true with secure Edge Functions

  constructor() {
    console.log('✅ Hybrid Storage initialized - using secure R2 via Edge Functions');
  }

  /**
   * Determine which storage provider to use based on bucket type
   */
  private getStorageProvider(bucket: string): StorageProvider {
    // Profile images always stay on Supabase (integrated with auth, low volume)
    if (bucket === STORAGE_BUCKETS.PROFILES) {
      return 'supabase';
    }

    // Verification documents use R2 private bucket (secure, signed URLs)
    if (bucket === STORAGE_BUCKETS.VERIFICATION) {
      return this.isR2Initialized ? 'r2-private' : 'supabase';
    }

    // Everything else goes to R2 if available
    // - Listing images (high volume)
    // - Community images (high volume)
    // - Chat attachments (high volume)
    // - PRO videos (large files, bandwidth intensive)
    if (this.isR2Initialized) {
      return 'r2';
    }

    // Fallback to Supabase if R2 is not configured
    console.warn(`⚠️ R2 not configured, falling back to Supabase for bucket: ${bucket}`);
    return 'supabase';
  }

  /**
   * Map Supabase bucket names to R2 bucket names
   */
  private mapToR2Bucket(supabaseBucket: string): string {
    const mapping: Record<string, string> = {
      [STORAGE_BUCKETS.LISTINGS]: R2_BUCKETS.LISTINGS,
      [STORAGE_BUCKETS.PRO_VIDEOS]: R2_BUCKETS.VIDEOS,
      [STORAGE_BUCKETS.COMMUNITY]: R2_BUCKETS.COMMUNITY,
      [STORAGE_BUCKETS.CHAT]: R2_BUCKETS.CHAT,
      [STORAGE_BUCKETS.VERIFICATION]: R2_BUCKETS.VERIFICATION,
    };

    return mapping[supabaseBucket] || R2_BUCKETS.LISTINGS; // Default to listings bucket
  }

  /**
   * Helper to detect if file is a video
   */
  private isVideoFile(uri: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.m4v', '.avi', '.wmv', '.flv', '.webm'];
    const lowerUri = uri.toLowerCase();
    return videoExtensions.some(ext => lowerUri.includes(ext));
  }

  /**
   * Upload image with automatic routing
   * Automatically detects and routes videos to uploadVideo()
   */
  async uploadImage(
    uri: string,
    bucket: string,
    folder: string = '',
    userId?: string,
    enableOptimization: boolean = true
  ): Promise<HybridUploadResult> {
    console.log(`📤 Uploading image - Bucket: ${bucket}, Folder: ${folder}`);
    
    // Check if this is a video file
    if (this.isVideoFile(uri)) {
      console.log('🎬 Detected video file, using video upload method');
      return this.uploadVideo(uri, bucket, folder, userId);
    }

    const provider = this.getStorageProvider(bucket);
    console.log(`📍 Using provider: ${provider}`);

    try {
      if (provider === 'supabase') {
        // Use Supabase storage
        const result = await storageHelpers.uploadImage(
          uri,
          bucket,
          folder,
          userId,
          3, // retries
          enableOptimization
        );

        return {
          url: result.url,
          path: result.path,
          provider: 'supabase',
        };
      } else {
        // Use R2 storage (send original Supabase bucket name, Edge Function will map it)
        const result = await r2Storage.uploadImage(
          uri,
          bucket, // Send original bucket name, not R2 bucket name
          folder,
          userId,
          enableOptimization
        );

        console.log(`✅ Upload successful to R2!`);
        console.log(`📸 Image URL: ${result.url}`);
        
        return {
          url: result.url,
          path: result.path,
          provider: 'r2',
          cdnUrl: result.cdnUrl,
        };
      }
    } catch (error) {
      console.error(`❌ Upload failed for provider ${provider}:`, error);
      
      // Fallback to Supabase if R2 fails
      if (provider === 'r2') {
        console.warn('⚠️ R2 upload failed, falling back to Supabase');
        const result = await storageHelpers.uploadImage(
          uri,
          bucket,
          folder,
          userId,
          3,
          enableOptimization
        );

        return {
          url: result.url,
          path: result.path,
          provider: 'supabase',
        };
      }

      throw error;
    }
  }

  /**
   * Upload video with automatic routing
   */
  async uploadVideo(
    uri: string,
    bucket: string,
    folder: string = '',
    userId?: string
  ): Promise<HybridUploadResult> {
    const provider = this.getStorageProvider(bucket);

    // For now, videos always use Supabase due to memory constraints with R2
    // R2 requires loading entire file into memory which causes OOM for large videos
    // TODO: Implement chunked upload or use Cloudflare Stream for videos
    console.log(`📹 Uploading video to Supabase (R2 video upload requires chunked implementation)`);
    
    try {
      const result = await storageHelpers.uploadVideo(
        uri,
        bucket,
        folder,
        userId
      );

      return {
        url: result.url,
        path: result.path,
        provider: 'supabase',
      };
    } catch (error) {
      console.error(`Video upload failed:`, error);
      throw error;
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
  ): Promise<HybridUploadResult[]> {
    const provider = this.getStorageProvider(bucket);
    const results: HybridUploadResult[] = [];
    const total = uris.length;

    for (let i = 0; i < uris.length; i++) {
      const result = await this.uploadImage(uris[i], bucket, folder, userId);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return results;
  }

  /**
   * Delete file with automatic routing
   */
  async deleteFile(url: string, bucket: string): Promise<void> {
    // Determine provider from URL
    const isR2Url = url.includes('.r2.') || url.includes('cdn.sellar.app');
    
    if (isR2Url) {
      // Extract path from R2 URL
      const urlParts = url.split('/');
      const r2Bucket = urlParts[urlParts.length - 2];
      const path = urlParts[urlParts.length - 1];
      
      await r2Storage.deleteFile(r2Bucket, path);
    } else {
      // Use Supabase storage
      const path = url.split(`/${bucket}/`).pop();
      if (path) {
        await storageHelpers.deleteImage(path, bucket);
      }
    }
  }

  /**
   * Get signed URL for private content (verification documents)
   */
  async getSignedUrl(
    path: string,
    bucket: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const provider = this.getStorageProvider(bucket);

    if (provider === 'r2' || provider === 'r2-private') {
      // Send original bucket name to Edge Function
      return await r2Storage.getSignedUrl(bucket, path, expiresIn);
    } else {
      // Use Supabase signed URL
      const { data } = await import('./supabase').then(m => m.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)
      );
      
      return data?.signedUrl || '';
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string, bucket: string): string {
    const provider = this.getStorageProvider(bucket);

    if (provider === 'r2' || provider === 'r2-private') {
      // Send original bucket name (but getPublicUrl needs R2 bucket for URL construction)
      const r2Bucket = this.mapToR2Bucket(bucket);
      return r2Storage.getPublicUrl(r2Bucket, path);
    } else {
      return storageHelpers.getImageUrl(path, bucket);
    }
  }

  /**
   * Check if R2 is available
   */
  isR2Available(): boolean {
    return this.isR2Initialized;
  }

  /**
   * Get storage provider for a bucket
   */
  getProviderForBucket(bucket: string): StorageProvider {
    return this.getStorageProvider(bucket);
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    r2Available: boolean;
    profilesProvider: string;
    listingsProvider: string;
    communityProvider: string;
    chatProvider: string;
    videosProvider: string;
    verificationProvider: string;
  } {
    return {
      r2Available: this.isR2Initialized,
      profilesProvider: this.getStorageProvider(STORAGE_BUCKETS.PROFILES),
      listingsProvider: this.getStorageProvider(STORAGE_BUCKETS.LISTINGS),
      communityProvider: this.getStorageProvider(STORAGE_BUCKETS.COMMUNITY),
      chatProvider: this.getStorageProvider(STORAGE_BUCKETS.CHAT),
      videosProvider: this.getStorageProvider(STORAGE_BUCKETS.PRO_VIDEOS),
      verificationProvider: this.getStorageProvider(STORAGE_BUCKETS.VERIFICATION),
    };
  }
}

// Export singleton instance
export const hybridStorage = new HybridStorageService();

// Export convenience methods that match the existing storageHelpers API
export const uploadImage = hybridStorage.uploadImage.bind(hybridStorage);
export const uploadVideo = hybridStorage.uploadVideo.bind(hybridStorage);
export const uploadMultipleImages = hybridStorage.uploadMultipleImages.bind(hybridStorage);
export const deleteFile = hybridStorage.deleteFile.bind(hybridStorage);
export const getPublicUrl = hybridStorage.getPublicUrl.bind(hybridStorage);
export const getSignedUrl = hybridStorage.getSignedUrl.bind(hybridStorage);

