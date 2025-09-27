import { lazy } from 'react';

// Feature-based code splitting for better performance
export const CodeSplitting = {
  // Business Features - Heavy components
  BusinessDashboard: lazy(() => import('@/components/Dashboard/BusinessOverview').then(module => ({ default: module.BusinessOverview }))),
  BusinessAnalytics: lazy(() => import('@/components/Dashboard/BusinessAnalytics').then(module => ({ default: module.BusinessAnalytics }))),
  BusinessSupport: lazy(() => import('@/components/Dashboard/BusinessSupport').then(module => ({ default: module.BusinessSupport }))),
  AutoBoostDashboard: lazy(() => import('@/components/AutoBoostDashboard/AutoBoostDashboard')),

  // Recommendation Features
  RecommendationFeed: lazy(() => import('@/components/Recommendations').then(module => ({ default: module.RecommendationFeed }))),
  ListingRecommendations: lazy(() => import('@/components/Recommendations').then(module => ({ default: module.ListingRecommendations }))),

  // Media Features - Heavy components
  ImageViewer: lazy(() => import('@/components/ImageViewer/ImageViewer').then(module => ({ default: module.ImageViewer }))),
  ChatImagePicker: lazy(() => import('@/components/ChatImagePicker/ChatImagePicker').then(module => ({ default: module.ChatImagePicker }))),

  // Featured Listings - Heavy components
  FeaturedListings: lazy(() => import('@/components/FeaturedListings/FeaturedListings').then(module => ({ default: module.FeaturedListings }))),
  SimpleFeaturedListings: lazy(() => import('@/components/FeaturedListings/SimpleFeaturedListings').then(module => ({ default: module.SimpleFeaturedListings }))),
  FixedFeaturedListings: lazy(() => import('@/components/FeaturedListings/FixedFeaturedListings').then(module => ({ default: module.FixedFeaturedListings }))),

  // Premium Components
  PremiumProductCard: lazy(() => import('@/components/PremiumProductCard/PremiumProductCard').then(module => ({ default: module.PremiumProductCard }))),
  MinimalPremiumProductCard: lazy(() => import('@/components/PremiumProductCard/MinimalPremiumProductCard').then(module => ({ default: module.MinimalPremiumProductCard }))),

  // Analytics & Reporting
  ReportModal: lazy(() => import('@/components/ReportModal/UniversalReportModal').then(module => ({ default: module.UniversalReportModal }))),

  // Community Features
  PostCard: lazy(() => import('@/components/PostCard/PostCard').then(module => ({ default: module.PostCard }))),

  // Search Features
  EnhancedSearchBar: lazy(() => import('@/components/Search/EnhancedSearchBar').then(module => ({ default: module.EnhancedSearchBar }))),
};

// Preload critical components for better UX
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  const criticalComponents = [
    () => import('@/components/Avatar/Avatar'),
    () => import('@/components/Button/Button'),
  ];

  criticalComponents.forEach(importFn => {
    importFn().catch(console.warn);
  });
};

// Preload feature-specific components based on user behavior
export const preloadFeatureComponents = (feature: 'business' | 'community' | 'recommendations' | 'search') => {
  const featureComponents = {
    business: [
      () => import('@/components/Dashboard/BusinessOverview'),
      () => import('@/components/Dashboard/BusinessAnalytics'),
    ],
    community: [
      () => import('@/components/PostCard/PostCard'),
    ],
    recommendations: [
      () => import('@/components/Recommendations'),
    ],
    search: [
      () => import('@/components/Search/EnhancedSearchBar'),
    ],
  };

  const components = featureComponents[feature] || [];
  components.forEach(importFn => {
    importFn().catch(console.warn);
  });
};
