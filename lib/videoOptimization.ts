import { supabase } from './supabase';

export interface VideoOptimizationOptions {
  quality?: 'low' | 'medium' | 'high';
  maxWidth?: number;
  maxHeight?: number;
  bitrate?: number;
  format?: 'mp4' | 'webm';
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

export interface VideoOptimizationResult {
  originalUrl: string;
  optimizedUrl: string;
  thumbnailUrl?: string;
  compressionRatio: number;
  sizeReduction: number;
}

export class VideoOptimization {
  private static readonly CDN_BASE_URL = 'https://your-project.supabase.co/storage/v1/render/video/public';
  private static readonly THUMBNAIL_BASE_URL = 'https://your-project.supabase.co/storage/v1/render/image/public';

  /**
   * Generate optimized video URL with CDN compression
   */
  static getOptimizedVideoUrl(
    bucket: string,
    path: string,
    options: VideoOptimizationOptions = {}
  ): string {
    const {
      quality = 'medium',
      maxWidth = 1280,
      maxHeight = 720,
      bitrate = 1000,
      format = 'mp4'
    } = options;

    const qualityMap = {
      low: { bitrate: 500, maxWidth: 640, maxHeight: 360 },
      medium: { bitrate: 1000, maxWidth: 1280, maxHeight: 720 },
      high: { bitrate: 2000, maxWidth: 1920, maxHeight: 1080 }
    };

    const settings = qualityMap[quality];
    
    const baseUrl = `${this.CDN_BASE_URL}/${bucket}/${path}`;
    const params = new URLSearchParams({
      width: settings.maxWidth.toString(),
      height: settings.maxHeight.toString(),
      bitrate: settings.bitrate.toString(),
      format,
      quality: quality
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate video thumbnail URL
   */
  static getVideoThumbnailUrl(
    bucket: string,
    path: string,
    timestamp: number = 1, // seconds
    size: number = 300
  ): string {
    const baseUrl = `${this.THUMBNAIL_BASE_URL}/${bucket}/${path}`;
    const params = new URLSearchParams({
      width: size.toString(),
      height: size.toString(),
      timestamp: timestamp.toString(),
      quality: '80'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Get responsive video URLs for different qualities
   */
  static getResponsiveVideoUrls(bucket: string, path: string) {
    return {
      low: this.getOptimizedVideoUrl(bucket, path, { quality: 'low' }),
      medium: this.getOptimizedVideoUrl(bucket, path, { quality: 'medium' }),
      high: this.getOptimizedVideoUrl(bucket, path, { quality: 'high' }),
      thumbnail: this.getVideoThumbnailUrl(bucket, path, 1, 300)
    };
  }

  /**
   * Get the best video URL based on network quality
   */
  static getBestVideoUrl(
    bucket: string,
    path: string,
    networkQuality: 'poor' | 'fair' | 'good' | 'excellent' = 'good'
  ): string {
    const qualityMap = {
      poor: 'low',
      fair: 'low',
      good: 'medium',
      excellent: 'high'
    } as const;

    return this.getOptimizedVideoUrl(bucket, path, { 
      quality: qualityMap[networkQuality] 
    });
  }

  /**
   * Estimate bandwidth savings for video optimization
   */
  static estimateBandwidthSavings(
    originalSize: number,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): { optimizedSize: number; savings: number; savingsPercentage: number } {
    const compressionRatios = {
      low: 0.3,    // 70% reduction
      medium: 0.5, // 50% reduction
      high: 0.7    // 30% reduction
    };

    const optimizedSize = Math.round(originalSize * compressionRatios[quality]);
    const savings = originalSize - optimizedSize;
    const savingsPercentage = Math.round((savings / originalSize) * 100);

    return {
      optimizedSize,
      savings,
      savingsPercentage
    };
  }
}

// Usage examples:
export const getListingVideoUrl = (path: string, quality: 'low' | 'medium' | 'high' = 'medium') => {
  return VideoOptimization.getOptimizedVideoUrl('sellar-pro-videos', path, { quality });
};

export const getVideoThumbnail = (path: string, size: number = 300) => {
  return VideoOptimization.getVideoThumbnailUrl('sellar-pro-videos', path, 1, size);
};
