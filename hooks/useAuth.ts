import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, dbHelpers } from '@/lib/supabase';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { AUTH_TIMEOUTS } from '@/constants/auth';

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

  // Add refs to prevent race conditions
  const hasInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    // Get initial session with enhanced error handling
    const initializeAuth = async () => {
      // Prevent double initialization
      if (isInitializingRef.current) {
        console.log('Auth initialization already in progress, skipping...');
        return;
      }
      
      isInitializingRef.current = true;
      
      try {
        console.log('Initializing authentication...');
        
        // Try to get session with retries for app restarts
        let session = null;
        let error = null;
        let attempts = 0;
        const maxAttempts = AUTH_TIMEOUTS.SESSION_FETCH_RETRIES;
        
        while (attempts < maxAttempts && !session && !error) {
          attempts++;
          console.log(`Auth initialization attempt ${attempts}/${maxAttempts}`);
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise<{ data: { session: null }, error: any }>((resolve) => {
            setTimeout(() => {
              console.warn(`⚠️ Auth initialization timeout reached (attempt ${attempts})`);
              resolve({ data: { session: null }, error: new Error('Auth initialization timeout') });
            }, AUTH_TIMEOUTS.SESSION_FETCH);
          });
          
          const authPromise = supabase.auth.getSession();
          
          const result = await Promise.race([authPromise, timeoutPromise]);
          session = result.data.session;
          error = result.error;
          
          // If we got a timeout on first attempt, try again with shorter delay
          if (error && error.message.includes('timeout') && attempts < maxAttempts) {
            console.log('Retrying auth initialization after short delay...');
            await new Promise(resolve => setTimeout(resolve, 500));
            error = null; // Clear error to try again
          }
        }
        
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
        
        // Mark as initialized
        hasInitializedRef.current = true;
        console.log('✅ Auth initialization completed successfully');
        
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
        
        // Mark as initialized even on error
        hasInitializedRef.current = true;
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeAuth();

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'session exists' : 'no session');
        
        // Skip INITIAL_SESSION if we haven't finished initializing
        // This prevents race condition between initializeAuth and listener
        if (event === 'INITIAL_SESSION' && !hasInitializedRef.current) {
          console.log('⏭️ Skipping INITIAL_SESSION - still initializing');
          return;
        }
        
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
        // Skip for USER_UPDATED events (e.g., password changes) to prevent unnecessary profile fetches
        if (session?.user && event !== 'USER_UPDATED') {
          try {
            // Add timeout protection to prevent hanging (3 second timeout)
            const updatePromise = dbHelpers.updateProfile(session.user.id, {
              is_online: true,
              last_seen: new Date().toISOString(),
            });
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
            
            await Promise.race([updatePromise, timeoutPromise]);
          } catch (error) {
            console.warn('Failed to update user online status (non-critical):', error);
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
  };
}