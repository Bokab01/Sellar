interface CacheItem<T> {
  data: T;
  timestamp: number;
  hits: number;
  priority: 'low' | 'normal' | 'high';
  size: number;
}

interface CacheConfig {
  maxSize: number; // in bytes
  maxAge: number; // in milliseconds
  maxItems: number;
  cleanupInterval: number; // in milliseconds
}

class AdvancedCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;
  private cleanupTimer: any = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      maxAge: 10 * 60 * 1000, // 10 minutes
      maxItems: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startCleanup();
  }

  set(key: string, data: T, priority: 'low' | 'normal' | 'high' = 'normal'): void {
    const size = this.calculateSize(data);
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      priority,
      size,
    };

    // Remove oldest items if cache is full
    this.evictIfNeeded(size);
    
    this.cache.set(key, item);
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and timestamp
    item.hits++;
    item.timestamp = Date.now();
    
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? Date.now() - item.timestamp <= this.config.maxAge : false;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): {
    totalItems: number;
    totalSize: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
  } {
    let totalSize = 0;
    let totalHits = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const item of this.cache.values()) {
      totalSize += item.size;
      totalHits += item.hits;
      oldestTimestamp = Math.min(oldestTimestamp, item.timestamp);
      newestTimestamp = Math.max(newestTimestamp, item.timestamp);
    }

    return {
      totalItems: this.cache.size,
      totalSize,
      hitRate: totalHits / Math.max(this.cache.size, 1),
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp,
    };
  }

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate
    } catch {
      return 1024; // Default size
    }
  }

  private evictIfNeeded(newItemSize: number): void {
    const currentSize = Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);
    
    if (currentSize + newItemSize > this.config.maxSize || this.cache.size >= this.config.maxItems) {
      // Sort by priority, then by hits, then by age
      const sortedItems = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        if (a.hits !== b.hits) {
          return a.hits - b.hits;
        }
        
        return a.timestamp - b.timestamp;
      });

      // Remove lowest priority items
      const itemsToRemove = Math.ceil(sortedItems.length * 0.2); // Remove 20%
      for (let i = 0; i < itemsToRemove; i++) {
        this.cache.delete(sortedItems[i][0]);
      }
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > this.config.maxAge) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach(key => this.cache.delete(key));
    }, this.config.cleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Global cache instances
export const listingCache = new AdvancedCache({ maxSize: 20 * 1024 * 1024, maxAge: 5 * 60 * 1000 });
export const userCache = new AdvancedCache({ maxSize: 10 * 1024 * 1024, maxAge: 15 * 60 * 1000 });
export const imageCache = new AdvancedCache({ maxSize: 30 * 1024 * 1024, maxAge: 30 * 60 * 1000 });

export { AdvancedCache };
