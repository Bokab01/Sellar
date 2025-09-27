import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshTokenHandler } from '@/utils/refreshTokenHandler';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Hook to handle refresh token errors globally
 */
export function useRefreshTokenError() {
  const { setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          setSession(session);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user);
          setSession(session);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setSession, setLoading]);

  // Global error handler for Supabase operations
  useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      // Check if this is a refresh token error
      const errorMessage = args.join(' ');
      if (errorMessage.includes('Invalid Refresh Token') || 
          errorMessage.includes('Refresh Token Not Found')) {
        
        // Handle the refresh token error
        RefreshTokenHandler.handleRefreshTokenError(new Error(errorMessage));
      }
      
      // Call the original console.error
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);
}
