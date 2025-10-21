import { hybridStorage } from '@/lib/hybridStorage';
import { STORAGE_BUCKETS } from '@/lib/storage';
import { SelectedImage } from '@/components/ImagePicker';

export interface ImageUploadProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface ImageUploadResult {
  urls: string[];
  error: Error | null;
}

export async function uploadListingImages(
  images: SelectedImage[],
  userId: string,
  onProgress?: (progress: ImageUploadProgress) => void
): Promise<ImageUploadResult> {
  try {
    const imageUrls: string[] = [];
    const totalImages = images.length;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Update progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: totalImages,
          percentage: Math.round(((i + 1) / totalImages) * 100),
        });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const extension = image.uri.split('.').pop() || 'jpg';
      const filename = `${userId}/${timestamp}_${random}.${extension}`;

      // Upload using hybrid storage (auto-routes to R2 for listings)
      const uploadResult = await hybridStorage.uploadImage(
        image.uri,
        STORAGE_BUCKETS.LISTINGS,
        'listing',
        userId
      );

      // uploadImage throws on error, so if we get here, it succeeded
      if (uploadResult.url) {
        imageUrls.push(uploadResult.url);
      }
    }

    return { urls: imageUrls, error: null };
  } catch (error) {
    console.error('Image upload error:', error);
    return { 
      urls: [], 
      error: error instanceof Error ? error : new Error('Failed to upload images') 
    };
  }
}

export async function deleteListingImages(imageUrls: string[]): Promise<void> {
  try {
    for (const url of imageUrls) {
      // Use hybrid storage which auto-detects provider from URL
      await hybridStorage.deleteFile(url, STORAGE_BUCKETS.LISTINGS);
    }
  } catch (error) {
    console.error('Failed to delete images:', error);
    // Don't throw - this is cleanup, not critical
  }
}

