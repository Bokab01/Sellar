import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  key: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface OfflineConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxCacheSize: number; // Maximum number of items in cache
  syncInterval: number; // Sync interval in milliseconds
  maxRetries: number; // Maximum retry attempts for sync
}

class OfflineStorage {
  private config: OfflineConfig = {
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxCacheSize: 1000,
    syncInterval: 30 * 1000, // 30 seconds
    maxRetries: 3,
  };

  private syncQueue: SyncQueueItem[] = [];
  private isOnline: boolean = true;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: ((isOnline: boolean) => void)[] = [];

  constructor(config?: Partial<OfflineConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initialize();
  }

  private async initialize() {
    // Load sync queue from storage
    await this.loadSyncQueue();
    
    // Setup network monitoring
    this.setupNetworkMonitoring();
    
    // Start sync timer
    this.startSyncTimer();
    
    // Clean up expired cache items
    await this.cleanupExpiredItems();
  }

  private setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (!wasOnline && this.isOnline) {
        // Just came back online, trigger sync
        this.syncPendingChanges();
      }
      
      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline));
    });
  }

  private startSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingChanges();
      }
    }, this.config.syncInterval);
  }

  // Cache Management
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt,
      version: '1.0',
      key,
    };

    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      
      // Cleanup if cache is getting too large
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('Error setting cache item:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const cacheItem: CacheItem<T> = JSON.parse(item);
      
      // Check if item has expired
      if (Date.now() > cacheItem.expiresAt) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Error getting cache item:', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('Error removing cache item:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  private async cleanupIfNeeded(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      if (cacheKeys.length > this.config.maxCacheSize) {
        // Get all cache items with timestamps
        const items = await AsyncStorage.multiGet(cacheKeys);
        const itemsWithTimestamp = items
          .map(([key, value]) => {
            if (!value) return null;
            try {
              const cacheItem: CacheItem = JSON.parse(value);
              return { key, timestamp: cacheItem.timestamp };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .sort((a, b) => a!.timestamp - b!.timestamp);

        // Remove oldest items
        const itemsToRemove = itemsWithTimestamp.slice(0, cacheKeys.length - this.config.maxCacheSize);
        const keysToRemove = itemsToRemove.map(item => item!.key);
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  private async cleanupExpiredItems(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      const items = await AsyncStorage.multiGet(cacheKeys);
      
      const expiredKeys: string[] = [];
      const now = Date.now();
      
      items.forEach(([key, value]) => {
        if (!value) return;
        try {
          const cacheItem: CacheItem = JSON.parse(value);
          if (now > cacheItem.expiresAt) {
            expiredKeys.push(key);
          }
        } catch {
          // Invalid cache item, remove it
          expiredKeys.push(key);
        }
      });
      
      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }
    } catch (error) {
      console.error('Error cleaning up expired items:', error);
    }
  }

  // Offline Sync Queue Management
  async queueForSync(
    type: SyncQueueItem['type'],
    table: string,
    data: any,
    id?: string
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: id || `${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingChanges();
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  private async syncPendingChanges(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const itemsToSync = [...this.syncQueue];
    const successfulSyncs: string[] = [];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        successfulSyncs.push(item.id);
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
        
        // Increment retry count
        item.retryCount++;
        
        // Remove item if max retries exceeded
        if (item.retryCount >= item.maxRetries) {
          successfulSyncs.push(item.id); // Remove from queue
          console.error(`Max retries exceeded for item ${item.id}, removing from queue`);
        }
      }
    }

    // Remove successfully synced items from queue
    this.syncQueue = this.syncQueue.filter(item => !successfulSyncs.includes(item.id));
    await this.saveSyncQueue();
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'create':
        await supabase.from(item.table).insert(item.data);
        break;
      case 'update':
        await supabase.from(item.table).update(item.data).eq('id', item.data.id);
        break;
      case 'delete':
        await supabase.from(item.table).delete().eq('id', item.data.id);
        break;
    }
  }

  // Network Status
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  onNetworkStatusChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Cache Statistics
  async getCacheStats(): Promise<{
    totalItems: number;
    totalSize: number;
    oldestItem: number;
    newestItem: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      const items = await AsyncStorage.multiGet(cacheKeys);
      
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;
      
      items.forEach(([, value]) => {
        if (value) {
          totalSize += value.length;
          try {
            const cacheItem: CacheItem = JSON.parse(value);
            oldestTimestamp = Math.min(oldestTimestamp, cacheItem.timestamp);
            newestTimestamp = Math.max(newestTimestamp, cacheItem.timestamp);
          } catch {
            // Invalid cache item
          }
        }
      });
      
      return {
        totalItems: cacheKeys.length,
        totalSize,
        oldestItem: oldestTimestamp,
        newestItem: newestTimestamp,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        oldestItem: 0,
        newestItem: 0,
      };
    }
  }

  // Sync Queue Status
  getSyncQueueStatus(): {
    pendingItems: number;
    failedItems: number;
    oldestPendingItem: number;
  } {
    const failedItems = this.syncQueue.filter(item => item.retryCount > 0).length;
    const oldestPendingItem = this.syncQueue.length > 0 
      ? Math.min(...this.syncQueue.map(item => item.timestamp))
      : 0;
    
    return {
      pendingItems: this.syncQueue.length,
      failedItems,
      oldestPendingItem,
    };
  }

  // Force sync
  async forcSync(): Promise<void> {
    await this.syncPendingChanges();
  }

  // Cleanup
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.listeners = [];
  }
}

// Global offline storage instance
export const offlineStorage = new OfflineStorage();

// Utility functions for common operations
export const cacheUtils = {
  // Cache listings with optimized TTL
  async cacheListings(listings: any[], ttl?: number): Promise<void> {
    const cacheKey = 'listings_all';
    await offlineStorage.set(cacheKey, listings, ttl || 30 * 60 * 1000); // 30 minutes
  },

  async getCachedListings(): Promise<any[] | null> {
    return await offlineStorage.get('listings_all');
  },

  // Cache user profile
  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    const cacheKey = `profile_${userId}`;
    await offlineStorage.set(cacheKey, profile, 60 * 60 * 1000); // 1 hour
  },

  async getCachedUserProfile(userId: string): Promise<any | null> {
    const cacheKey = `profile_${userId}`;
    return await offlineStorage.get(cacheKey);
  },

  // Cache conversations
  async cacheConversations(conversations: any[]): Promise<void> {
    const cacheKey = 'conversations_all';
    await offlineStorage.set(cacheKey, conversations, 15 * 60 * 1000); // 15 minutes
  },

  async getCachedConversations(): Promise<any[] | null> {
    return await offlineStorage.get('conversations_all');
  },

  // Cache messages for a conversation
  async cacheMessages(conversationId: string, messages: any[]): Promise<void> {
    const cacheKey = `messages_${conversationId}`;
    await offlineStorage.set(cacheKey, messages, 10 * 60 * 1000); // 10 minutes
  },

  async getCachedMessages(conversationId: string): Promise<any[] | null> {
    const cacheKey = `messages_${conversationId}`;
    return await offlineStorage.get(cacheKey);
  },
};

export default offlineStorage;
