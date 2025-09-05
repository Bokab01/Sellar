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

        // Get user profile to check creation date
        const { data: profile, error } = await dbHelpers.getProfile(user.id);

        if (error) {
          console.error('Error fetching user profile:', error);
          setState({
            isNewUser: false, // Default to existing user if we can't determine
            loading: false,
            error: error.message,
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

        // Check if user was created within the last 24 hours
        // Use type assertion with unknown first for safety
        const typedProfile = profile as unknown as Profile;
        const profileCreatedAt = new Date(typedProfile.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - profileCreatedAt.getTime()) / (1000 * 60 * 60);

        // Consider user "new" if profile was created within last 24 hours
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
    // We could update a field in the profile to mark them as having completed onboarding
    // For now, we'll just log it - the 24-hour window will handle the rest
    console.log(`User ${userId} has completed onboarding`);
  } catch (error) {
    console.error('Error marking user as existing:', error);
  }
}
