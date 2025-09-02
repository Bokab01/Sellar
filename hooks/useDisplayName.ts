import { useMemo } from 'react';
import { UserProfile } from './useProfile';
import { useMonetizationStore } from '@/store/useMonetizationStore';

export interface DisplayNameResult {
  displayName: string;
  showBusinessBadge: boolean;
  isBusinessDisplay: boolean;
  fullDisplayName: string;
  shortDisplayName: string;
}

/**
 * Hook to determine how to display a user's name based on their profile settings
 * and business plan status
 */
export function useDisplayName(profile: UserProfile | null): DisplayNameResult {
  const { hasBusinessPlan } = useMonetizationStore();

  return useMemo(() => {
    if (!profile) {
      return {
        displayName: 'Unknown User',
        showBusinessBadge: false,
        isBusinessDisplay: false,
        fullDisplayName: 'Unknown User',
        shortDisplayName: 'Unknown',
      };
    }

    const hasBusinessName = profile.is_business && profile.business_name;
    const canDisplayBusinessName = hasBusinessName && (hasBusinessPlan() || profile.display_business_name);
    const shouldDisplayBusinessName = canDisplayBusinessName && profile.display_business_name;

    // Determine primary display name
    let primaryName = profile.full_name || 'User';
    let isBusinessDisplay = false;

    if (shouldDisplayBusinessName) {
      switch (profile.business_name_priority) {
        case 'primary':
          primaryName = profile.business_name!;
          isBusinessDisplay = true;
          break;
        case 'secondary':
          primaryName = `${profile.full_name || 'User'} • ${profile.business_name}`;
          isBusinessDisplay = true;
          break;
        case 'hidden':
        default:
          primaryName = profile.full_name || 'User';
          isBusinessDisplay = false;
          break;
      }
    }

    // Create variations
    const fullDisplayName = shouldDisplayBusinessName && profile.business_name_priority === 'secondary'
      ? `${profile.full_name || 'User'} • ${profile.business_name}`
      : primaryName;

    const shortDisplayName = shouldDisplayBusinessName && profile.business_name_priority === 'primary'
      ? profile.business_name!
      : profile.full_name || 'User';

    return {
      displayName: primaryName,
      showBusinessBadge: profile.is_business && hasBusinessPlan(),
      isBusinessDisplay,
      fullDisplayName,
      shortDisplayName,
    };
  }, [profile, hasBusinessPlan]);
}

/**
 * Hook for getting display name for a specific user ID
 * Useful when you only have the user ID and need to fetch the profile
 */
export function useUserDisplayName(userId: string | null): DisplayNameResult {
  // This would typically fetch the profile, but for now we'll return a placeholder
  // In a real implementation, you'd use useProfile(userId) here
  return {
    displayName: 'Loading...',
    showBusinessBadge: false,
    isBusinessDisplay: false,
    fullDisplayName: 'Loading...',
    shortDisplayName: 'Loading...',
  };
}

/**
 * Utility function to get display name from profile object directly
 * Useful for components that already have the profile data
 */
export function getDisplayName(
  profile: UserProfile | null,
  hasBusinessPlan: boolean = false
): DisplayNameResult {
  if (!profile) {
    return {
      displayName: 'Unknown User',
      showBusinessBadge: false,
      isBusinessDisplay: false,
      fullDisplayName: 'Unknown User',
      shortDisplayName: 'Unknown',
    };
  }

  const hasBusinessName = profile.is_business && profile.business_name;
  const canDisplayBusinessName = hasBusinessName && (hasBusinessPlan || profile.display_business_name);
  const shouldDisplayBusinessName = canDisplayBusinessName && profile.display_business_name;

  let primaryName = profile.full_name || 'User';
  let isBusinessDisplay = false;

  if (shouldDisplayBusinessName) {
    switch (profile.business_name_priority) {
      case 'primary':
        primaryName = profile.business_name!;
        isBusinessDisplay = true;
        break;
      case 'secondary':
        primaryName = `${profile.full_name || 'User'} • ${profile.business_name}`;
        isBusinessDisplay = true;
        break;
      case 'hidden':
      default:
        primaryName = profile.full_name || 'User';
        isBusinessDisplay = false;
        break;
    }
  }

  const fullDisplayName = shouldDisplayBusinessName && profile.business_name_priority === 'secondary'
    ? `${profile.full_name || 'User'} • ${profile.business_name}`
    : primaryName;

  const shortDisplayName = shouldDisplayBusinessName && profile.business_name_priority === 'primary'
    ? profile.business_name!
    : profile.full_name || 'User';

  return {
    displayName: primaryName,
    showBusinessBadge: profile.is_business && hasBusinessPlan,
    isBusinessDisplay,
    fullDisplayName,
    shortDisplayName,
  };
}
