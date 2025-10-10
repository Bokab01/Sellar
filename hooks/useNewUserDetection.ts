import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { dbHelpers } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

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
    const checkIfNewUser = async () => {
      if (!user) {
        setState({
          isNewUser: null,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<{ data: null, error: any }>((resolve) => {
          setTimeout(() => {
            console.warn('⚠️ User profile fetch timeout reached');
            resolve({ data: null, error: { message: 'Profile fetch timeout' } });
          }, 5000); // 5 second timeout
        });
        
        const profilePromise = dbHelpers.getProfile(user.id);
        
        // Get user profile to check creation date
        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]);

        if (error) {
          console.error('Error fetching user profile:', error);
          setState({
            isNewUser: false, // Default to existing user if we can't determine
            loading: false,
            error: error.message || 'Unknown error',
          });
          return;
        }

        if (!profile) {
          // No profile found, likely a new user
          setState({
            isNewUser: true,
            loading: false,
            error: null,
          });
          return;
        }

        // Check if user has completed onboarding
        // Use type assertion with unknown first for safety
        const typedProfile = profile as unknown as Profile;
        
        // Check if onboarding_completed field exists and is true
        const hasCompletedOnboarding = (typedProfile as any).onboarding_completed === true;
        
        if (hasCompletedOnboarding) {
          // User has completed onboarding, they are not new
          setState({
            isNewUser: false,
            loading: false,
            error: null,
          });
          return;
        }

        // If no onboarding_completed field, check if user was created within the last 24 hours
        const profileCreatedAt = new Date(typedProfile.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - profileCreatedAt.getTime()) / (1000 * 60 * 60);

        // Consider user "new" if profile was created within last 24 hours and hasn't completed onboarding
        const isNewUser = hoursSinceCreation < 24;

        setState({
          isNewUser,
          loading: false,
          error: null,
        });

      } catch (error) {
        console.error('Error in useNewUserDetection:', error);
        setState({
          isNewUser: false, // Default to existing user on error
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkIfNewUser();
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
