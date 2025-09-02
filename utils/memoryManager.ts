import React from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

interface CacheEntry {
  data: any;
  size: number;
  lastAccessed: number;
  accessCount: number;
  priority: number;
}

class MemoryManager {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize: number = 50 * 1024 * 1024; // 50MB
  private currentCacheSize: number = 0;
  private memoryWarningThreshold: number = 0.8; // 80%
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: ((usage: MemoryUsage) => void)[] = [];

  constructor() {
    this.setupMemoryMonitoring();
    this.setupAppStateHandling();
    this.startCleanupTimer();
  }

  private setupMemoryMonitoring() {
    // Monitor memory usage periodically
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Every 10 seconds
  }

  private setupAppStateHandling() {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Aggressive cleanup when app goes to background
        this.performAggressiveCleanup();
      } else if (nextAppState === 'active') {
        // Gentle cleanup when app becomes active
        this.performGentleCleanup();
      }
    });
  }

  private startCleanupTimer() {
    // Periodic cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performGentleCleanup();
    }, 30000);
  }

  private checkMemoryUsage(): MemoryUsage {
    // React Native doesn't provide direct memory access
    // This is a simulation - in production, you'd use a native module
    const estimatedUsage = this.currentCacheSize + this.estimateAppMemoryUsage();
    const totalMemory = this.estimateTotalMemory();
    
    const usage: MemoryUsage = {
      used: estimatedUsage,
      total: totalMemory,
      percentage: estimatedUsage / totalMemory,
      timestamp: Date.now(),
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(usage));

    // Trigger cleanup if memory usage is high
    if (usage.percentage > this.memoryWarningThreshold) {
      console.warn('High memory usage detected:', usage.percentage.toFixed(2));
      this.performAggressiveCleanup();
    }

    return usage;
  }

  private estimateAppMemoryUsage(): number {
    // Estimate based on various factors
    // This is a rough estimation for demonstration
    return 20 * 1024 * 1024; // 20MB base app usage
  }

  private estimateTotalMemory(): number {
    // Estimate device memory (this would come from native module in production)
    return 2 * 1024 * 1024 * 1024; // Assume 2GB device
  }

  // Cache Management
  set(key: string, data: any, priority: number = 1): void {
    const size = this.estimateObjectSize(data);
    
    // Check if adding this item would exceed cache limit
    if (this.currentCacheSize + size > this.maxCacheSize) {
      this.performGentleCleanup();
      
      // If still not enough space, perform aggressive cleanup
      if (this.currentCacheSize + size > this.maxCacheSize) {
        this.performAggressiveCleanup();
      }
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentCacheSize -= existing.size;
    }

    // Add new entry
    const entry: CacheEntry = {
      data,
      size,
      lastAccessed: Date.now(),
      accessCount: 1,
      priority,
    };

    this.cache.set(key, entry);
    this.currentCacheSize += size;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentCacheSize -= entry.size;
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  // Cleanup Methods
  private performGentleCleanup(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const keysToRemove: string[] = [];

    // Remove old, rarely accessed items
    this.cache.forEach((entry, key) => {
      const age = now - entry.lastAccessed;
      const isOld = age > maxAge;
      const isRarelyUsed = entry.accessCount < 3 && age > 5 * 60 * 1000; // 5 minutes

      if (isOld || isRarelyUsed) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.delete(key));

    if (keysToRemove.length > 0) {
      console.log(`Gentle cleanup: removed ${keysToRemove.length} cache entries`);
    }
  }

  private performAggressiveCleanup(): void {
    const targetSize = this.maxCacheSize * 0.7; // Reduce to 70% of max
    const entries = Array.from(this.cache.entries());

    // Sort by priority (lower is better) and last accessed time
    entries.sort(([, a], [, b]) => {
      const priorityDiff = a.priority - b.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.lastAccessed - b.lastAccessed;
    });

    let removedCount = 0;
    for (const [key, entry] of entries) {
      if (this.currentCacheSize <= targetSize) break;
      
      this.delete(key);
      removedCount++;
    }

    console.log(`Aggressive cleanup: removed ${removedCount} cache entries`);
  }

  // Memory Optimization Utilities
  private estimateObjectSize(obj: any): number {
    // Rough estimation of object size in bytes
    const jsonString = JSON.stringify(obj);
    return jsonString.length * 2; // Approximate UTF-16 encoding
  }

  optimizeImages(images: any[]): any[] {
    // Remove high-resolution images if memory is low
    const memoryUsage = this.checkMemoryUsage();
    
    if (memoryUsage.percentage > 0.7) {
      return images.map(image => ({
        ...image,
        // Use lower resolution versions
        uri: image.uri?.replace('_large', '_medium') || image.uri,
      }));
    }
    
    return images;
  }

  shouldLoadHeavyComponent(): boolean {
    const memoryUsage = this.checkMemoryUsage();
    return memoryUsage.percentage < 0.6; // Only load if memory usage is below 60%
  }

  // Memory Monitoring
  onMemoryWarning(callback: (usage: MemoryUsage) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Statistics
  getCacheStats(): {
    size: number;
    count: number;
    maxSize: number;
    usage: number;
    topItems: Array<{ key: string; size: number; accessCount: number }>;
  } {
    const topItems = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        size: entry.size,
        accessCount: entry.accessCount,
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.maxCacheSize,
      usage: this.currentCacheSize / this.maxCacheSize,
      topItems,
    };
  }

  // Configuration
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = size;
    if (this.currentCacheSize > size) {
      this.performAggressiveCleanup();
    }
  }

  setMemoryWarningThreshold(threshold: number): void {
    this.memoryWarningThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    this.listeners = [];
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager();

// React hooks for memory management
export function useMemoryManager() {
  const [memoryUsage, setMemoryUsage] = React.useState<MemoryUsage | null>(null);

  React.useEffect(() => {
    const unsubscribe = memoryManager.onMemoryWarning(setMemoryUsage);
    return unsubscribe;
  }, []);

  const cacheData = React.useCallback((key: string, data: any, priority?: number) => {
    memoryManager.set(key, data, priority);
  }, []);

  const getCachedData = React.useCallback((key: string) => {
    return memoryManager.get(key);
  }, []);

  const clearCache = React.useCallback(() => {
    memoryManager.clear();
  }, []);

  const shouldLoadHeavyComponent = React.useCallback(() => {
    return memoryManager.shouldLoadHeavyComponent();
  }, []);

  return {
    memoryUsage,
    cacheData,
    getCachedData,
    clearCache,
    shouldLoadHeavyComponent,
    cacheStats: memoryManager.getCacheStats(),
  };
}

// Hook for automatic memory-aware caching
export function useMemoryAwareCache<T>(
  key: string,
  data: T,
  priority: number = 1
): T {
  React.useEffect(() => {
    if (data !== null && data !== undefined) {
      memoryManager.set(key, data, priority);
    }
  }, [key, data, priority]);

  return data;
}

// Hook for conditional heavy component loading
export function useConditionalLoad(
  condition: boolean = true,
  memoryThreshold: number = 0.6
): boolean {
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (!condition) {
      setShouldLoad(false);
      return;
    }

    const checkMemory = () => {
      const canLoad = memoryManager.shouldLoadHeavyComponent();
      setShouldLoad(canLoad);
    };

    checkMemory();
    
    // Check periodically
    const interval = setInterval(checkMemory, 5000);
    return () => clearInterval(interval);
  }, [condition, memoryThreshold]);

  return shouldLoad;
}

export default memoryManager;
