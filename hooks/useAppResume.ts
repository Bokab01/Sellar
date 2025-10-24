import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase-client';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

interface UseAppResumeOptions {
  /**
   * Callback to execute when app resumes from background
   * This will only be called if the screen is currently visible/focused
   */
  onResume?: () => void | Promise<void>;
  
  /**
   * Whether to automatically refresh auth session on resume
   * @default true
   */
  refreshSession?: boolean;
  
  /**
   * Whether to reconnect realtime channels on resume
   * @default true
   */
  reconnectRealtime?: boolean;
  
  /**
   * Debounce time in ms to prevent multiple rapid calls
   * @default 1000
   */
  debounceMs?: number;
  
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

interface AppResumeState {
  isRefreshing: boolean;
  isReconnecting: boolean;
  lastResumeTime: number | null;
  error: string | null;
}

// Global state to track active screens and prevent duplicate operations
const activeScreens = new Set<string>();
const globalResumeState = {
  isSessionRefreshing: false,
  isRealtimeReconnecting: false,
  lastGlobalResumeTime: 0,
};

/**
 * Hook for handling app background → foreground transitions
 * 
 * Features:
 * - Automatic Supabase auth session refresh
 * - Realtime channel reconnection
 * - Screen-specific callbacks with focus detection
 * - Error handling with login redirect
 * - Debouncing to prevent duplicate operations
 * - Loading state management
 */
export function useAppResume(options: UseAppResumeOptions = {}) {
  const {
    onResume,
    refreshSession = true,
    reconnectRealtime = true,
    debounceMs = 1000,
    debug = false,
  } = options;

  const { user, session, signOut, setSession, setUser } = useAuthStore();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const screenIdRef = useRef<string>(`screen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const isScreenFocusedRef = useRef<boolean>(false);
  const lastResumeTimeRef = useRef<number>(0);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [state, setState] = useState<AppResumeState>({
    isRefreshing: false,
    isReconnecting: false,
    lastResumeTime: null,
    error: null,
  });

  const log = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[useAppResume:${screenIdRef.current.slice(-6)}] ${message}`, ...args);
    }
  }, [debug]);

  /**
   * Refresh Supabase auth session
   */
  const refreshAuthSession = useCallback(async (): Promise<boolean> => {
    if (!user || !session || globalResumeState.isSessionRefreshing) {
      log('Skipping session refresh - no user/session or already refreshing');
      return true;
    }

    globalResumeState.isSessionRefreshing = true;
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      log('Refreshing auth session...');
      
      // First check if current session is still valid
      const { data: currentSession, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        log('Session check failed:', sessionError);
        throw sessionError;
      }

      if (!currentSession.session) {
        log('No active session found, redirecting to login');
        await signOut();
        router.replace('/(auth)/sign-in');
        return false;
      }

      // Check if session is expired or needs refresh
      const expiresAt = currentSession.session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

      log('Session expires in:', timeUntilExpiry, 'seconds');

      // If session expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 300) {
        log('Session needs refresh, attempting refresh...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          log('Session refresh failed:', refreshError);
          
          const errorInfo = analyzeAuthError(refreshError);
          
          if (errorInfo.shouldSignOut) {
            log('Invalid refresh token, signing out...');
            await signOut();
            router.replace('/(auth)/sign-in');
            return false;
          }
          
          throw refreshError;
        }

        if (refreshData.session) {
          log('Session refreshed successfully');
          setSession(refreshData.session);
          setUser(refreshData.session.user);
        }
      } else {
        log('Session is still valid, no refresh needed');
      }

      return true;

    } catch (error) {
      log('Session refresh error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Session refresh failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      // Handle auth errors
      try {
        await handleAuthError(error);
      } catch (handlerError) {
        log('Error handler failed:', handlerError);
      }
      
      return false;
    } finally {
      globalResumeState.isSessionRefreshing = false;
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [user, session, signOut, setSession, setUser, log]);

  /**
   * Reconnect Supabase realtime channels
   */
  const reconnectRealtimeChannels = useCallback(async (): Promise<boolean> => {
    if (!user || globalResumeState.isRealtimeReconnecting) {
      log('Skipping realtime reconnection - no user or already reconnecting');
      return true;
    }

    globalResumeState.isRealtimeReconnecting = true;
    setState(prev => ({ ...prev, isReconnecting: true }));

    try {
      log('🔗 Checking realtime channel states...');
      
      // Get all active channels
      const channels = supabase.getChannels();
      log(`🔗 Found ${channels.length} active channels`);

      if (channels.length === 0) {
        log('🔗 No channels to check');
        return true;
      }

      // Just log channel states - let individual hooks handle their own reconnection
      let healthyCount = 0;
      let unhealthyCount = 0;
      
      for (const channel of channels) {
        try {
          const channelState = channel.state;
          
          if (channelState === 'joined') {
            healthyCount++;
            log(`✅ Channel "${channel.topic}" is healthy`);
          } else {
            unhealthyCount++;
            log(`⚠️ Channel "${channel.topic}" state: ${channelState} - will be handled by its hook`);
            
            // For channels in bad states, remove them so individual hooks can recreate
            await supabase.removeChannel(channel);
            log(`🗑️ Removed unhealthy channel "${channel.topic}" - hook will recreate it`);
          }
        } catch (error) {
          log(`❌ Error checking channel "${channel.topic}":`, error);
        }
      }
      
      log(`🔗 Channel health summary: ${healthyCount} healthy, ${unhealthyCount} unhealthy (removed for recreation)`);
      
      // Wait a moment to allow individual hooks to detect and recreate their channels
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;

    } catch (error) {
      log('❌ Realtime channel check error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Realtime check failed' 
      }));
      return false;
    } finally {
      globalResumeState.isRealtimeReconnecting = false;
      setState(prev => ({ ...prev, isReconnecting: false }));
    }
  }, [user, log]);

  /**
   * Handle app resume with debouncing and focus detection
   */
  const handleAppResume = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastResume = now - lastResumeTimeRef.current;
    const timeSinceGlobalResume = now - globalResumeState.lastGlobalResumeTime;

    // Debounce rapid resume events
    if (timeSinceLastResume < debounceMs || timeSinceGlobalResume < debounceMs) {
      log('Debouncing resume event, too soon since last resume');
      return;
    }

    // Only proceed if screen is focused
    if (!isScreenFocusedRef.current) {
      log('Screen not focused, skipping resume callback');
      return;
    }

    lastResumeTimeRef.current = now;
    globalResumeState.lastGlobalResumeTime = now;

    log('Handling app resume...');
    setState(prev => ({ ...prev, lastResumeTime: now, error: null }));

    try {
      // 1. Refresh auth session if enabled
      if (refreshSession) {
        const sessionSuccess = await refreshAuthSession();
        if (!sessionSuccess) {
          log('Session refresh failed, aborting resume handling');
          return;
        }
      }

      // 2. Reconnect realtime channels if enabled
      if (reconnectRealtime) {
        await reconnectRealtimeChannels();
      }

      // 3. Execute screen-specific callback
      if (onResume) {
        log('Executing screen resume callback...');
        try {
          await onResume();
          log('Screen resume callback completed');
        } catch (error) {
          log('Screen resume callback error:', error);
          setState(prev => ({ 
            ...prev, 
            error: error instanceof Error ? error.message : 'Resume callback failed' 
          }));
        }
      }

    } catch (error) {
      log('App resume handling error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'App resume failed' 
      }));
    }
  }, [refreshSession, reconnectRealtime, onResume, refreshAuthSession, reconnectRealtimeChannels, debounceMs, log]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    log('App state changed:', appStateRef.current, '->', nextAppState);
    
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      log('App came to foreground, scheduling resume handling...');
      
      // Clear any existing timeout
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      
      // Schedule resume handling with a small delay to ensure app is fully active
      resumeTimeoutRef.current = setTimeout(() => {
        handleAppResume();
      }, 100);
    }
    
    appStateRef.current = nextAppState;
  }, [handleAppResume, log]);

  // Track screen focus state
  useFocusEffect(
    useCallback(() => {
      const screenId = screenIdRef.current;
      log('Screen focused, registering as active');
      
      isScreenFocusedRef.current = true;
      activeScreens.add(screenId);

      return () => {
        log('Screen unfocused, unregistering as active');
        isScreenFocusedRef.current = false;
        activeScreens.delete(screenId);
      };
    }, [log])
  );

  // Set up app state listener
  useEffect(() => {
    log('Setting up app state listener');
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      log('Cleaning up app state listener');
      subscription?.remove();
      
      // Clear timeout on unmount
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [handleAppStateChange, log]);

  // Manual refresh function for external use
  const manualRefresh = useCallback(async () => {
    log('Manual refresh requested');
    await handleAppResume();
  }, [handleAppResume, log]);

  return {
    ...state,
    manualRefresh,
    isActive: isScreenFocusedRef.current,
    activeScreensCount: activeScreens.size,
  };
}

export default useAppResume;
