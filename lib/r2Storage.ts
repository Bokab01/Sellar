import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base-64';

export interface R2UploadResult {
  url: string;
  path: string;
  cdnUrl: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string; // Global CDN URL if configured (e.g., cdn.sellar.app)
  bucketPublicUrls?: Record<string, string>; // Individual bucket public URLs
}

// R2 Bucket mapping
export const R2_BUCKETS = {
  LISTINGS: 'media-listings',
  VIDEOS: 'media-videos',
  COMMUNITY: 'media-community',
  CHAT: 'chat-attachments',
  VERIFICATION: 'verification-documents',
} as const;

class R2StorageService {
  private clients: Map<string, S3Client> = new Map();
  private config: R2Config | null = null;

  /**
   * Initialize R2 client with credentials
   */
  initialize(config: R2Config) {
    this.config = config;
  }

  /**
   * Get or create S3 client for R2
   */
  private getClient(bucket: string): S3Client {
    if (!this.config) {
      throw new Error('R2 Storage not initialized. Call initialize() first with your R2 credentials.');
    }

    if (!this.clients.has(bucket)) {
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });
      this.clients.set(bucket, client);
    }

    return this.clients.get(bucket)!;
  }

  /**
   * Get public URL for an uploaded file
   * Each R2 bucket has its own public URL when public access is enabled
   */
  getPublicUrl(bucket: string, path: string): string {
    if (!this.config) {
      throw new Error('R2 Storage not initialized');
    }

    console.log(`🔍 Generating R2 URL for bucket: ${bucket}`);
    console.log(`   bucketPublicUrls exists: ${!!this.config.bucketPublicUrls}`);
    console.log(`   bucketPublicUrls[${bucket}]: ${this.config.bucketPublicUrls?.[bucket] || 'undefined'}`);

    // Option 1: Use bucket-specific public URL if configured
    if (this.config.bucketPublicUrls && this.config.bucketPublicUrls[bucket]) {
      const url = `${this.config.bucketPublicUrls[bucket]}/${path}`;
      console.log(`✅ Using bucket-specific URL: ${url}`);
      return url;
    }
    
    // Option 2: Use global custom CDN domain with bucket in path
    if (this.config.publicUrl) {
      const url = `${this.config.publicUrl}/${bucket}/${path}`;
      console.log(`✅ Using global CDN URL: ${url}`);
      return url;
    }
    
    // Option 3: Fallback - construct URL using bucket subdomain format
    // Note: This may not work. You MUST configure bucket public URLs!
    console.warn(`⚠️ No public URL configured for bucket: ${bucket}`);
    console.warn('Add bucket public URLs to your .env file');
    console.warn('Example: EXPO_PUBLIC_R2_COMMUNITY_URL=https://pub-xxx.r2.dev');
    const fallbackUrl = `https://${bucket}.${this.config.accountId}.r2.dev/${path}`;
    console.log(`⚠️ Using fallback URL (may not work): ${fallbackUrl}`);
    return fallbackUrl;
  }

  /**
   * Generate a signed URL for private content (verification documents)
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    const client = this.getClient(bucket);
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    return await getSignedUrl(client, command, { expiresIn });
  }

  /**
   * Optimize image before upload (same as Supabase implementation)
   */
  private async optimizeImage(uri: string): Promise<string> {
    try {
      // Get file info to check size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists || !fileInfo.size) {
        return uri; // Return original if we can't get size
      }

      // Only optimize if file is larger than 500KB
      if (fileInfo.size < 500 * 1024) {
        return uri;
      }

      // Compress and resize image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1920 } }, // Max width 1920px (4K not needed for marketplace)
        ],
        {
          compress: 0.8, // 80% quality
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
   * Upload image to R2
   */
  async uploadImage(
    uri: string,
    bucket: string,
    folder: string = '',
    userId?: string,
    enableOptimization: boolean = true
  ): Promise<R2UploadResult> {
    try {
      // Optimize image if enabled
      let finalUri = uri;
      if (enableOptimization && !uri.includes('.gif')) {
        finalUri = await this.optimizeImage(uri);
      }

      // Read file data as base64
      const fileData = await FileSystem.readAsStringAsync(finalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array (React Native compatible)
      const binaryString = decode(fileData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = bytes;

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      
      let path: string;
      if (folder && userId) {
        path = `${folder}/${userId}/${timestamp}_${random}.${extension}`;
      } else if (folder) {
        path = `${folder}/${timestamp}_${random}.${extension}`;
      } else if (userId) {
        path = `${userId}/${timestamp}_${random}.${extension}`;
      } else {
        path = `${timestamp}_${random}.${extension}`;
      }

      // Determine content type
      const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const contentType = contentTypeMap[extension] || 'application/octet-stream';

      // Upload to R2
      const client = this.getClient(bucket);
      console.log(`📦 Uploading IMAGE to R2 bucket: ${bucket}, path: ${path}`);
      console.log(`   Content-Type: ${contentType}, Size: ${buffer.length} bytes`);
      
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
      });

      const response = await client.send(command);
      console.log(`✅ R2 IMAGE Upload response ETag:`, response.ETag);

      // Generate public URL
      const url = this.getPublicUrl(bucket, path);

      return {
        url,
        path,
        cdnUrl: url, // Same as url if no CDN configured
      };
    } catch (error) {
      console.error('R2 IMAGE upload failed:', error);
      throw new Error(`Failed to upload image to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload video to R2
   */
  async uploadVideo(
    uri: string,
    bucket: string,
    folder: string = '',
    userId?: string
  ): Promise<R2UploadResult> {
    try {
      // Read file data
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }

      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array (React Native compatible)
      const binaryString = decode(fileData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = bytes;

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = uri.split('.').pop()?.toLowerCase() || 'mp4';
      
      let path: string;
      if (folder && userId) {
        path = `${folder}/${userId}/${timestamp}_${random}.${extension}`;
      } else if (folder) {
        path = `${folder}/${timestamp}_${random}.${extension}`;
      } else if (userId) {
        path = `${userId}/${timestamp}_${random}.${extension}`;
      } else {
        path = `${timestamp}_${random}.${extension}`;
      }

      // Determine content type
      const contentTypeMap: Record<string, string> = {
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        webm: 'video/webm',
      };
      const contentType = contentTypeMap[extension] || 'video/mp4';

      // Upload to R2
      const client = this.getClient(bucket);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
      });

      await client.send(command);

      // Generate public URL
      const url = this.getPublicUrl(bucket, path);

      return {
        url,
        path,
        cdnUrl: url,
      };
    } catch (error) {
      console.error('R2 video upload failed:', error);
      throw new Error(`Failed to upload video to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple images in parallel
   */
  async uploadMultipleImages(
    uris: string[],
    bucket: string,
    folder: string = '',
    userId?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<R2UploadResult[]> {
    const results: R2UploadResult[] = [];
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
   * Delete file from R2
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const client = this.getClient(bucket);
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: path,
      });

      await client.send(command);
    } catch (error) {
      console.error('R2 delete failed:', error);
      throw new Error(`Failed to delete from R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(bucket: string, paths: string[]): Promise<void> {
    const deletePromises = paths.map(path => this.deleteFile(bucket, path));
    await Promise.all(deletePromises);
  }

  /**
   * Check if file exists
   */
  async fileExists(bucket: string, path: string): Promise<boolean> {
    try {
      const client = this.getClient(bucket);
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: path,
      });

      await client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(bucket: string, path: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  } | null> {
    try {
      const client = this.getClient(bucket);
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: path,
      });

      const response = await client.send(command);

      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
      };
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const r2Storage = new R2StorageService();

// Helper to initialize from environment variables
export function initializeR2FromEnv() {
  // Parse bucket-specific public URLs from environment
  const bucketPublicUrls: Record<string, string> = {};
  
  // Check for individual bucket URLs
  if (process.env.EXPO_PUBLIC_R2_LISTINGS_URL) {
    bucketPublicUrls['media-listings'] = process.env.EXPO_PUBLIC_R2_LISTINGS_URL;
  }
  if (process.env.EXPO_PUBLIC_R2_VIDEOS_URL) {
    bucketPublicUrls['media-videos'] = process.env.EXPO_PUBLIC_R2_VIDEOS_URL;
  }
  if (process.env.EXPO_PUBLIC_R2_COMMUNITY_URL) {
    bucketPublicUrls['media-community'] = process.env.EXPO_PUBLIC_R2_COMMUNITY_URL;
  }
  if (process.env.EXPO_PUBLIC_R2_CHAT_URL) {
    bucketPublicUrls['chat-attachments'] = process.env.EXPO_PUBLIC_R2_CHAT_URL;
  }

  const config: R2Config = {
    accountId: process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID || '',
    accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY || '',
    bucketName: 'sellar-media', // Default bucket
    publicUrl: process.env.EXPO_PUBLIC_R2_PUBLIC_URL, // Optional global CDN URL
    bucketPublicUrls: Object.keys(bucketPublicUrls).length > 0 ? bucketPublicUrls : undefined,
  };

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    console.warn('⚠️ R2 credentials not configured. R2 storage will not be available.');
    return false;
  }

  // Debug: Log what URLs are configured
  console.log('🔧 R2 Configuration:');
  console.log('   Account ID:', config.accountId ? '✅ Set' : '❌ Missing');
  console.log('   Global CDN URL:', config.publicUrl || '❌ Not set');
  console.log('   Bucket-specific URLs:');
  if (config.bucketPublicUrls) {
    Object.entries(config.bucketPublicUrls).forEach(([bucket, url]) => {
      console.log(`      ${bucket}: ${url}`);
    });
  } else {
    console.log('      ❌ None configured');
  }

  r2Storage.initialize(config);
  return true;
}

