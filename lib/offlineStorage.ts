import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// Storage keys
const STORAGE_KEYS = {
  LISTINGS: 'offline_listings',
  CATEGORIES: 'offline_categories',
  USER_PROFILE: 'offline_user_profile',
  MESSAGES: 'offline_messages',
  DRAFTS: 'offline_drafts',
  IMAGES: 'offline_images',
  SYNC_QUEUE: 'sync_queue',
  LAST_SYNC: 'last_sync_timestamp',
  NETWORK_QUALITY: 'network_quality_history',
  CACHED_SEARCHES: 'cached_searches',
} as const;

// Data types for offline storage
export interface OfflineListing {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category_id: string;
  location: string;
  condition: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  cached_at: string;
  is_favorite?: boolean;
}

export interface OfflineMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  cached_at: string;
  is_read: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'create_listing' | 'update_listing' | 'send_message' | 'update_profile' | 'favorite_listing';
  data: any;
  created_at: string;
  retry_count: number;
  last_attempt?: string;
  error?: string;
}

export interface NetworkQualityData {
  timestamp: string;
  speed: 'slow' | 'medium' | 'fast';
  latency: number;
  success_rate: number;
}

class OfflineStorageService {
  private isInitialized = false;
  private syncInProgress = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize storage structure
      await this.ensureStorageStructure();
      this.isInitialized = true;
      console.log('Offline storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
      throw error;
    }
  }

  private async ensureStorageStructure(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    
    for (const key of keys) {
      try {
        const existing = await AsyncStorage.getItem(key);
        if (!existing) {
          const defaultValue = key.includes('queue') || key.includes('history') || key.includes('searches') ? '[]' : '{}';
          await AsyncStorage.setItem(key, defaultValue);
        }
      } catch (error) {
        console.warn(`Failed to initialize storage key ${key}:`, error);
      }
    }
  }

  // ============ LISTINGS MANAGEMENT ============

  async cacheListings(listings: any[]): Promise<void> {
    try {
      const offlineListings: OfflineListing[] = listings.map(listing => ({
        ...listing,
        cached_at: new Date().toISOString(),
      }));

      await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(offlineListings));
      console.log(`Cached ${listings.length} listings offline`);
    } catch (error) {
      console.error('Failed to cache listings:', error);
    }
  }

  async getCachedListings(filters?: {
    category?: string;
    location?: string;
    maxAge?: number; // hours
  }): Promise<OfflineListing[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.LISTINGS);
      if (!cached) return [];

      let listings: OfflineListing[] = JSON.parse(cached);

      // Apply filters
      if (filters) {
        if (filters.category) {
          listings = listings.filter(l => l.category_id === filters.category);
        }
        
        if (filters.location) {
          listings = listings.filter(l => 
            l.location.toLowerCase().includes(filters.location!.toLowerCase())
          );
        }

        if (filters.maxAge) {
          const maxAgeMs = filters.maxAge * 60 * 60 * 1000;
          const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
          listings = listings.filter(l => l.cached_at > cutoff);
        }
      }

      return listings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Failed to get cached listings:', error);
      return [];
    }
  }

  async cacheSingleListing(listing: any): Promise<void> {
    try {
      const cached = await this.getCachedListings();
      const existingIndex = cached.findIndex(l => l.id === listing.id);
      
      const offlineListing: OfflineListing = {
        ...listing,
        cached_at: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        cached[existingIndex] = offlineListing;
      } else {
        cached.unshift(offlineListing);
      }

      // Keep only recent 500 listings to manage storage
      const trimmed = cached.slice(0, 500);
      await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to cache single listing:', error);
    }
  }

  // ============ MESSAGES MANAGEMENT ============

  async cacheMessages(conversationId: string, messages: any[]): Promise<void> {
    try {
      const offlineMessages: OfflineMessage[] = messages.map(msg => ({
        ...msg,
        cached_at: new Date().toISOString(),
      }));

      const allCached = await this.getCachedMessages();
      
      // Remove old messages for this conversation
      const filtered = allCached.filter(m => m.conversation_id !== conversationId);
      
      // Add new messages
      const updated = [...filtered, ...offlineMessages];
      
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
      console.log(`Cached ${messages.length} messages for conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to cache messages:', error);
    }
  }

  async getCachedMessages(conversationId?: string): Promise<OfflineMessage[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (!cached) return [];

      let messages: OfflineMessage[] = JSON.parse(cached);

      if (conversationId) {
        messages = messages.filter(m => m.conversation_id === conversationId);
      }

      return messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } catch (error) {
      console.error('Failed to get cached messages:', error);
      return [];
    }
  }

  // ============ SYNC QUEUE MANAGEMENT ============

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'created_at' | 'retry_count'>): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      
      const newItem: SyncQueueItem = {
        ...item,
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        retry_count: 0,
      };

      queue.push(newItem);
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      
      console.log(`Added item to sync queue: ${newItem.type}`);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  async removeFromSyncQueue(itemId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const filtered = queue.filter(item => item.id !== itemId);
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove from sync queue:', error);
    }
  }

  async updateSyncQueueItem(itemId: string, updates: Partial<SyncQueueItem>): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      const index = queue.findIndex(item => item.id === itemId);
      
      if (index >= 0) {
        queue[index] = { ...queue[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Failed to update sync queue item:', error);
    }
  }

  // ============ NETWORK QUALITY TRACKING ============

  async recordNetworkQuality(data: NetworkQualityData): Promise<void> {
    try {
      const history = await this.getNetworkQualityHistory();
      history.push(data);
      
      // Keep only last 100 measurements
      const trimmed = history.slice(-100);
      
      await AsyncStorage.setItem(STORAGE_KEYS.NETWORK_QUALITY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to record network quality:', error);
    }
  }

  async getNetworkQualityHistory(): Promise<NetworkQualityData[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.NETWORK_QUALITY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Failed to get network quality history:', error);
      return [];
    }
  }

  async getAverageNetworkQuality(hours: number = 24): Promise<{
    speed: 'slow' | 'medium' | 'fast';
    latency: number;
    success_rate: number;
  }> {
    try {
      const history = await this.getNetworkQualityHistory();
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const recent = history.filter(h => h.timestamp > cutoff);
      
      if (recent.length === 0) {
        return { speed: 'medium', latency: 1000, success_rate: 0.8 };
      }

      const avgLatency = recent.reduce((sum, h) => sum + h.latency, 0) / recent.length;
      const avgSuccessRate = recent.reduce((sum, h) => sum + h.success_rate, 0) / recent.length;
      
      // Determine speed based on latency and success rate
      let speed: 'slow' | 'medium' | 'fast' = 'medium';
      if (avgLatency > 2000 || avgSuccessRate < 0.7) {
        speed = 'slow';
      } else if (avgLatency < 500 && avgSuccessRate > 0.9) {
        speed = 'fast';
      }

      return {
        speed,
        latency: Math.round(avgLatency),
        success_rate: Math.round(avgSuccessRate * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get average network quality:', error);
      return { speed: 'medium', latency: 1000, success_rate: 0.8 };
    }
  }

  // ============ SEARCH CACHING ============

  async cacheSearchResults(query: string, filters: any, results: any[]): Promise<void> {
    try {
      const cached = await this.getCachedSearches();
      const cacheKey = `${query}_${JSON.stringify(filters)}`;
      
      cached[cacheKey] = {
        results,
        timestamp: new Date().toISOString(),
        query,
        filters,
      };

      // Keep only recent 50 searches
      const entries = Object.entries(cached);
      if (entries.length > 50) {
        const sorted = entries.sort((a, b) => 
          new Date(b[1].timestamp).getTime() - new Date(a[1].timestamp).getTime()
        );
        const trimmed = Object.fromEntries(sorted.slice(0, 50));
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SEARCHES, JSON.stringify(trimmed));
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SEARCHES, JSON.stringify(cached));
      }
    } catch (error) {
      console.error('Failed to cache search results:', error);
    }
  }

  async getCachedSearchResults(query: string, filters: any, maxAgeHours: number = 2): Promise<any[] | null> {
    try {
      const cached = await this.getCachedSearches();
      const cacheKey = `${query}_${JSON.stringify(filters)}`;
      const entry = cached[cacheKey];
      
      if (!entry) return null;

      const maxAge = maxAgeHours * 60 * 60 * 1000;
      const age = Date.now() - new Date(entry.timestamp).getTime();
      
      if (age > maxAge) return null;

      return entry.results;
    } catch (error) {
      console.error('Failed to get cached search results:', error);
      return null;
    }
  }

  private async getCachedSearches(): Promise<Record<string, any>> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_SEARCHES);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Failed to get cached searches:', error);
      return {};
    }
  }

  // ============ SYNC OPERATIONS ============

  async performSync(forceSync: boolean = false): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    if (this.syncInProgress && !forceSync) {
      console.log('Sync already in progress, skipping...');
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.syncInProgress = true;
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    try {
      const queue = await this.getSyncQueue();
      console.log(`Starting sync of ${queue.length} items`);

      for (const item of queue) {
        try {
          const success = await this.syncItem(item);
          
          if (success) {
            await this.removeFromSyncQueue(item.id);
            synced++;
          } else {
            // Increment retry count
            await this.updateSyncQueueItem(item.id, {
              retry_count: item.retry_count + 1,
              last_attempt: new Date().toISOString(),
            });
            failed++;
            
            // Remove items that have failed too many times
            if (item.retry_count >= 5) {
              await this.removeFromSyncQueue(item.id);
              errors.push(`Item ${item.type} failed after 5 retries`);
            }
          }
        } catch (error) {
          failed++;
          errors.push(`Sync error for ${item.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      console.log(`Sync completed: ${synced} synced, ${failed} failed`);
      return { success: true, synced, failed, errors };

    } catch (error) {
      console.error('Sync operation failed:', error);
      return { 
        success: false, 
        synced, 
        failed, 
        errors: [...errors, error instanceof Error ? error.message : 'Unknown sync error'] 
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      switch (item.type) {
        case 'create_listing':
          return await this.syncCreateListing(item.data);
        case 'update_listing':
          return await this.syncUpdateListing(item.data);
        case 'send_message':
          return await this.syncSendMessage(item.data);
        case 'update_profile':
          return await this.syncUpdateProfile(item.data);
        case 'favorite_listing':
          return await this.syncFavoriteListing(item.data);
        default:
          console.warn(`Unknown sync item type: ${item.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to sync item ${item.type}:`, error);
      return false;
    }
  }

  private async syncCreateListing(data: any): Promise<boolean> {
    try {
      const { data: result, error } = await supabase
        .from('listings')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Update cached listings
      if (result) {
        await this.cacheSingleListing(result);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync create listing:', error);
      return false;
    }
  }

  private async syncUpdateListing(data: any): Promise<boolean> {
    try {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to sync update listing:', error);
      return false;
    }
  }

  private async syncSendMessage(data: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('messages')
        .insert(data);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to sync send message:', error);
      return false;
    }
  }

  private async syncUpdateProfile(data: any): Promise<boolean> {
    try {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to sync update profile:', error);
      return false;
    }
  }

  private async syncFavoriteListing(data: any): Promise<boolean> {
    try {
      if (data.is_favorite) {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: data.user_id,
            listing_id: data.listing_id,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', data.user_id)
          .eq('listing_id', data.listing_id);
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Failed to sync favorite listing:', error);
      return false;
    }
  }

  // ============ UTILITY METHODS ============

  async getStorageStats(): Promise<{
    listings: number;
    messages: number;
    queueItems: number;
    lastSync: string | null;
    totalSizeKB: number;
  }> {
    try {
      const [listings, messages, queue, lastSync] = await Promise.all([
        this.getCachedListings(),
        this.getCachedMessages(),
        this.getSyncQueue(),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
      ]);

      // Estimate total size (rough calculation)
      const totalSizeKB = Math.round(
        (JSON.stringify(listings).length + 
         JSON.stringify(messages).length + 
         JSON.stringify(queue).length) / 1024
      );

      return {
        listings: listings.length,
        messages: messages.length,
        queueItems: queue.length,
        lastSync,
        totalSizeKB,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        listings: 0,
        messages: 0,
        queueItems: 0,
        lastSync: null,
        totalSizeKB: 0,
      };
    }
  }

  async clearCache(type?: 'listings' | 'messages' | 'all'): Promise<void> {
    try {
      if (type === 'listings' || type === 'all') {
        await AsyncStorage.setItem(STORAGE_KEYS.LISTINGS, '[]');
      }
      
      if (type === 'messages' || type === 'all') {
        await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, '[]');
      }

      if (type === 'all') {
        await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SEARCHES, '{}');
        await AsyncStorage.setItem(STORAGE_KEYS.NETWORK_QUALITY, '[]');
      }

      console.log(`Cleared cache: ${type || 'all'}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // ============ COMPATIBILITY METHODS ============

  // Alias for clearCache
  async clear(type?: 'listings' | 'messages' | 'all'): Promise<void> {
    return this.clearCache(type);
  }

  // Alias for performSync
  async forcSync(forceSync: boolean = true): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    return this.performSync(forceSync);
  }

  // Alias for getStorageStats
  async getCacheStats(): Promise<{
    listings: number;
    messages: number;
    queueItems: number;
    lastSync: string | null;
    totalSizeKB: number;
  }> {
    return this.getStorageStats();
  }

  // Alias for getSyncQueue
  getSyncQueueStatus(): Promise<SyncQueueItem[]> {
    return this.getSyncQueue();
  }

  // Generic cache methods for compatibility
  async set(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000,
      };
      
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;
      
      const { data, timestamp, ttl } = JSON.parse(cached);
      
      if (Date.now() - timestamp > ttl) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('Failed to remove cache:', error);
    }
  }

  // Network status methods for compatibility
  getNetworkStatus(): boolean {
    // This would need to be connected to actual network status
    return true; // Default to online
  }

  onNetworkStatusChange(callback: (isOnline: boolean) => void): () => void {
    // This would need to be connected to actual network monitoring
    // For now, return a no-op unsubscribe function
    return () => {};
  }

  // Queue methods for compatibility
  async queueForSync(type: string, table: string, data: any, id?: string): Promise<void> {
    await this.addToSyncQueue({
      type: type as any,
      data: { table, data, id },
    });
  }

  // Cleanup method
  async destroy(): Promise<void> {
    // Clean up any resources if needed
    console.log('OfflineStorage destroyed');
  }
}

export const offlineStorage = new OfflineStorageService();

// Export cache utilities for compatibility
export const cacheUtils = {
  set: (key: string, data: any, ttlMinutes: number = 60) => offlineStorage.set(key, data, ttlMinutes),
  get: <T>(key: string) => offlineStorage.get<T>(key),
  remove: (key: string) => offlineStorage.remove(key),
  clear: (type?: 'listings' | 'messages' | 'all') => offlineStorage.clear(type),
};