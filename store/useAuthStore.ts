import { create } from 'zustand';
import { supabase, dbHelpers } from '@/lib/supabase';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { networkUtils } from '@/utils/networkRetry';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: { firstName: string; lastName: string; phone?: string; location?: string; acceptedTerms?: boolean; referralCode?: string }) => Promise<{ error?: string }>;
  forgotPassword: (email: string) => Promise<{ error?: string }>;
  resetPassword: (password: string) => Promise<{ error?: string }>;
  resendVerification: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await networkUtils.supabaseWithRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        'user_signin'
      );

      if (error) {
        const errorInfo = analyzeAuthError(error);
        console.warn('Sign in error:', errorInfo.message);
        return { error: errorInfo.message };
      }

      return {};
    } catch (error) {
      const errorInfo = analyzeAuthError(error);
      console.error('Sign in catch error:', errorInfo.message);
      return { error: errorInfo.message };
    }
  },

  signInWithMagicLink: async (email: string) => {
    try {
      const { error } = await networkUtils.supabaseWithRetry(
        () => supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: 'https://sellar.app/auth/callback',
          },
        }),
        'magic_link_signin'
      );

      if (error) {
        const errorInfo = analyzeAuthError(error);
        console.warn('Magic link sign in error:', errorInfo.message);
        return { error: errorInfo.message };
      }

      return {};
    } catch (error) {
      const errorInfo = analyzeAuthError(error);
      console.error('Magic link sign in catch error:', errorInfo.message);
      return { error: errorInfo.message };
    }
  },

  signUp: async (email: string, password: string, userData: { firstName: string; lastName: string; phone?: string; location?: string; acceptedTerms?: boolean; referralCode?: string }) => {
    try {
      console.log('Attempting signup with:', { email, userData });
      
      const { data, error } = await networkUtils.supabaseWithRetry(
        () => supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://sellar.app/auth/callback',
            data: {
              firstName: userData.firstName,
              lastName: userData.lastName,
              phone: userData.phone || null,
              location: userData.location || 'Accra, Greater Accra',
              is_business: false,
              accepted_terms: userData.acceptedTerms || false,
              referral_code: userData.referralCode || null,
            },
          },
        }),
        'user_signup'
      );
      
      console.log('Raw Supabase signup response:', {
        data: data ? {
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            created_at: data.user.created_at
          } : null,
          session: data.session ? 'exists' : null
        } : null,
        error: error ? {
          message: error.message,
          status: error.status,
          code: error.code
        } : null
      });

      if (error) {
        console.error('Sign up error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        
        // Provide more specific error messages
        if (error.message.includes('User already registered')) {
          return { error: 'An account with this email already exists' };
        }
        
        if (error.message.includes('Invalid email')) {
          return { error: 'Please enter a valid email address' };
        }
        
        if (error.message.includes('Password')) {
          return { error: 'Password must be at least 6 characters long' };
        }
        
        if (error.message.includes('database') || error.message.includes('Database error saving new user')) {
          return { error: 'Database error saving new user. Please try again.' };
        }
        
        // Handle Supabase rate limiting
        if (error.code === 'over_email_send_rate_limit' || error.message.includes('you can only request this after')) {
          return { error: 'Please wait a moment before trying again. Supabase has rate limits to prevent spam.' };
        }
        
        return { error: error.message };
      }

      // Check if user was created successfully
      // Supabase returns data.user = null for existing emails (to prevent email enumeration)
      // However, for new users requiring email verification, session might be null but user should exist
      console.log('Signup result:', { 
        hasUser: !!(data?.user), 
        hasSession: !!(data?.session), 
        userEmail: data?.user?.email,
        needsVerification: !data?.session && !!data?.user 
      });
      
      if (!data?.user) {
        // When Supabase returns no user, it typically means signup failed
        // This could be due to existing email or other validation issues
        // Trust Supabase's handling and provide a generic message
        console.log('No user returned from signup - signup failed');
        
        return { error: 'Unable to create account. This email may already be registered. Please try signing in or use a different email.' };
      }
      
      // User created successfully (session might be null if email verification required)
      console.log('User created successfully:', data?.user?.email);
      
      // Since we now do pre-signup validation, we can trust the signup response
      // If we get here, the email was available and signup should succeed
      console.log('✅ Signup completed - pre-validation passed');

      // Trust the database trigger to handle profile creation
      // The handle_new_user trigger should automatically create the profile
      console.log('✅ Signup completed - database trigger will handle profile creation');

      return {};
    } catch (error: any) {
      console.error('Sign up catch error:', error);
      
      if (error.message) {
        return { error: error.message };
      }
      
      return { error: 'An unexpected error occurred during sign up. Please try again.' };
    }
  },

  forgotPassword: async (email: string) => {
    try {
      const { error } = await networkUtils.supabaseWithRetry(
        () => supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://sellar.app/auth/reset-password',
        }),
        'password_reset'
      );

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  },

  resetPassword: async (password: string) => {
    try {
      const { error } = await networkUtils.supabaseWithRetry(
        () => supabase.auth.updateUser({ password: password }),
        'password_update'
      );

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  },

  resendVerification: async (email: string) => {
    try {
      const { error } = await networkUtils.supabaseWithRetry(
        () => supabase.auth.resend({ 
          type: 'signup', 
          email: email,
          options: {
            emailRedirectTo: 'https://sellar.app/auth/callback',
          },
        }),
        'email_resend'
      );

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  },

  signOut: async () => {
    try {
      const { user } = get();
      
      // Update user offline status before signing out
      if (user) {
        await supabase
          .from('profiles')
                    .update({
            is_online: false,
            last_seen: new Date().toISOString()
          } as any)
          .eq('id', user.id);
      }

      await supabase.auth.signOut();
      set({ user: null, session: null });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },
}));