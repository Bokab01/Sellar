import { router } from 'expo-router';

// Type-safe navigation utility
export const navigation = {
  // Home navigation
  home: {
    goTo: () => router.push('/(tabs)/home'),
    goToListing: (id: string) => router.push(`/(tabs)/home/${id}`),
    goToBusinessListings: () => router.push('/(tabs)/home/business-listings'),
  },

  // Business navigation
  business: {
    goToDashboard: () => router.push('/(business)/dashboard'),
    goToAnalytics: () => router.push('/(business)/analytics'),
    goToSupport: () => router.push('/(business)/support'),
    goToAutoRefresh: () => router.push('/(business)/auto-refresh'),
  },

  // Recommendations navigation
  recommendations: {
    goToPersonalized: () => router.push('/(recommendations)/personalized'),
    goToTrending: () => router.push('/(recommendations)/trending'),
    goToRecent: () => router.push('/(recommendations)/recent'),
  },

  // Profile navigation
  profile: {
    goTo: (id: string) => router.push(`/profile/${id}`),
    goToEdit: () => router.push('/edit-profile'),
  },

  // Community navigation
  community: {
    goTo: () => router.push('/(tabs)/community'),
    goToPost: (id: string) => router.push(`/(tabs)/community/${id}`),
    goToCreatePost: () => router.push('/(tabs)/community/create-post'),
    goToTrending: () => router.push('/(tabs)/community/trending'),
  },

  // Inbox navigation
  inbox: {
    goTo: () => router.push('/(tabs)/inbox'),
    goToChat: (id: string) => router.push(`/chat-detail/${id}` as any),
  },

  // Create navigation
  create: {
    goTo: () => router.push('/(tabs)/create'),
  },

  // More navigation
  more: {
    goTo: () => router.push('/(tabs)/more'),
    goToSettings: () => router.push('/(tabs)/more/settings'),
    goToWallet: () => router.push('/(tabs)/more/wallet'),
    goToDashboard: () => router.push('/(tabs)/more/dashboard'),
  },

  // Utility navigation
  back: () => router.back(),
  replace: (path: any) => router.replace(path),
  dismiss: () => router.dismiss(),
  dismissAll: () => router.dismissAll(),
};

// Type definitions for route parameters
export type RouteParams = {
  // Home routes
  '/(tabs)/home': undefined;
  '/(tabs)/home/[id]': { id: string };
  '/(tabs)/home/business-listings': undefined;

  // Business routes
  '/(business)/dashboard': undefined;
  '/(business)/analytics': undefined;
  '/(business)/support': undefined;
  '/(business)/auto-refresh': undefined;

  // Recommendations routes
  '/(recommendations)/personalized': undefined;
  '/(recommendations)/trending': undefined;
  '/(recommendations)/recent': undefined;

  // Profile routes
  '/profile/[id]': { id: string };
  '/edit-profile': undefined;

  // Community routes
  '/(tabs)/community': undefined;
  '/(tabs)/community/[postId]': { postId: string };
  '/(tabs)/community/create-post': undefined;
  '/(tabs)/community/trending': undefined;

  // Inbox routes
  '/(tabs)/inbox': undefined;
  '/chat-detail/[id]': { id: string };

  // Create routes
  '/(tabs)/create': undefined;

  // More routes
  '/(tabs)/more': undefined;
  '/(tabs)/more/settings': undefined;
  '/(tabs)/more/wallet': undefined;
  '/(tabs)/more/dashboard': undefined;
};

// Type-safe navigation helper
export function navigateTo<T extends keyof RouteParams>(
  route: T,
  params?: RouteParams[T]
): void {
  if (params && typeof params === 'object' && Object.keys(params).length > 0) {
    // Build path with parameters
    let path = route as string;
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`[${key}]`, value as string);
    });
    router.push(path as any);
  } else {
    router.push(route as any);
  }
}
