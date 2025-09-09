import { useState, useEffect } from 'react';
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

  // Simplified helper functions
  const requiresBusinessPlan = (featureName: string) => {
    if (features.isBusinessUser) return false;
    
    return {
      required: true,
      message: `${featureName} is available with Sellar Business plan`,
      action: 'Upgrade to Business',
      route: '/subscription-plans',
    };
  };

  const checkAnalyticsAccess = () => {
    return features.hasAnalytics ? null : requiresBusinessPlan('Analytics Dashboard');
  };

  const checkAutoBoostAccess = () => {
    return features.hasAutoBoost ? null : requiresBusinessPlan('Auto-boost');
  };

  const checkPrioritySupport = () => {
    return features.hasPrioritySupport ? null : requiresBusinessPlan('Priority Support');
  };

  const checkHomepagePlacement = () => {
    return features.hasHomepagePlacement ? null : requiresBusinessPlan('Homepage Placement');
  };

  const checkPremiumBranding = () => {
    return features.hasPremiumBranding ? null : requiresBusinessPlan('Premium Branding');
  };

  const checkSponsoredPosts = () => {
    return features.hasSponsoredPosts ? null : requiresBusinessPlan('Sponsored Posts');
  };

  const checkBulkOperations = () => {
    return features.hasBulkOperations ? null : requiresBusinessPlan('Bulk Operations');
  };

  const checkUnlimitedListings = () => {
    return features.hasUnlimitedListings ? null : requiresBusinessPlan('Unlimited Listings');
  };

  return {
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
  };
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
