import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, dbHelpers } from '@/lib/supabase';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { useSessionTimeout } from './useSessionTimeout';
import { useDeepLinkAuth } from './useDeepLinkAuth';

export function useAuth() {
  const { 
    user, 
    session, 
    loading, 
    signIn, 
    signInWithMagicLink,
    signUp, 
    forgotPassword, 
    resetPassword, 
    resendVerification, 
    signOut,
    setUser,
    setSession,
    setLoading
  } = useAuthStore();

  // Initialize session timeout monitoring
  const { sessionStatus, isRefreshing } = useSessionTimeout({
    enableWarnings: true,
    enableAutoRefresh: true,
    warningThresholdMs: 5 * 60 * 1000, // 5 minutes
    refreshThresholdMs: 2 * 60 * 1000, // 2 minutes
  });

  // Initialize deep link authentication
  const { state: deepLinkState, processAuthDeepLink } = useDeepLinkAuth();

  useEffect(() => {
    // Get initial session with proper error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Auth initialization error:', error.message);
          
          // Use the centralized error handler
          const result = await handleAuthError(error);
          
          if (result.handled) {
            console.log('Auth error handled:', result.message);
            
            // Set auth state to unauthenticated
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          // For unhandled errors, still try to continue
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Session retrieved successfully
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
      } catch (error) {
        console.error('Unexpected error during auth initialization:', error);
        // Fallback to unauthenticated state
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'session exists' : 'no session');
        
        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update user online status only if we have a valid session
        if (session?.user && event !== 'SIGNED_OUT') {
          try {
            await dbHelpers.updateProfile(session.user.id, {
              is_online: true,
              last_seen: new Date().toISOString(),
            });
          } catch (error) {
            console.warn('Failed to update user online status:', error);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Keep empty - Zustand functions are stable

  return {
    user,
    session,
    loading,
    signIn,
    signInWithMagicLink,
    signUp,
    forgotPassword,
    resetPassword,
    resendVerification,
    signOut,
    isAuthenticated: !!user,
    // Session timeout information
    sessionStatus,
    isRefreshing,
    // Deep link authentication
    deepLinkState,
    processAuthDeepLink,
  };
}