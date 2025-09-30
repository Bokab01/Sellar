import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  syncRequired: boolean;
}

interface SyncQueue {
  action: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineManager {
  private offlineData = new Map<string, OfflineData>();
  private syncQueue: SyncQueue[] = [];
  private isOnline = true;
  private syncInProgress = false;
  private maxRetries = 3;
  private syncInterval: any = null;

  constructor() {
    this.initializeOfflineManager();
  }

  private async initializeOfflineManager(): Promise<void> {
    // Load offline data from storage
    await this.loadOfflineData();
    
    // Monitor network status
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      
      if (this.isOnline && this.syncQueue.length > 0) {
        this.startSync();
      }
    });

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncQueue.length > 0) {
        this.startSync();
      }
    }, 30000); // Sync every 30 seconds
  }

  // Store data for offline access
  async storeOffline(key: string, data: any, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    const offlineData: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      priority,
      syncRequired: false,
    };

    this.offlineData.set(key, offlineData);
    await this.saveOfflineData();
  }

  // Get offline data
  async getOffline(key: string): Promise<any | null> {
    const offlineData = this.offlineData.get(key);
    
    if (!offlineData) {
      return null;
    }

    // Check if data is stale (older than 1 hour)
    if (Date.now() - offlineData.timestamp > 60 * 60 * 1000) {
      this.offlineData.delete(key);
      await this.saveOfflineData();
      return null;
    }

    return offlineData.data;
  }

  // Queue action for sync when online
  async queueSync(action: 'create' | 'update' | 'delete', table: string, data: any): Promise<void> {
    const syncItem: SyncQueue = {
      action,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(syncItem);
    await this.saveSyncQueue();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.startSync();
    }
  }

  // Start sync process
  private async startSync(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      const itemsToSync = [...this.syncQueue];
      const successfulSyncs: number[] = [];

      for (let i = 0; i < itemsToSync.length; i++) {
        const item = itemsToSync[i];
        
        try {
          await this.syncItem(item);
          successfulSyncs.push(i);
        } catch (error) {
          console.error(`Sync failed for item ${i}:`, error);
          
          // Increment retry count
          item.retryCount++;
          
          // Remove from queue if max retries reached
          if (item.retryCount >= this.maxRetries) {
            console.error(`Max retries reached for item ${i}, removing from queue`);
            successfulSyncs.push(i);
          }
        }
      }

      // Remove successfully synced items
      this.syncQueue = this.syncQueue.filter((_, index) => !successfulSyncs.includes(index));
      await this.saveSyncQueue();

    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync individual item
  private async syncItem(item: SyncQueue): Promise<void> {
    // This would integrate with your actual API
    // For now, we'll simulate the sync process
    
    switch (item.action) {
      case 'create':
        // await supabase.from(item.table).insert(item.data);
        console.log(`Creating ${item.table}:`, item.data);
        break;
      case 'update':
        // await supabase.from(item.table).update(item.data);
        console.log(`Updating ${item.table}:`, item.data);
        break;
      case 'delete':
        // await supabase.from(item.table).delete().eq('id', item.data.id);
        console.log(`Deleting ${item.table}:`, item.data);
        break;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Get sync status
  getSyncStatus(): {
    isOnline: boolean;
    pendingSyncs: number;
    lastSync: number | null;
    syncInProgress: boolean;
  } {
    return {
      isOnline: this.isOnline,
      pendingSyncs: this.syncQueue.length,
      lastSync: this.syncQueue.length > 0 ? Math.max(...this.syncQueue.map(item => item.timestamp)) : null,
      syncInProgress: this.syncInProgress,
    };
  }

  // Get offline data stats
  getOfflineStats(): {
    totalItems: number;
    oldestItem: number;
    newestItem: number;
    priorityBreakdown: Record<string, number>;
  } {
    const items = Array.from(this.offlineData.values());
    const priorityBreakdown = items.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalItems: items.length,
      oldestItem: items.length > 0 ? Math.min(...items.map(item => item.timestamp)) : 0,
      newestItem: items.length > 0 ? Math.max(...items.map(item => item.timestamp)) : 0,
      priorityBreakdown,
    };
  }

  // Save offline data to storage
  private async saveOfflineData(): Promise<void> {
    const data = Array.from(this.offlineData.entries());
    await AsyncStorage.setItem('offline_data', JSON.stringify(data));
  }

  // Load offline data from storage
  private async loadOfflineData(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('offline_data');
      if (data) {
        const parsed = JSON.parse(data);
        this.offlineData = new Map(parsed);
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }

  // Save sync queue to storage
  private async saveSyncQueue(): Promise<void> {
    await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
  }

  // Load sync queue from storage
  private async loadSyncQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('sync_queue');
      if (data) {
        this.syncQueue = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Global offline manager instance
export const offlineManager = new OfflineManager();

// Hook for using offline functionality
export const useOfflineManager = () => {
  return {
    storeOffline: offlineManager.storeOffline.bind(offlineManager),
    getOffline: offlineManager.getOffline.bind(offlineManager),
    queueSync: offlineManager.queueSync.bind(offlineManager),
    getSyncStatus: offlineManager.getSyncStatus.bind(offlineManager),
    getOfflineStats: offlineManager.getOfflineStats.bind(offlineManager),
  };
};
