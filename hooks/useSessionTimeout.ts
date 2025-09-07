/**
 * Session Timeout Management Hook
 * Handles session expiry warnings, auto-refresh, and graceful logout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { logSuspiciousActivity } from '@/utils/securityLogger';
import { analyzeAuthError, handleAuthError } from '@/utils/authErrorHandler';

export interface SessionTimeoutConfig {
  warningThresholdMs: number; // Show warning when this much time is left
  refreshThresholdMs: number; // Auto-refresh when this much time is left
  checkIntervalMs: number; // How often to check session status
  maxRefreshAttempts: number; // Maximum auto-refresh attempts
  enableWarnings: boolean; // Show user warnings
  enableAutoRefresh: boolean; // Automatically refresh tokens
}

export interface SessionStatus {
  isValid: boolean;
  expiresAt: number | null;
  timeUntilExpiry: number | null;
  shouldWarn: boolean;
  shouldRefresh: boolean;
  refreshAttempts: number;
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  warningThresholdMs: 5 * 60 * 1000, // 5 minutes
  refreshThresholdMs: 2 * 60 * 1000, // 2 minutes
  checkIntervalMs: 30 * 1000, // 30 seconds
  maxRefreshAttempts: 3,
  enableWarnings: true,
  enableAutoRefresh: true,
};

/**
 * Hook for managing session timeouts with warnings and auto-refresh
 */
