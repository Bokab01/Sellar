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

  // Note: Removed global console.error interceptor as it was causing
  // "Text strings must be rendered within a <Text> component" errors
  // due to conflicts with Sentry and React Native's error handling.
  // Refresh token errors are now handled by the auth state listener above.
}
