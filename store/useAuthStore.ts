import { create } from 'zustand';
import { supabase, dbHelpers } from '@/lib/supabase';
import { handleAuthError, analyzeAuthError } from '@/utils/authErrorHandler';
import { networkUtils } from '@/utils/networkRetry';
import { generateEmailRedirectUrl, generateMagicLinkRedirectUrl, generatePasswordResetRedirectUrl } from '@/utils/deepLinkUtils';
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
            emailRedirectTo: generateMagicLinkRedirectUrl(),
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

  signUp: async (email: string, password: string, userData: { firstName: string; lastName: string; phone?: string; location?: string }) => {
    try {
      console.log('Attempting signup with:', { email, userData });
      
      const { data, error } = await networkUtils.supabaseWithRetry(
        () => supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: generateEmailRedirectUrl(),
            data: {
              first_name: userData.firstName,
              last_name: userData.lastName,
              phone: userData.phone || null,
              location: userData.location || 'Accra, Greater Accra',
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
        // When Supabase returns no user, it means the email already exists
        // This is Supabase's way of preventing email enumeration attacks
        console.log('No user returned from signup - email already exists');
        
        // Check if we can determine the user's status for better error messaging
        try {
          // Try to get user info (this might not work client-side, but worth trying)
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          if (!listError) {
            const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (existingUser) {
              console.log('Found existing user:', {
                id: existingUser.id,
                email: existingUser.email,
                confirmed: !!existingUser.email_confirmed_at,
                created: existingUser.created_at
              });
              
              if (!existingUser.email_confirmed_at) {
                // User exists but email not confirmed
                return { error: 'An account with this email already exists but is not verified. Please check your email for the verification link, or try signing in.' };
              } else {
                // User exists and is confirmed
                return { error: 'An account with this email already exists and is verified. Please sign in instead.' };
              }
            }
          }
        } catch (adminError) {
          console.log('Could not check admin users (normal for client-side):', adminError);
        }
        
        // Default error when we can't determine the specific case
        return { error: 'An account with this email already exists. Please try signing in, or check your email for a verification link if you recently registered.' };
      }
      
      // User created successfully (session might be null if email verification required)
      console.log('User created successfully:', data?.user?.email);

      // Wait a moment for the trigger to execute, then check if profile was created
      setTimeout(async () => {
        try {
          // First, ensure we have a valid session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('No session found, profile creation will be handled later');
            return;
          }

          const { data: profile, error: profileError } = await dbHelpers.getProfile(data?.user?.id!);
          
          if (profileError || !profile) {
            console.log('Profile not found, creating manually...');
            
            // Try multiple fallback strategies with proper authentication context
            const fallbackStrategies = [
              // Strategy 1: Use our helper function (should work with RLS)
              async () => {
                const { error } = await dbHelpers.createProfile(data?.user?.id!, userData);
                if (error) throw error;
                return 'helper';
              },
              
              // Strategy 2: Use authenticated supabase client for basic profile
              async () => {
                const { error } = await supabase
                  .from('profiles')
                  .insert({
                    id: data?.user?.id!,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    full_name: `${userData.firstName} ${userData.lastName}`.trim(),
                    phone: userData.phone || null,
                    location: userData.location || 'Accra, Greater Accra',
                  } as any);
                if (error) throw error;
                return 'basic';
              },
              
              // Strategy 3: Minimal profile with just essential fields
              async () => {
                const { error } = await supabase
                  .from('profiles')
                  .insert({
                    id: data?.user?.id!,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                  } as any);
                if (error) throw error;
                return 'minimal';
              },
              
              // Strategy 4: Just the ID (should always work with proper RLS)
              async () => {
                const { error } = await supabase
                  .from('profiles')
                  .insert({ id: data?.user?.id! } as any);
                if (error) throw error;
                return 'id-only';
              }
            ];
            
            let profileCreated = false;
            for (const [index, strategy] of fallbackStrategies.entries()) {
              try {
                const result = await strategy();
                console.log(`✅ Profile created successfully using strategy ${index + 1} (${result})`);
                profileCreated = true;
                break;
              } catch (error) {
                console.error(`❌ Strategy ${index + 1} failed:`, error);
                
                // If it's an RLS error, provide more context
                if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
                  console.error('RLS Policy Error: The database security policy is preventing profile creation.');
                  console.error('This usually means the RLS policies need to be updated.');
                }
              }
            }
            
            if (!profileCreated) {
              console.error('❌ All profile creation strategies failed - user signup completed but profile creation failed');
              console.error('The user account was created successfully, but the profile will need to be created later');
            }
          } else {
            console.log('✅ Profile found successfully');
          }
        } catch (error) {
          console.error('Error in profile creation process:', error);
        }
      }, 3000); // Increased timeout to ensure session is established

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
          redirectTo: generatePasswordResetRedirectUrl(),
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
            emailRedirectTo: generateEmailRedirectUrl(),
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