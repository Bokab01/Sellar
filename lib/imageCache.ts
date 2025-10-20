import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

interface CacheEntry {
  url: string;
  timestamp: number;
  size: number;
}

interface CacheConfig {
  maxSize: number; // in bytes
  maxAge: number; // in milliseconds
  maxEntries: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxEntries: 1000
};

export class ImageCache {
  private static instance: ImageCache;
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadCache();
  }

  static getInstance(config?: Partial<CacheConfig>): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache(config);
    }
    return ImageCache.instance;
  }

  private async loadCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem('image_cache');
      if (cached) {
        const data = JSON.parse(cached);
        this.cache = new Map(Object.entries(data));
        this.cleanExpiredEntries();
      }
    } catch (error) {
      console.error('Error loading image cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const data = Object.fromEntries(this.cache);
      await AsyncStorage.setItem('image_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving image cache:', error);
    }
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.maxAge) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  private async enforceSizeLimit(): Promise<void> {
    if (this.cache.size <= this.config.maxEntries) return;

    // Sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, entries.length - this.config.maxEntries);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      await this.saveCache();
      return null;
    }

    return entry.url;
  }

  async set(key: string, url: string, size: number = 0): Promise<void> {
    // Clean expired entries first
    this.cleanExpiredEntries();

    // Add new entry
    this.cache.set(key, {
      url,
      timestamp: Date.now(),
      size
    });

    // Enforce size limits
    await this.enforceSizeLimit();
    await this.saveCache();
  }

  async preloadImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      Image.prefetch(url)
        .then(() => {
          // Cache the URL
          this.set(url, url);
          resolve(true);
        })
        .catch(() => resolve(false));
    });
  }

  async preloadImages(urls: string[]): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      urls.map(url => this.preloadImage(url))
    );

    const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - success;

    return { success, failed };
  }

  async clear(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem('image_cache');
  }

  async getStats(): Promise<{
    size: number;
    entries: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = entries.map(entry => entry.timestamp);

    return {
      size: totalSize,
      entries: this.cache.size,
      oldestEntry: timestamps.length ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length ? Math.max(...timestamps) : 0
    };
  }
}

// Export singleton instance
export const imageCache = ImageCache.getInstance();

// Helper function to generate cache key
export function generateCacheKey(bucket: string, path: string, options: any = {}): string {
  const optionsStr = JSON.stringify(options);
  return `${bucket}:${path}:${optionsStr}`;
}

// Helper function to preload critical images
export async function preloadCriticalImages(imageUrls: string[]): Promise<void> {
  const criticalImages = imageUrls.slice(0, 10); // Only preload first 10
  await imageCache.preloadImages(criticalImages);
}
