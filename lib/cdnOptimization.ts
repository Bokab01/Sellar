import { supabase } from './supabase';

export interface CDNOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

export class CDNOptimization {
  private static readonly CDN_BASE_URL = 'https://your-project.supabase.co/storage/v1/render/image/public';
  private static readonly CACHE_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Generate optimized image URL with CDN caching
   */
  static getOptimizedUrl(
    bucket: string, 
    path: string, 
    options: CDNOptions = {}
  ): string {
    const {
      width = 300,
      height = 300,
      quality = 80,
      format = 'webp',
      resize = 'cover'
    } = options;

    // Use Supabase's built-in image transformation
    const baseUrl = `${this.CDN_BASE_URL}/${bucket}/${path}`;
    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      quality: quality.toString(),
      format,
      resize
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get responsive image URLs for different screen sizes
   */
  static getResponsiveUrls(bucket: string, path: string) {
    return {
      thumbnail: this.getOptimizedUrl(bucket, path, { width: 150, height: 150, quality: 60 }),
      small: this.getOptimizedUrl(bucket, path, { width: 300, height: 300, quality: 70 }),
      medium: this.getOptimizedUrl(bucket, path, { width: 600, height: 600, quality: 80 }),
      large: this.getOptimizedUrl(bucket, path, { width: 1200, height: 1200, quality: 85 })
    };
  }

  /**
   * Get the best image URL based on screen size and network quality
   */
  static getBestImageUrl(
    bucket: string, 
    path: string, 
    targetWidth: number,
    networkQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'good'
  ): string {
    const qualityMap = {
      poor: 50,
      fair: 60,
      good: 80,
      excellent: 90
    };

    return this.getOptimizedUrl(bucket, path, {
      width: targetWidth,
      height: targetWidth,
      quality: qualityMap[networkQuality],
      format: 'webp'
    });
  }
}

// Usage examples:
export const getListingImageUrl = (path: string, size: 'thumbnail' | 'medium' | 'large' = 'medium') => {
  const sizes = {
    thumbnail: { width: 150, height: 150, quality: 60 },
    medium: { width: 600, height: 600, quality: 80 },
    large: { width: 1200, height: 1200, quality: 85 }
  };
  
  return CDNOptimization.getOptimizedUrl('listing-images', path, sizes[size]);
};

export const getProfileImageUrl = (path: string, size: 'small' | 'medium' | 'large' = 'medium') => {
  const sizes = {
    small: { width: 100, height: 100, quality: 70 },
    medium: { width: 200, height: 200, quality: 80 },
    large: { width: 400, height: 400, quality: 90 }
  };
  
  return CDNOptimization.getOptimizedUrl('profile-images', path, sizes[size]);
};
