import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { networkUtils, NetworkStatus } from '@/utils/networkUtils';
import { offlineStorage } from '@/lib/offlineStorage';

export interface NetworkAwareState {
  isOnline: boolean;
  isConnected: boolean;
  networkQuality: 'poor' | 'fair' | 'good' | 'excellent';
  networkSpeed: 'slow' | 'medium' | 'fast';
  latency: number;
  canReachSupabase: boolean;
  lastSync: string | null;
  syncInProgress: boolean;
  queuedItems: number;
  error: string | null;
}

export interface NetworkAwareActions {
  checkNetworkStatus: () => Promise<NetworkStatus>;
  forceSync: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
  clearOfflineData: (type?: 'listings' | 'messages' | 'all') => Promise<void>;
  getStorageStats: () => Promise<any>;
}

interface UseNetworkAwareOptions {
  enableAutoSync?: boolean;
  syncInterval?: number; // minutes
  enableBackgroundSync?: boolean;
  onNetworkChange?: (status: NetworkStatus) => void;
  onSyncComplete?: (result: any) => void;
}

export function useNetworkAware(options: UseNetworkAwareOptions = {}): NetworkAwareState & NetworkAwareActions {
  const {
    enableAutoSync = true,
    syncInterval = 15, // 15 minutes
    enableBackgroundSync = true,
    onNetworkChange,
    onSyncComplete,
  } = options;

  // State
  const [state, setState] = useState<NetworkAwareState>({
    isOnline: true,
    isConnected: true,
    networkQuality: 'good',
    networkSpeed: 'medium',
    latency: 0,
    canReachSupabase: true,
    lastSync: null,
    syncInProgress: false,
    queuedItems: 0,
    error: null,
  });

  // Refs
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncAttempt = useRef<number>(0);
  const isInitialized = useRef(false);

  // ============ NETWORK STATUS MONITORING ============

  const updateNetworkStatus = useCallback(async (forceCheck = false) => {
    try {
      const now = Date.now();
      
      // Throttle network checks to avoid excessive API calls
      if (!forceCheck && now - lastSyncAttempt.current < 30000) { // 30 seconds
        return;
      }

      lastSyncAttempt.current = now;
      
      const status = await networkUtils.checkNetworkStatus();
      
      setState(prev => ({
        ...prev,
        isOnline: status.isConnected,
        isConnected: status.isConnected,
        networkQuality: status.quality,
        networkSpeed: status.speed,
        latency: status.latency,
        canReachSupabase: status.canReachSupabase,
        error: status.error || null,
      }));

      onNetworkChange?.(status);

      // Auto-sync if network is good and auto-sync is enabled
      if (enableAutoSync && status.canReachSupabase && status.quality !== 'poor') {
        await performAutoSync();
      }

    } catch (error) {
      console.error('Failed to update network status:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Network check failed',
      }));
    }
  }, [enableAutoSync, onNetworkChange]);

  // ============ SYNC OPERATIONS ============

  const performAutoSync = useCallback(async () => {
    if (state.syncInProgress) return;

    try {
      setState(prev => ({ ...prev, syncInProgress: true }));

      const result = await offlineStorage.performSync();
      
      setState(prev => ({
        ...prev,
        syncInProgress: false,
        lastSync: new Date().toISOString(),
        queuedItems: result.failed,
      }));

      onSyncComplete?.(result);

      if (result.errors.length > 0) {
        console.warn('Sync completed with errors:', result.errors);
      }

    } catch (error) {
      console.error('Auto-sync failed:', error);
      setState(prev => ({
        ...prev,
        syncInProgress: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      }));
    }
  }, [state.syncInProgress, onSyncComplete]);

  const forceSync = useCallback(async () => {
    if (state.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    try {
      setState(prev => ({ ...prev, syncInProgress: true, error: null }));

      // First check network status
      const networkStatus = await networkUtils.checkNetworkStatus();
      
      if (!networkStatus.canReachSupabase) {
        throw new Error('Cannot reach server. Please check your connection.');
      }

      const result = await offlineStorage.performSync(true);
      
      setState(prev => ({
        ...prev,
        syncInProgress: false,
        lastSync: new Date().toISOString(),
        queuedItems: result.failed,
        error: result.errors.length > 0 ? result.errors[0] : null,
      }));

      onSyncComplete?.(result);

      console.log(`Force sync completed: ${result.synced} synced, ${result.failed} failed`);

    } catch (error) {
      console.error('Force sync failed:', error);
      setState(prev => ({
        ...prev,
        syncInProgress: false,
        error: error instanceof Error ? error.message : 'Force sync failed',
      }));
      throw error;
    }
  }, [state.syncInProgress, onSyncComplete]);

  const retryFailedRequests = useCallback(async () => {
    // This is essentially the same as force sync
    await forceSync();
  }, [forceSync]);

  // ============ DATA MANAGEMENT ============

  const clearOfflineData = useCallback(async (type?: 'listings' | 'messages' | 'all') => {
    try {
      await offlineStorage.clearCache(type);
      
      // Update queued items count
      const stats = await offlineStorage.getStorageStats();
      setState(prev => ({
        ...prev,
        queuedItems: stats.queueItems,
      }));

      console.log(`Cleared offline data: ${type || 'all'}`);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear data',
      }));
    }
  }, []);

  const getStorageStats = useCallback(async () => {
    try {
      return await offlineStorage.getStorageStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }, []);

  const checkNetworkStatus = useCallback(async () => {
    return await networkUtils.checkNetworkStatus();
  }, []);

  // ============ INITIALIZATION AND CLEANUP ============

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (isInitialized.current) return;
      
      try {
        // Initialize offline storage
        await offlineStorage.initialize();
        
        // Get initial storage stats
        const stats = await offlineStorage.getStorageStats();
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            lastSync: stats.lastSync,
            queuedItems: stats.queueItems,
          }));
        }

        // Initial network check
        await updateNetworkStatus(true);
        
        isInitialized.current = true;
        console.log('Network-aware hook initialized');
        
      } catch (error) {
        console.error('Failed to initialize network-aware hook:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Initialization failed',
          }));
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [updateNetworkStatus]);

  // ============ NETWORK MONITORING ============

  useEffect(() => {
    // Listen to NetInfo for basic connectivity
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setState(prev => ({
        ...prev,
        isOnline: state.isConnected ?? false,
        isConnected: state.isConnected ?? false,
      }));

      // Trigger detailed network check when connectivity changes
      if (state.isConnected) {
        updateNetworkStatus(true);
      }
    });

    return unsubscribeNetInfo;
  }, [updateNetworkStatus]);

  // ============ APP STATE MONITORING ============

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, check network status
        updateNetworkStatus(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [updateNetworkStatus]);

  // ============ AUTO-SYNC INTERVAL ============

  useEffect(() => {
    if (!enableAutoSync) return;

    const startAutoSync = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(() => {
        if (state.isOnline && state.canReachSupabase && !state.syncInProgress) {
          performAutoSync();
        }
      }, syncInterval * 60 * 1000); // Convert minutes to milliseconds
    };

    startAutoSync();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [enableAutoSync, syncInterval, state.isOnline, state.canReachSupabase, state.syncInProgress, performAutoSync]);

  // ============ BACKGROUND SYNC ============

  useEffect(() => {
    if (!enableBackgroundSync) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && state.queuedItems > 0 && state.canReachSupabase) {
        // Try to sync before going to background
        performAutoSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [enableBackgroundSync, state.queuedItems, state.canReachSupabase, performAutoSync]);

  // ============ RETURN API ============

  return {
    // State
    ...state,
    
    // Actions
    checkNetworkStatus,
    forceSync,
    retryFailedRequests,
    clearOfflineData,
    getStorageStats,
  };
}

