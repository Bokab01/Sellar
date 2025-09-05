import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorage, cacheUtils } from '@/lib/offlineStorage';
import { supabase } from '@/lib/supabase';

export interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncTime: number | null;
  syncError: string | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    isSyncing: false,
    pendingChanges: 0,
    lastSyncTime: null,
    syncError: null,
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize offline state
    updateSyncStatus();

    // Listen for network status changes
    const unsubscribeNetwork = offlineStorage.onNetworkStatusChange((isOnline) => {
      setState(prev => ({ ...prev, isOnline }));
      
      if (isOnline) {
        // Trigger sync when coming back online
        handleSync();
      }
    });

    // Update sync status periodically
    const interval = setInterval(updateSyncStatus, 5000);

    return () => {
      unsubscribeNetwork();
      clearInterval(interval);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const updateSyncStatus = useCallback(async () => {
    const isOnline = offlineStorage.getNetworkStatus();
    const syncStatus = offlineStorage.getSyncQueueStatus();
    
    setState(prev => ({
      ...prev,
      isOnline,
      pendingChanges: syncStatus.pendingItems,
    }));
  }, []);

  const handleSync = useCallback(async () => {
    if (state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      await offlineStorage.forcSync();
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
        syncError: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
      await updateSyncStatus();
    }
  }, [state.isSyncing, updateSyncStatus]);

  const queueOfflineAction = useCallback(async (
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any,
    id?: string
  ) => {
    await offlineStorage.queueForSync(type, table, data, id);
    await updateSyncStatus();
  }, [updateSyncStatus]);

  return {
    ...state,
    sync: handleSync,
    queueAction: queueOfflineAction,
  };
}

// Hook for offline-first data fetching
export function useOfflineData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: {
    cacheTTL?: number;
    refetchOnMount?: boolean;
    refetchOnReconnect?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const { isOnline } = useOfflineSync();

  const {
    cacheTTL = 30 * 60 * 1000, // 30 minutes
    refetchOnMount = true,
    refetchOnReconnect = true,
  } = options;

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached data first
      if (!forceRefresh) {
        const cachedData = await offlineStorage.get<T>(key);
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
          setLoading(false);
          
          // If offline, return cached data
          if (!isOnline) {
            return;
          }
        }
      }

      // If online, fetch fresh data
      if (isOnline) {
        const freshData = await fetchFunction();
        setData(freshData);
        setIsFromCache(false);
        
        // Cache the fresh data
        await offlineStorage.set(key, freshData, cacheTTL);
      } else if (!data) {
        // If offline and no cached data, show error
        setError('No internet connection and no cached data available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      
      // If we have cached data, keep showing it
      if (!data) {
        const cachedData = await offlineStorage.get<T>(key);
        if (cachedData) {
          setData(cachedData);
          setIsFromCache(true);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction, cacheTTL, isOnline]); // Remove 'data' to prevent circular dependency

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  useEffect(() => {
    if (refetchOnReconnect && isOnline && data && isFromCache) {
      // Refetch when coming back online if we have cached data
      fetchData(true);
    }
  }, [isOnline, refetchOnReconnect, data, isFromCache, fetchData]);

  return {
    data,
    loading,
    error,
    isFromCache,
    refetch,
  };
}

// Hook for offline-first mutations
export function useOfflineMutation<T, P>(
  mutationFunction: (params: P) => Promise<T>,
  options: {
    table?: string;
    optimisticUpdate?: (params: P) => T;
    onSuccess?: (data: T, params: P) => void;
    onError?: (error: Error, params: P) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, queueAction } = useOfflineSync();

  const mutate = useCallback(async (params: P): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Online: execute mutation immediately
        const result = await mutationFunction(params);
        options.onSuccess?.(result, params);
        return result;
      } else {
        // Offline: queue for later sync and return optimistic result
        if (options.table) {
          await queueAction('create', options.table, params);
        }
        
        const optimisticResult = options.optimisticUpdate?.(params);
        if (optimisticResult) {
          options.onSuccess?.(optimisticResult, params);
          return optimisticResult;
        }
        
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mutation failed';
      setError(errorMessage);
      options.onError?.(err as Error, params);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFunction, isOnline, queueAction, options]);

  return {
    mutate,
    loading,
    error,
  };
}

// Specialized hooks for common data types
export function useOfflineListings() {
  return useOfflineData(
    'listings_all',
    async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    {
      cacheTTL: 15 * 60 * 1000, // 15 minutes
      refetchOnReconnect: true,
    }
  );
}

export function useOfflineConversations(userId?: string) {
  return useOfflineData(
    `conversations_${userId}`,
    async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    {
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      refetchOnReconnect: true,
    }
  );
}

export function useOfflineMessages(conversationId?: string) {
  return useOfflineData(
    `messages_${conversationId}`,
    async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    {
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      refetchOnReconnect: true,
    }
  );
}

export function useOfflineProfile(userId?: string) {
  return useOfflineData(
    `profile_${userId}`,
    async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      cacheTTL: 60 * 60 * 1000, // 1 hour
      refetchOnReconnect: false, // Profile data changes less frequently
    }
  );
}
