import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase, dbHelpers } from '@/lib/supabase';

export function useAuth() {
  const { 
    user, 
    session, 
    loading, 
    signIn, 
    signUp, 
    forgotPassword, 
    resetPassword, 
    resendVerification, 
    signOut, 
    setUser, 
    setSession, 
    setLoading 
  } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update user online status
        if (session?.user) {
          await dbHelpers.updateProfile(session.user.id, {
            is_online: true,
            last_seen: new Date().toISOString(),
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    forgotPassword,
    resetPassword,
    resendVerification,
    signOut,
    isAuthenticated: !!user,
  };
}