export function useSessionTimeout(config: Partial<SessionTimeoutConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { session, user, signOut } = useAuthStore();
  
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isValid: false,
    expiresAt: null,
    timeUntilExpiry: null,
    shouldWarn: false,
    shouldRefresh: false,
    refreshAttempts: 0,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const refreshAttemptsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Calculate session status based on current time and expiry
   */
  const calculateSessionStatus = useCallback((): SessionStatus => {
    if (!session?.expires_at) {
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        shouldWarn: false,
        shouldRefresh: false,
        refreshAttempts: refreshAttemptsRef.current,
      };
    }

    const now = Date.now();
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const timeUntilExpiry = expiresAt - now;

    const isValid = timeUntilExpiry > 0;
    const shouldWarn = isValid && timeUntilExpiry <= fullConfig.warningThresholdMs;
    const shouldRefresh = isValid && timeUntilExpiry <= fullConfig.refreshThresholdMs;

    return {
      isValid,
      expiresAt,
      timeUntilExpiry,
      shouldWarn,
      shouldRefresh,
      refreshAttempts: refreshAttemptsRef.current,
    };
  }, [session, fullConfig.warningThresholdMs, fullConfig.refreshThresholdMs]);

  /**
   * Attempt to refresh the session token
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (isRefreshing || refreshAttemptsRef.current >= fullConfig.maxRefreshAttempts) {
      return false;
    }

    setIsRefreshing(true);
    refreshAttemptsRef.current += 1;

    try {
      console.log(`Attempting session refresh (attempt ${refreshAttemptsRef.current}/${fullConfig.maxRefreshAttempts})`);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error.message);
        
        // Use centralized error handler for proper cleanup
        const errorInfo = analyzeAuthError(error);
        
        if (errorInfo.shouldSignOut) {
          console.log('Invalid refresh token detected, clearing session...');
          
          // Handle the error silently (no user alerts during auto-refresh)
          try {
            await handleAuthError(error);
          } catch (handlerError) {
            console.error('Error handler failed:', handlerError);
          }
          
          // Force sign out to clear corrupted session
          await signOut();
          return false;
        }
        
        // Log suspicious activity if multiple refresh failures (but not for invalid tokens)
        if (refreshAttemptsRef.current >= 2 && errorInfo.type !== 'refresh_token') {
          await logSuspiciousActivity(
            user?.id,
            'multiple_session_refresh_failures',
            {
              attempts: refreshAttemptsRef.current,
              error: error.message,
              errorType: errorInfo.type,
              userId: user?.id,
            }
          );
        }
        
        return false;
      }

      if (data.session) {
        console.log('Session refreshed successfully');
        refreshAttemptsRef.current = 0; // Reset on success
        setWarningShown(false); // Reset warning state
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Session refresh error:', error);
      
      // Handle unexpected errors during refresh
      const errorInfo = analyzeAuthError(error);
      if (errorInfo.shouldSignOut) {
        console.log('Critical error during session refresh, signing out...');
        try {
          await handleAuthError(error);
          await signOut();
        } catch (handlerError) {
          console.error('Failed to handle critical refresh error:', handlerError);
        }
      }
      
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, fullConfig.maxRefreshAttempts, user?.id, signOut]);

  /**
   * Show session expiry warning to user
   */
  const showExpiryWarning = useCallback((timeUntilExpiry: number) => {
    if (warningShown) return;

    const minutes = Math.ceil(timeUntilExpiry / (1000 * 60));
    const timeText = minutes === 1 ? '1 minute' : `${minutes} minutes`;

    Alert.alert(
      'Session Expiring',
      `Your session will expire in ${timeText}. Would you like to extend it?`,
      [
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            signOut();
          },
        },
        {
          text: 'Extend Session',
          onPress: async () => {
            const success = await refreshSession();
            if (!success) {
              Alert.alert(
                'Session Refresh Failed',
                'Unable to extend your session. Please sign in again.',
                [{ text: 'OK', onPress: () => signOut() }]
              );
            }
          },
        },
      ],
      { cancelable: false }
    );

    setWarningShown(true);
  }, [warningShown, refreshSession, signOut]);

  /**
   * Handle session expiry
   */
  const handleSessionExpiry = useCallback(async () => {
    console.log('Session has expired, signing out user');
    
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please sign in again.',
      [{ text: 'OK', onPress: () => signOut() }],
      { cancelable: false }
    );
  }, [signOut]);

  /**
   * Check session status and take appropriate actions
   */
  const checkSessionStatus = useCallback(async () => {
    const status = calculateSessionStatus();
    setSessionStatus(status);

    if (!status.isValid && session) {
      // Session has expired
      await handleSessionExpiry();
      return;
    }

    if (status.shouldRefresh && fullConfig.enableAutoRefresh && !isRefreshing) {
      // Auto-refresh session
      console.log('Auto-refreshing session');
      const success = await refreshSession();
      
      if (!success && status.timeUntilExpiry && status.timeUntilExpiry <= 60000) {
        // If refresh failed and less than 1 minute left, force logout
        await handleSessionExpiry();
      }
    } else if (status.shouldWarn && fullConfig.enableWarnings && !isRefreshing) {
      // Show warning to user
      showExpiryWarning(status.timeUntilExpiry!);
    }
  }, [
    calculateSessionStatus,
    session,
    handleSessionExpiry,
    fullConfig.enableAutoRefresh,
    fullConfig.enableWarnings,
    isRefreshing,
    refreshSession,
    showExpiryWarning,
  ]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, check session immediately
      console.log('App became active, checking session status');
      checkSessionStatus();
    }
    appStateRef.current = nextAppState;
  }, [checkSessionStatus]);

  /**
   * Start session monitoring
   */
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;

    console.log('Starting session timeout monitoring');
    intervalRef.current = setInterval(checkSessionStatus, fullConfig.checkIntervalMs);
    
    // Check immediately
    checkSessionStatus();
  }, [checkSessionStatus, fullConfig.checkIntervalMs]);

  /**
   * Stop session monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      console.log('Stopping session timeout monitoring');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Reset session timeout state
   */
  const resetTimeout = useCallback(() => {
    refreshAttemptsRef.current = 0;
    setWarningShown(false);
    setIsRefreshing(false);
  }, []);

  // Effect to manage session monitoring
  useEffect(() => {
    if (session && user) {
      startMonitoring();
    } else {
      stopMonitoring();
      resetTimeout();
    }

    return () => stopMonitoring();
  }, [session, user, startMonitoring, stopMonitoring, resetTimeout]);

  // Effect to handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    sessionStatus,
    isRefreshing,
    refreshSession,
    resetTimeout,
    startMonitoring,
    stopMonitoring,
    
    // Utility functions
    formatTimeRemaining: (ms: number) => {
      const minutes = Math.ceil(ms / (1000 * 60));
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    },
    
    // Configuration
    config: fullConfig,
  };
}

/**
 * Hook for simple session expiry checking without automatic actions
 */
export function useSessionExpiry() {
  const { session } = useAuthStore();
  
  const getTimeUntilExpiry = useCallback((): number | null => {
    if (!session?.expires_at) return null;
    
    const now = Date.now();
    const expiresAt = session.expires_at * 1000;
    return Math.max(0, expiresAt - now);
  }, [session]);

  const isExpiringSoon = useCallback((thresholdMs: number = 5 * 60 * 1000): boolean => {
    const timeLeft = getTimeUntilExpiry();
    return timeLeft !== null && timeLeft <= thresholdMs && timeLeft > 0;
  }, [getTimeUntilExpiry]);

  const isExpired = useCallback((): boolean => {
    const timeLeft = getTimeUntilExpiry();
    return timeLeft !== null && timeLeft <= 0;
  }, [getTimeUntilExpiry]);

  return {
    getTimeUntilExpiry,
    isExpiringSoon,
    isExpired,
    session,
  };
}
