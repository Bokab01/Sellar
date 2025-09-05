import { supabase } from './supabase';

export interface ImageOptimizationConfig {
  quality: number;
  maxWidth: number;
  maxHeight: number;
  generateThumbnail: boolean;
  generateWebP: boolean;
  enableCDN: boolean;
}

export interface ImageVariant {
  name: string;
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface OptimizationResult {
  success: boolean;
  originalUrl: string;
  variants: ImageVariant[];
  totalSavings: number;
  compressionRatio: number;
  error?: string;
}

// Default optimization configurations for different use cases
export const OPTIMIZATION_PRESETS = {
  LISTING: {
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    generateThumbnail: true,
    generateWebP: true,
    enableCDN: true
  },
  PROFILE: {
    quality: 90,
    maxWidth: 800,
    maxHeight: 800,
    generateThumbnail: true,
    generateWebP: true,
    enableCDN: true
  },
  COMMUNITY: {
    quality: 80,
    maxWidth: 1200,
    maxHeight: 1200,
    generateThumbnail: true,
    generateWebP: true,
    enableCDN: true
  },
  CHAT: {
    quality: 75,
    maxWidth: 800,
    maxHeight: 600,
    generateThumbnail: false,
    generateWebP: true,
    enableCDN: false
  }
} as const;

export const imageOptimization = {
  /**
   * Get optimized image URLs for a given original image
   */
  async getOptimizedUrls(bucket: string, originalPath: string): Promise<ImageVariant[]> {
    try {
      // Extract base path without extension
      const basePath = originalPath.replace(/\.[^.]+$/, '');
      const variants: ImageVariant[] = [];

      // Define the variants we expect to exist
      const expectedVariants = [
        { name: 'thumbnail', width: 150, height: 150 },
        { name: 'small', width: 300, height: 300 },
        { name: 'medium', width: 600, height: 600 },
        { name: 'large', width: 1200, height: 1200 }
      ];

      const formats = ['jpeg', 'webp'];

      for (const variant of expectedVariants) {
        for (const format of formats) {
          const variantPath = `${basePath}_${variant.name}.${format}`;
          
          // Check if variant exists by trying to get its public URL
          try {
            const { data: urlData } = supabase.storage
              .from(bucket)
              .getPublicUrl(variantPath);

            // For now, we'll assume the variant exists if we can generate a URL
            // In production, you might want to verify the file actually exists
            variants.push({
              name: `${variant.name}_${format}`,
              url: urlData.publicUrl,
              width: variant.width,
              height: variant.height,
              format,
              size: 0 // Would need to fetch actual size
            });
          } catch (error) {
            // Variant doesn't exist, skip it
            continue;
          }
        }
      }

      return variants;
    } catch (error) {
      console.error('Error getting optimized URLs:', error);
      return [];
    }
  },

  /**
   * Get the best image URL for a given size requirement
   */
  getBestImageUrl(
    variants: ImageVariant[], 
    targetWidth: number, 
    preferWebP: boolean = true
  ): string | null {
    if (variants.length === 0) return null;

    // Filter by format preference
    let candidateVariants = preferWebP 
      ? variants.filter(v => v.format === 'webp')
      : variants.filter(v => v.format === 'jpeg');

    // Fallback to any format if preferred format not available
    if (candidateVariants.length === 0) {
      candidateVariants = variants;
    }

    // Find the variant with the closest width that's >= target width
    let bestVariant = candidateVariants.reduce((best, current) => {
      const bestDiff = Math.abs(best.width - targetWidth);
      const currentDiff = Math.abs(current.width - targetWidth);
      
      // Prefer larger images over smaller ones, but closest to target
      if (current.width >= targetWidth && best.width < targetWidth) {
        return current;
      }
      if (best.width >= targetWidth && current.width < targetWidth) {
        return best;
      }
      
      return currentDiff < bestDiff ? current : best;
    });

    return bestVariant.url;
  },

  /**
   * Get user's image optimization statistics
   */
  async getOptimizationStats(userId?: string): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_image_optimization_stats', {
        user_uuid: userId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting optimization stats:', error);
      return null;
    }
  },

  /**
   * Get user's optimization history
   */
  async getOptimizationHistory(userId?: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_optimization_history', {
        user_uuid: userId,
        limit_count: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting optimization history:', error);
      return [];
    }
  },

  /**
   * Generate responsive image srcSet for web
   */
  generateSrcSet(variants: ImageVariant[]): string {
    return variants
      .filter(v => v.format === 'webp' || v.format === 'jpeg')
      .sort((a, b) => a.width - b.width)
      .map(v => `${v.url} ${v.width}w`)
      .join(', ');
  },

  /**
   * Get image URL with Supabase transform parameters
   */
  getTransformedUrl(
    bucket: string, 
    path: string, 
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
      resize?: 'cover' | 'contain' | 'fill';
    } = {}
  ): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
      transform: {
        width: options.width,
        height: options.height,
        quality: options.quality,
        format: options.format as any,
        resize: options.resize || 'cover'
      }
    });

    return data.publicUrl;
  }
};

// Utility function to determine if WebP is supported
export const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// React Native utility to get device pixel ratio
export const getDevicePixelRatio = (): number => {
  if (typeof window !== 'undefined' && window.devicePixelRatio) {
    return window.devicePixelRatio;
  }
  return 1; // Default for React Native
};
