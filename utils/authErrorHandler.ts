import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { clearAllAuthData } from './authCleanup';

export interface AuthErrorInfo {
  type: 'refresh_token' | 'network' | 'session' | 'unknown';
  message: string;
  shouldSignOut: boolean;
  shouldRetry: boolean;
}

/**
 * Analyzes authentication errors and provides appropriate handling strategy
 */
export function analyzeAuthError(error: any): AuthErrorInfo {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  
  // Refresh token errors
  if (errorMessage.includes('Invalid Refresh Token') || 
      errorMessage.includes('Refresh Token Not Found') ||
      errorMessage.includes('refresh_token_not_found') ||
      errorMessage.includes('invalid_refresh_token')) {
    return {
      type: 'refresh_token',
      message: 'Session expired. Please sign in again.',
      shouldSignOut: true,
      shouldRetry: false,
    };
  }
  
  // Network/connectivity errors
  if (errorMessage.includes('Network Error') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')) {
    return {
      type: 'network',
      message: 'Network connection issue. Please check your internet connection.',
      shouldSignOut: false,
      shouldRetry: true,
    };
  }
  
  // Email verification errors
  if (errorMessage.includes('Email not confirmed') ||
      errorMessage.includes('email not confirmed') ||
      errorMessage.includes('Email not verified') ||
      errorMessage.includes('email not verified') ||
      errorMessage.includes('confirm your email') ||
      errorMessage.includes('verify your email')) {
    return {
      type: 'session',
      message: 'Email not confirmed. Please check your email and click the confirmation link.',
      shouldSignOut: false,
      shouldRetry: false,
    };
  }
  
  // Session-related errors
  if (errorMessage.includes('session') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('401')) {
    return {
      type: 'session',
      message: 'Session invalid. Please sign in again.',
      shouldSignOut: true,
      shouldRetry: false,
    };
  }
  
  // Unknown errors
  return {
    type: 'unknown',
    message: errorMessage,
    shouldSignOut: false,
    shouldRetry: false,
  };
}

/**
 * Handles authentication errors with appropriate recovery strategies
 */
export async function handleAuthError(error: any): Promise<{
  handled: boolean;
  shouldRedirect: boolean;
  message?: string;
}> {
  const errorInfo = analyzeAuthError(error);
  
  console.warn(`Auth error detected [${errorInfo.type}]:`, errorInfo.message);
  
  try {
    if (errorInfo.shouldSignOut) {
      console.log('Clearing invalid session...');
      
      // Use unified cleanup function
      await clearAllAuthData();
      
      return {
        handled: true,
        shouldRedirect: true,
        message: errorInfo.message,
      };
    }
    
    if (errorInfo.shouldRetry) {
      console.log('Network error detected, will retry...');
      return {
        handled: true,
        shouldRedirect: false,
        message: errorInfo.message,
      };
    }
    
    return {
      handled: false,
      shouldRedirect: false,
      message: errorInfo.message,
    };
    
  } catch (recoveryError) {
    console.error('Error during auth error recovery:', recoveryError);
    return {
      handled: false,
      shouldRedirect: false,
      message: 'Failed to recover from authentication error',
    };
  }
}

/**
 * Clears all stored authentication-related data
 * @deprecated Use clearAllAuthData from authCleanup instead
 */
export async function clearStoredAuthData(): Promise<void> {
  await clearAllAuthData();
}

/**
 * Silently recovers from corrupted sessions during app initialization
 */
export async function recoverFromCorruptedSession(): Promise<{
  recovered: boolean;
  cleanState: boolean;
  error?: string;
}> {
  try {
    console.log('Attempting session recovery...');
    
    // Try to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      const errorInfo = analyzeAuthError(error);
      
      if (errorInfo.shouldSignOut) {
        console.log('Corrupted session detected, clearing silently...');
        
        // Clear session silently using unified cleanup
        await clearAllAuthData();
        
        return {
          recovered: true,
          cleanState: true,
        };
      }
      
      return {
        recovered: false,
        cleanState: false,
        error: errorInfo.message,
      };
    }
    
    // Session is valid or null
    return {
      recovered: true,
      cleanState: !session, // Clean if no session, authenticated if session exists
    };
    
  } catch (error: any) {
    console.error('Session recovery failed:', error);
    
    // Force clean state on recovery failure using unified cleanup
    try {
      await clearAllAuthData();
    } catch (cleanupError) {
      console.error('Failed to cleanup after recovery failure:', cleanupError);
    }
    
    return {
      recovered: true,
      cleanState: true,
      error: 'Forced clean state after recovery failure',
    };
  }
}

/**
 * Validates if a session is still valid
 */
export async function validateSession(): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      const errorInfo = analyzeAuthError(error);
      return {
        isValid: false,
        error: errorInfo.message,
      };
    }
    
    if (!session) {
      return {
        isValid: false,
        error: 'No active session',
      };
    }
    
    // Check if session is expired
    const expiresAt = session.expires_at;
    if (expiresAt && Date.now() / 1000 > expiresAt) {
      return {
        isValid: false,
        error: 'Session expired',
      };
    }
    
    return { isValid: true };
    
  } catch (error) {
    const errorInfo = analyzeAuthError(error);
    return {
      isValid: false,
      error: errorInfo.message,
    };
  }
}

/**
 * Retry mechanism for auth operations
 */
export async function retryAuthOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorInfo = analyzeAuthError(error);
      
      // Don't retry if it's a refresh token error
      if (!errorInfo.shouldRetry || attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Auth operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError;
}
