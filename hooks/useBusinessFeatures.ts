import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { isBusinessUser, getBusinessFeatures } from '@/lib/subscriptionEntitlements';

/**
 * Simplified hook for unified business plan features
 * Returns a simple boolean for each feature based on whether user has active subscription
 */
export function useBusinessFeatures() {
  const { user } = useAuthStore();
  const [features, setFeatures] = useState({
    isBusinessUser: false,
    hasAnalytics: false,
    hasAutoBoost: false,
    hasPrioritySupport: false,
    hasUnlimitedListings: false,
    hasHomepagePlacement: false,
    hasPremiumBranding: false,
    hasSponsoredPosts: false,
    hasBulkOperations: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setFeatures({
        isBusinessUser: false,
        hasAnalytics: false,
        hasAutoBoost: false,
        hasPrioritySupport: false,
        hasUnlimitedListings: false,
        hasHomepagePlacement: false,
        hasPremiumBranding: false,
        hasSponsoredPosts: false,
        hasBulkOperations: false,
      });
      setLoading(false);
      return;
    }

    const loadFeatures = async () => {
      try {
        const businessFeatures = await getBusinessFeatures(user.id);
        setFeatures(businessFeatures);
      } catch (error) {
        console.error('Error loading business features:', error);
        // Default to free user features on error
        setFeatures({
          isBusinessUser: false,
          hasAnalytics: false,
          hasAutoBoost: false,
          hasPrioritySupport: false,
          hasUnlimitedListings: false,
          hasHomepagePlacement: false,
          hasPremiumBranding: false,
          hasSponsoredPosts: false,
          hasBulkOperations: false,
        });
      } finally {
        setLoading(false);
      }
    };

    loadFeatures();
  }, [user?.id]);

  // Memoized helper functions to prevent re-renders
  const requiresBusinessPlan = useCallback((featureName: string) => {
    if (features.isBusinessUser) return false;
    
    return {
      required: true,
      message: `${featureName} is available with Sellar Pro plan`,
      action: 'Upgrade to Business',
      route: '/subscription-plans',
    };
  }, [features.isBusinessUser]);

  const checkAnalyticsAccess = useCallback(() => {
    return features.hasAnalytics ? null : requiresBusinessPlan('Analytics Dashboard');
  }, [features.hasAnalytics, requiresBusinessPlan]);

  const checkAutoBoostAccess = useCallback(() => {
    return features.hasAutoBoost ? null : requiresBusinessPlan('Auto-boost');
  }, [features.hasAutoBoost, requiresBusinessPlan]);

  const checkPrioritySupport = useCallback(() => {
    return features.hasPrioritySupport ? null : requiresBusinessPlan('Priority Support');
  }, [features.hasPrioritySupport, requiresBusinessPlan]);

  const checkHomepagePlacement = useCallback(() => {
    return features.hasHomepagePlacement ? null : requiresBusinessPlan('Homepage Placement');
  }, [features.hasHomepagePlacement, requiresBusinessPlan]);

  const checkPremiumBranding = useCallback(() => {
    return features.hasPremiumBranding ? null : requiresBusinessPlan('Premium Branding');
  }, [features.hasPremiumBranding, requiresBusinessPlan]);

  const checkSponsoredPosts = useCallback(() => {
    return features.hasSponsoredPosts ? null : requiresBusinessPlan('Sponsored Posts');
  }, [features.hasSponsoredPosts, requiresBusinessPlan]);

  const checkBulkOperations = useCallback(() => {
    return features.hasBulkOperations ? null : requiresBusinessPlan('Bulk Operations');
  }, [features.hasBulkOperations, requiresBusinessPlan]);

  const checkUnlimitedListings = useCallback(() => {
    return features.hasUnlimitedListings ? null : requiresBusinessPlan('Unlimited Listings');
  }, [features.hasUnlimitedListings, requiresBusinessPlan]);

  return useMemo(() => ({
    ...features,
    loading,
    
    // Helper functions for feature checks
    checkAnalyticsAccess,
    checkAutoBoostAccess,
    checkPrioritySupport,
    checkHomepagePlacement,
    checkPremiumBranding,
    checkSponsoredPosts,
    checkBulkOperations,
    checkUnlimitedListings,
    requiresBusinessPlan,
  }), [
    features,
    loading,
    checkAnalyticsAccess,
    checkAutoBoostAccess,
    checkPrioritySupport,
    checkHomepagePlacement,
    checkPremiumBranding,
    checkSponsoredPosts,
    checkBulkOperations,
    checkUnlimitedListings,
    requiresBusinessPlan,
  ]);
}

/**
 * Simple hook to check if current user is a business user
 */
export function useIsBusinessUser() {
  const { user } = useAuthStore();
  const [isBusinessUserState, setIsBusinessUserState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsBusinessUserState(false);
      setLoading(false);
      return;
    }

    const checkBusinessStatus = async () => {
      try {
        const businessStatus = await isBusinessUser(user.id);
        setIsBusinessUserState(businessStatus);
      } catch (error) {
        console.error('Error checking business status:', error);
        setIsBusinessUserState(false);
      } finally {
        setLoading(false);
      }
    };

    checkBusinessStatus();
  }, [user?.id]);

  return { isBusinessUser: isBusinessUserState, loading };
}
