import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AppState, AppStateStatus } from 'react-native';

interface UseOptimizedRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  // Throttle updates to prevent excessive calls
  throttleMs?: number;
  // Only listen when app is active
  activeOnly?: boolean;
}

export function useOptimizedRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  throttleMs = 1000, // 1 second throttle
  activeOnly = true
}: UseOptimizedRealtimeOptions) {
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Update callbacks when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  // Throttled callback execution
  const executeCallback = useCallback((callback: () => void) => {
    const now = Date.now();
    
    // Clear existing timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }
    
    // Only execute if enough time has passed
    if (now - lastUpdateRef.current >= throttleMs) {
      callback();
      lastUpdateRef.current = now;
    } else {
      // Schedule execution
      throttleTimeoutRef.current = setTimeout(() => {
        callback();
        lastUpdateRef.current = Date.now();
      }, throttleMs - (now - lastUpdateRef.current));
    }
  }, [throttleMs]);

  // Setup channel with optimized settings
  const setupChannel = useCallback(async () => {
    try {
      // Don't setup if app is not active and activeOnly is true
      if (activeOnly && appStateRef.current !== 'active') {
        return;
      }

      const channelName = `optimized-${table}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter && { filter }),
          },
          (payload) => {
            // Only process if app is active
            if (activeOnly && appStateRef.current !== 'active') {
              return;
            }

            try {
              switch (payload.eventType) {
                case 'INSERT':
                  if (callbacksRef.current.onInsert) {
                    executeCallback(() => callbacksRef.current.onInsert?.(payload.new));
                  }
                  break;
                case 'UPDATE':
                  if (callbacksRef.current.onUpdate) {
                    executeCallback(() => callbacksRef.current.onUpdate?.(payload.new));
                  }
                  break;
                case 'DELETE':
                  if (callbacksRef.current.onDelete) {
                    executeCallback(() => callbacksRef.current.onDelete?.(payload.old));
                  }
                  break;
              }
            } catch (err) {
              console.error('Realtime callback error:', err);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Realtime channel ${channelName} error:`, status);
            // Don't auto-reconnect to prevent loops
          }
        });

      return channel;
    } catch (err) {
      console.error('Error setting up realtime channel:', err);
      return null;
    }
  }, [table, filter, activeOnly, executeCallback]);

  // App state change handler
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
      
      // If app becomes active and we have activeOnly enabled, setup channel
      if (activeOnly && nextAppState === 'active') {
        setupChannel();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [activeOnly, setupChannel]);

  // Initial setup
  useEffect(() => {
    const channel = setupChannel();
    
    return () => {
      if (channel) {
        channel.then(ch => {
          if (ch) {
            supabase.removeChannel(ch);
          }
        });
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [setupChannel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);
}

// Optimized listings realtime hook
export function useOptimizedListingsRealtime(onListingUpdate: (listing: any) => void) {
  return useOptimizedRealtime({
    table: 'listings',
    onInsert: async (payload) => {
      // Only process active/reserved listings
      if (payload.status === 'active' || payload.status === 'reserved') {
        onListingUpdate(payload);
      }
    },
    onUpdate: async (payload) => {
      // Only process if status changed to active/reserved or from active/reserved
      if (payload.status === 'active' || payload.status === 'reserved') {
        onListingUpdate(payload);
      } else {
        // Remove from UI if status changed away from active/reserved
        onListingUpdate({ ...payload, _shouldRemove: true });
      }
    },
    throttleMs: 2000, // 2 second throttle for listings
    activeOnly: true
  });
}

// Optimized community realtime hook
export function useOptimizedCommunityRealtime(onPostUpdate: (post: any) => void) {
  useOptimizedRealtime({
    table: 'community_posts',
    onInsert: onPostUpdate,
    onUpdate: onPostUpdate,
    onDelete: (payload) => onPostUpdate({ ...payload, _deleted: true }),
    throttleMs: 1500, // 1.5 second throttle for community posts
    activeOnly: true
  });
  
  // Return empty object for compatibility
  return {
    postsSubscription: null,
    commentsSubscription: null,
    likesSubscription: null
  };
}
