import { supabase } from './supabase';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Global auth error interceptor
 * Handles refresh token errors and other auth failures gracefully
 */

let isHandlingAuthError = false; // Prevent multiple simultaneous error handlers

export const setupAuthErrorInterceptor = () => {
  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);

    if (event === 'TOKEN_REFRESHED') {
      console.log('✅ Token refreshed successfully');
      isHandlingAuthError = false;
    }

    if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      isHandlingAuthError = false;
      // Clear any stored data
      await clearUserData();
    }
  });
};

/**
 * Handle auth errors gracefully
 */
export const handleAuthError = async (error: any): Promise<boolean> => {
  // Prevent multiple simultaneous error handlers
  if (isHandlingAuthError) {
    return false;
  }

  const errorMessage = error?.message || error?.toString() || '';
  const isRefreshTokenError = 
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('Refresh Token Not Found') ||
    errorMessage.includes('refresh_token_not_found') ||
    error?.status === 401;

  if (isRefreshTokenError) {
    isHandlingAuthError = true;
    console.log('🔐 Refresh token error detected, handling gracefully...');

    try {
      // Try to refresh the session one more time
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && data.session) {
        console.log('✅ Session refreshed successfully');
        isHandlingAuthError = false;
        return true; // Successfully recovered
      }

      // If refresh fails, sign out and redirect to login
      console.log('❌ Session refresh failed, signing out user');
      await handleSessionExpired();
      return false;
    } catch (err) {
      console.error('Error during session refresh:', err);
      await handleSessionExpired();
      return false;
    }
  }

  return false; // Not an auth error we handle
};

/**
 * Handle expired session
 */
const handleSessionExpired = async () => {
  try {
    // Sign out the user
    await supabase.auth.signOut();
    
    // Clear user data
    await clearUserData();

    // Show user-friendly message
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please sign in again to continue.',
      [
        {
          text: 'Sign In',
          onPress: () => {
            // Navigate to login screen
            try {
              router.replace('/sign-in' as any);
            } catch (navError) {
              console.log('Navigation error (safe to ignore):', navError);
            }
          },
        },
      ],
      { cancelable: false }
    );
  } catch (error) {
    console.error('Error handling session expiration:', error);
  } finally {
    isHandlingAuthError = false;
  }
};

/**
 * Clear user data from AsyncStorage
 */
const clearUserData = async () => {
  try {
    const keysToKeep = [
      '@theme', // Keep theme preference
      '@onboarding_complete', // Keep onboarding status
    ];

    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('✅ User data cleared');
    }
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

/**
 * Wrap API calls with auth error handling
 */
export const withAuthErrorHandling = async <T>(
  operation: () => Promise<T>
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const handled = await handleAuthError(error);
    
    if (!handled) {
      // If not an auth error or couldn't be handled, rethrow
      throw error;
    }
    
    // If handled, retry the operation once
    try {
      return await operation();
    } catch (retryError) {
      throw retryError;
    }
  }
};

/**
 * Check if current session is valid
 */
export const isSessionValid = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return false;
    }

    // Check if token is expired
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      console.log('Session expired, attempting refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      return !refreshError && !!refreshData.session;
    }

    return true;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
};
