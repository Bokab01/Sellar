/**
 * Deep Link Authentication Hook
 * Handles incoming deep links for email confirmation and magic link login
 */

import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { handleAuthDeepLink, isAuthDeepLink } from '@/utils/deepLinkUtils';
import { useAuthStore } from '@/store/useAuthStore';
import { logSuspiciousActivity } from '@/utils/securityLogger';

export interface DeepLinkAuthState {
  isProcessing: boolean;
  lastProcessedUrl: string | null;
  error: string | null;
}

export interface DeepLinkAuthResult {
  success: boolean;
  type: 'email_confirmation' | 'magic_link' | 'password_reset' | 'unknown';
  user?: any;
  session?: any;
  error?: string;
}

/**
 * Hook for handling authentication deep links
 */
export function useDeepLinkAuth() {
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  
  const [state, setState] = useState<DeepLinkAuthState>({
    isProcessing: false,
    lastProcessedUrl: null,
    error: null,
  });

  const processedUrls = useRef<Set<string>>(new Set());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Process an authentication deep link
   */
  const processAuthDeepLink = async (url: string): Promise<DeepLinkAuthResult> => {
    // Prevent processing the same URL multiple times
    if (processedUrls.current.has(url)) {
      console.log('URL already processed, skipping:', url);
      return {
        success: false,
        type: 'unknown',
        error: 'URL already processed',
      };
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      console.log('Processing auth deep link:', url);
      
      const result = await handleAuthDeepLink(url);
      
      if (result.success && result.user && result.session) {
        // Update auth state
        setUser(result.user);
        setSession(result.session);
        
        // Mark URL as processed
        processedUrls.current.add(url);
        
        setState(prev => ({
          ...prev,
          isProcessing: false,
          lastProcessedUrl: url,
          error: null,
        }));

        // Show success message
        Alert.alert(
          'Welcome!',
          'You have been successfully signed in.',
          [{ text: 'OK' }]
        );

        // Navigate to appropriate screen
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 1000);

        return {
          success: true,
          type: 'email_confirmation', // Default, could be determined from result
          user: result.user,
          session: result.session,
        };
      } else {
        const errorMessage = result.error || 'Authentication failed';
        
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: errorMessage,
        }));

        // Show error message
        Alert.alert(
          'Authentication Error',
          errorMessage,
          [{ text: 'OK' }]
        );

        return {
          success: false,
          type: 'unknown',
          error: errorMessage,
        };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to process authentication link';
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));

      console.error('Deep link processing error:', error);
      
      // Log suspicious activity for repeated failures
      await logSuspiciousActivity(
        undefined,
        'deep_link_processing_failure',
        {
          url: url.substring(0, 100), // Truncate for security
          error: errorMessage,
          timestamp: new Date().toISOString(),
        }
      );

      Alert.alert(
        'Error',
        'Failed to process authentication link. Please try again.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        type: 'unknown',
        error: errorMessage,
      };
    }
  };

  /**
   * Handle incoming URL
   */
  const handleIncomingUrl = async (url: string) => {
    console.log('Received deep link:', url);
    
    if (isAuthDeepLink(url)) {
      console.log('Processing auth deep link...');
      await processAuthDeepLink(url);
    } else {
      console.log('Non-auth deep link, ignoring:', url);
    }
  };

  /**
   * Handle app state changes
   */
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, check for pending deep links
      console.log('App became active, checking for pending deep links');
      
      Linking.getInitialURL().then(url => {
        if (url && isAuthDeepLink(url) && !processedUrls.current.has(url)) {
          console.log('Found pending deep link:', url);
          handleIncomingUrl(url);
        }
      }).catch(error => {
        console.error('Error checking initial URL:', error);
      });
    }
    appStateRef.current = nextAppState;
  };

  /**
   * Clear processed URLs (for testing or cleanup)
   */
  const clearProcessedUrls = () => {
    processedUrls.current.clear();
    setState(prev => ({
      ...prev,
      lastProcessedUrl: null,
      error: null,
    }));
  };

  /**
   * Manually process a deep link (for testing)
   */
  const manuallyProcessDeepLink = async (url: string): Promise<DeepLinkAuthResult> => {
    return await processAuthDeepLink(url);
  };

  // Set up deep link listeners
  useEffect(() => {
    let isActive = true;

    // Handle initial URL (when app is opened via deep link)
    Linking.getInitialURL().then(url => {
      if (isActive && url) {
        console.log('Initial URL:', url);
        handleIncomingUrl(url);
      }
    }).catch(error => {
      console.error('Error getting initial URL:', error);
    });

    // Handle incoming URLs (when app is already running)
    const subscription = Linking.addEventListener('url', (event) => {
      if (isActive) {
        handleIncomingUrl(event.url);
      }
    });

    // Handle app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isActive = false;
      subscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  return {
    state,
    processAuthDeepLink,
    clearProcessedUrls,
    manuallyProcessDeepLink,
    
    // Utility functions
    isProcessing: state.isProcessing,
    lastProcessedUrl: state.lastProcessedUrl,
    error: state.error,
  };
}

/**
 * Simple hook for just listening to auth deep links
 */
export function useAuthDeepLinkListener() {
  const { processAuthDeepLink } = useDeepLinkAuth();
  
  return {
    processAuthDeepLink,
  };
}
