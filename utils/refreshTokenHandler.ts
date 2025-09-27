import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { analyzeAuthError } from './authErrorHandler';

/**
 * Handles refresh token errors and implements automatic recovery
 */
export class RefreshTokenHandler {
  private static isRecovering = false;

  /**
   * Handles refresh token errors with automatic recovery
   */
  static async handleRefreshTokenError(error: any): Promise<boolean> {
    const errorInfo = analyzeAuthError(error);
    
    if (errorInfo.type !== 'refresh_token') {
      return false; // Not a refresh token error
    }

    if (this.isRecovering) {
      console.log('Already recovering from refresh token error, skipping...');
      return true;
    }

    this.isRecovering = true;

    try {
      console.log('Handling refresh token error:', errorInfo.message);
      
      // Clear the corrupted session
      await this.clearCorruptedSession();
      
      // Update auth store to reflect signed out state
      const { setUser, setSession, setLoading } = useAuthStore.getState();
      setUser(null);
      setSession(null);
      setLoading(false);
      
      console.log('Successfully recovered from refresh token error');
      return true;
      
    } catch (recoveryError) {
      console.error('Failed to recover from refresh token error:', recoveryError);
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Clears corrupted session data
   */
  private static async clearCorruptedSession(): Promise<void> {
    try {
      // Sign out locally to clear session
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear any stored auth data
      const { clearStoredAuthData } = await import('./authErrorHandler');
      await clearStoredAuthData();
      
    } catch (error) {
      console.error('Error clearing corrupted session:', error);
      throw error;
    }
  }

  /**
   * Wraps Supabase operations with refresh token error handling
   */
  static async withRefreshTokenHandling<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRefreshTokenError = await this.handleRefreshTokenError(error);
      
      if (isRefreshTokenError) {
        // Re-throw a more user-friendly error
        throw new Error('Session expired. Please sign in again.');
      }
      
      // Re-throw the original error if it's not a refresh token issue
      throw error;
    }
  }
}

/**
 * Higher-order function to wrap Supabase operations with refresh token handling
 */
export function withRefreshTokenHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    return RefreshTokenHandler.withRefreshTokenHandling(
      () => fn(...args),
      context
    );
  };
}
