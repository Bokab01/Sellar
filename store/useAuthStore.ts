import { create } from 'zustand';
import { supabase, dbHelpers } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: { firstName: string; lastName: string; phone?: string; location?: string }) => Promise<{ error?: string }>;
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  },

  signUp: async (email: string, password: string, userData: { firstName: string; lastName: string; phone?: string; location?: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone || null,
            location: userData.location || 'Accra, Greater Accra',
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        
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
        
        if (error.message.includes('database')) {
          return { error: 'Database error saving new user. Please try again.' };
        }
        
        return { error: error.message };
      }

      // Check if user was created successfully
      if (!data.user) {
        return { error: 'Failed to create user account. Please try again.' };
      }

      // Wait a moment for the trigger to execute, then check if profile was created
      setTimeout(async () => {
        try {
          const { data: profile, error: profileError } = await dbHelpers.getProfile(data.user!.id);
          
          if (profileError || !profile) {
            console.log('Profile not found, creating manually...');
            // If profile wasn't created by trigger, create it manually
            const { error: createError } = await dbHelpers.createProfile(data.user!.id, userData);
            if (createError) {
              console.error('Failed to create profile manually:', createError);
            }
          }
        } catch (error) {
          console.error('Error checking/creating profile:', error);
        }
      }, 1000);

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'myapp://reset-password',
      });

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

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
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

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
          })
          .eq('id', user.id);
      }

      await supabase.auth.signOut();
      set({ user: null, session: null });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },
}));