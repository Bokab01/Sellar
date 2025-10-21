import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { dbHelpers } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { AUTH_TIMEOUTS } from '@/constants/auth';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface NewUserState {
  isNewUser: boolean | null; // null = loading, true = new user, false = existing user
  loading: boolean;
  error: string | null;
}

export function useNewUserDetection() {
  const { user } = useAuth();
  const [state, setState] = useState<NewUserState>({
    isNewUser: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    
    const checkIfNewUser = async () => {
      if (!user) {
        if (isMounted) {
          setState({
            isNewUser: null,
            loading: false,
            error: null,
          });
        }
        return;
      }

      try {
        if (isMounted) {
          setState(prev => ({ ...prev, loading: true, error: null }));
        }

        // ✅ FIX: Retry logic with exponential backoff
        let lastError: any = null;
        let profile: any = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Increase timeout for retries (first attempt: 8s, second: 12s, third: 15s)
            const timeout = AUTH_TIMEOUTS.PROFILE_FETCH + (attempt - 1) * 4000;
            
            const timeoutPromise = new Promise<{ data: null, error: any }>((resolve) => {
              setTimeout(() => {
                resolve({ data: null, error: { message: 'Profile fetch timeout' } });
              }, timeout);
            });
            
            const profilePromise = dbHelpers.getProfile(user.id);
            
            // Get user profile to check creation date
            const result = await Promise.race([profilePromise, timeoutPromise]);
            
            if (result.error) {
              lastError = result.error;
              
              // If it's a timeout and we have retries left, wait and retry
              if (attempt < 3 && result.error.message === 'Profile fetch timeout') {
                console.warn(`⚠️ Profile fetch timeout (attempt ${attempt}/3), retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s backoff
                continue;
              }
              
              throw result.error;
            }
            
            profile = result.data;
            break; // Success, exit retry loop
          } catch (err) {
            lastError = err;
            if (attempt === 3) {
              throw err; // Final attempt failed
            }
          }
        }

        // ✅ Check if component is still mounted before updating state
        if (!isMounted) return;

        if (lastError && !profile) {
          // ✅ Silently fail - don't show error to user, just assume existing user
          console.warn('Profile fetch failed after retries, defaulting to existing user:', lastError);
          setState({
            isNewUser: false,
            loading: false,
            error: null, // Don't show error to user
          });
          return;
        }

        if (!profile) {
          // No profile found, likely a new user
          if (isMounted) {
            setState({
              isNewUser: true,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // Check if user has completed onboarding
        // Use type assertion with unknown first for safety
        const typedProfile = profile as unknown as Profile;
        
        // Check if onboarding_completed field exists and is true
        const hasCompletedOnboarding = (typedProfile as any).onboarding_completed === true;
        
        if (hasCompletedOnboarding) {
          // User has completed onboarding, they are not new
          if (isMounted) {
            setState({
              isNewUser: false,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // If no onboarding_completed field, check if user was created within the last 24 hours
        const profileCreatedAt = new Date(typedProfile.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - profileCreatedAt.getTime()) / (1000 * 60 * 60);

        // Consider user "new" if profile was created within last 24 hours and hasn't completed onboarding
        const isNewUser = hoursSinceCreation < 24;

        if (isMounted) {
          setState({
            isNewUser,
            loading: false,
            error: null,
          });
        }

      } catch (error) {
        // ✅ Silently fail - don't interrupt user experience
        console.warn('Error in useNewUserDetection (non-critical):', error);
        if (isMounted) {
          setState({
            isNewUser: false, // Default to existing user on error
            loading: false,
            error: null, // Don't show error to user
          });
        }
      }
    };

    checkIfNewUser();
    
    // ✅ Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [user]);

  return state;
}

// Helper function to mark user as "not new" (call this after they complete onboarding)
export async function markUserAsExisting(userId: string): Promise<void> {
  try {
    // Update the profile to mark that the user has completed onboarding
    const { error } = await dbHelpers.updateProfile(userId, {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error updating profile for onboarding completion:', error);
      throw error;
    }

    console.log(`User ${userId} has completed onboarding and been marked as existing`);
  } catch (error) {
    console.error('Error marking user as existing:', error);
    throw error;
  }
}
