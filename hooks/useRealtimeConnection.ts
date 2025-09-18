import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';

interface RealtimeConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  lastConnectedAt: number | null;
  connectionError: string | null;
}

interface UseRealtimeConnectionOptions {
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useRealtimeConnection(options: UseRealtimeConnectionOptions = {}) {
  const {
    onConnectionLost,
    onConnectionRestored,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  const [state, setState] = useState<RealtimeConnectionState>({
    isConnected: false,
    isReconnecting: false,
    lastConnectedAt: null,
    connectionError: null,
  });

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacksRef = useRef({ onConnectionLost, onConnectionRestored });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onConnectionLost, onConnectionRestored };
  }, [onConnectionLost, onConnectionRestored]);

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const channels = supabase.getChannels();
      const hasActiveChannels = channels.some(channel => 
        channel.state === 'joined' || channel.state === 'joining'
      );

      if (hasActiveChannels && !state.isConnected) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          lastConnectedAt: Date.now(),
          connectionError: null,
          isReconnecting: false,
        }));
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onConnectionRestored?.();
      } else if (!hasActiveChannels && state.isConnected) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          connectionError: 'No active real-time channels',
        }));
        callbacksRef.current.onConnectionLost?.();
      }
    } catch (error) {
      console.error('🔗 Error checking real-time connection:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionError: error instanceof Error ? error.message : 'Connection check failed',
      }));
    }
  }, []);

  // Attempt to reconnect
  const attemptReconnect = useCallback(async () => {
    if (state.isReconnecting || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      return;
    }

    setState(prev => ({ ...prev, isReconnecting: true }));
    reconnectAttemptsRef.current += 1;

    console.log(`🔗 Attempting to reconnect real-time channels (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);

    try {
      // Get all channels and attempt to reconnect them
      const channels = supabase.getChannels();
      
      if (channels.length === 0) {
        console.log('🔗 No channels to reconnect');
        setState(prev => ({ ...prev, isReconnecting: false }));
        return;
      }

      // Unsubscribe and resubscribe to all channels
      const reconnectPromises = channels.map(async (channel) => {
        try {
          await channel.unsubscribe();
          await new Promise(resolve => setTimeout(resolve, 100));
          return channel.subscribe();
        } catch (error) {
          console.error('🔗 Error reconnecting channel:', error);
          return null;
        }
      });

      await Promise.allSettled(reconnectPromises);
      
      // Check connection after a delay
      setTimeout(() => {
        checkConnection();
      }, 1000);

    } catch (error) {
      console.error('🔗 Reconnection attempt failed:', error);
      setState(prev => ({
        ...prev,
        isReconnecting: false,
        connectionError: error instanceof Error ? error.message : 'Reconnection failed',
      }));

      // Schedule next attempt if we haven't exceeded max attempts
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          attemptReconnect();
        }, reconnectInterval);
      }
    }
  }, [state.isReconnecting, maxReconnectAttempts, reconnectInterval]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('🔗 App state changed:', appStateRef.current, '->', nextAppState);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔗 App came to foreground, checking real-time connection...');
        
        // Clear any existing timeouts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Check connection status
        setTimeout(() => {
          checkConnection();
        }, 500);

        // If not connected, attempt to reconnect
        if (!state.isConnected) {
          setTimeout(() => {
            attemptReconnect();
          }, 1000);
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Periodic connection check
  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up periodic checks
    connectionCheckIntervalRef.current = setInterval(() => {
      if (state.isConnected) {
        checkConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
        connectionCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, []);

  // Manual reconnect function
  const forceReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    attemptReconnect();
  }, [attemptReconnect]);

  return {
    ...state,
    forceReconnect,
    checkConnection,
  };
}
