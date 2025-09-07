import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, dbHelpers } from '@/lib/supabase';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { useSessionTimeout } from './useSessionTimeout';

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


  useEffect(() => {
    // Get initial session with enhanced error handling
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Auth initialization error:', error.message);
          
          // Analyze the error type
          const errorInfo = analyzeAuthError(error);
          
          if (errorInfo.type === 'refresh_token') {
            console.log('Corrupted refresh token detected during initialization, clearing silently...');
            
            // Handle refresh token errors silently during app startup
            try {
              await handleAuthError(error);
            } catch (handlerError) {
              console.error('Error handler failed during initialization:', handlerError);
            }
            
            // Set clean unauthenticated state
            setSession(null);
            setUser(null);
            setLoading(false);
            console.log('App initialized with clean unauthenticated state');
            return;
          }
          
          // Use the centralized error handler for other errors
          const result = await handleAuthError(error);
          
          if (result.handled) {
            console.log('Auth error handled during initialization:', result.message);
          }
          
          // Set auth state to unauthenticated
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Validate session if it exists
        if (session) {
          // Check if session is expired
          const now = Date.now();
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          
          if (expiresAt > 0 && now >= expiresAt) {
            console.log('Session expired during initialization, clearing...');
            await supabase.auth.signOut({ scope: 'local' });
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          console.log('Valid session found, user authenticated');
        } else {
          console.log('No session found, user unauthenticated');
        }
        
        // Session retrieved successfully (or null)
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
      } catch (error: any) {
        console.error('Unexpected error during auth initialization:', error);
        
        // Handle any unexpected errors gracefully
        try {
          const errorInfo = analyzeAuthError(error);
          if (errorInfo.shouldSignOut) {
            await handleAuthError(error);
          }
        } catch (handlerError) {
          console.error('Failed to handle unexpected initialization error:', handlerError);
        }
        
        // Fallback to clean unauthenticated state
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
        } else if (!session && event !== 'INITIAL_SESSION') {
          console.log('User signed out or session cleared');
          // Clear any remaining session data
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
        }
        
        // Validate session before setting it
        if (session) {
          // Check if session is valid and not expired
          const now = Date.now();
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          
          if (expiresAt > 0 && now >= expiresAt) {
            console.log('Received expired session, ignoring...');
            return;
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update user online status only if we have a valid session
        if (session?.user) {
          try {
            await dbHelpers.updateProfile(session.user.id, {
              is_online: true,
              last_seen: new Date().toISOString(),
            });
          } catch (error) {
            console.warn('Failed to update user online status:', error);
            // Don't throw error for non-critical profile updates
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
  };
}