// ============ UTILITY HOOKS ============

export function useOfflineCapable<T>(
  onlineOperation: () => Promise<T>,
  offlineData?: T,
  options: {
    cacheKey?: string;
    priority?: 'low' | 'medium' | 'high';
    fallbackToCache?: boolean;
  } = {}
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  isFromCache: boolean;
  retry: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(offlineData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  
  const { isOnline, canReachSupabase } = useNetworkAware();

  const executeOperation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline && canReachSupabase) {
        // Try online operation
        const result = await networkUtils.adaptiveRequest(
          onlineOperation,
          {
            priority: options.priority,
            cacheKey: options.cacheKey,
            fallbackData: offlineData,
          }
        );
        
        setData(result);
        setIsFromCache(false);
      } else if (options.fallbackToCache && offlineData) {
        // Use offline data
        setData(offlineData);
        setIsFromCache(true);
      } else {
        throw new Error('No network connection and no offline data available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed';
      setError(errorMessage);
      
      // Try offline data as last resort
      if (offlineData) {
        setData(offlineData);
        setIsFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, canReachSupabase, onlineOperation, offlineData, options.priority, options.cacheKey, options.fallbackToCache]);

  const retry = useCallback(async () => {
    await executeOperation();
  }, [executeOperation]);

  useEffect(() => {
    executeOperation();
  }, [executeOperation]);

  return {
    data,
    loading,
    error,
    isFromCache,
    retry,
  };
}
