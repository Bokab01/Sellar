// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50,
    priceGHS: 15,
    pricePerCredit: 0.300,
    popular: false,
    description: 'Perfect for getting started',
  },
  {
    id: 'seller',
    name: 'Seller',
    credits: 120,
    priceGHS: 25,
    pricePerCredit: 0.208,
    popular: true,
    description: 'Great value for regular sellers',
  },
  {
    id: 'plus',
    name: 'Plus',
    credits: 300,
    priceGHS: 50,
    pricePerCredit: 0.167,
    popular: false,
    description: 'Plus credits, plus features, plus value',
  },
  {
    id: 'max',
    name: 'Max',
    credits: 700,
    priceGHS: 100,
    pricePerCredit: 0.143,
    popular: false,
    description: 'Maximum value for power users',
  },
] as const;

// Feature catalog - Sellar Pro users get auto-refresh every 2 hours instead of discounted pricing
export const FEATURE_CATALOG = {
  // Core visibility features - same pricing for all users, Pro users get auto-refresh
  pulse_boost_24h: {
    name: 'Pulse Boost',
    description: '24-hour visibility boost',
    credits: 15,
    duration: '24 hours',
    icon: '⚡',
    proBenefit: 'Auto-refresh every 2 hours', // Sellar Pro users get this benefit
  },
  mega_pulse_7d: {
    name: 'Mega Pulse',
    description: '7-day mega visibility boost',
    credits: 50,
    duration: '7 days',
    icon: '🚀',
    proBenefit: 'Auto-refresh every 2 hours', // Sellar Pro users get this benefit
  },
  category_spotlight_3d: {
    name: 'Category Spotlight',
    description: '3-day category spotlight',
    credits: 35,
    duration: '3 days',
    icon: '🎯',
    proBenefit: 'Auto-refresh every 2 hours', // Sellar Pro users get this benefit
  },
  ad_refresh: {
    name: 'Ad Refresh',
    description: 'Instantly move listing to top of search results',
    credits: 5,
    duration: 'instant',
    icon: '🔄',
    proBenefit: 'Auto-refresh every 2 hours', // Sellar Pro users get this benefit
  },
  
  // Value-added features - same pricing for all users
  listing_highlight: {
    name: 'Listing Highlight',
    description: 'Highlight listing with colored border',
    credits: 10,
    duration: '7 days',
    icon: '✨',
  },
  urgent_badge: {
    name: 'Urgent Badge',
    description: 'Add "Urgent Sale" badge to listing',
    credits: 8,
    duration: '3 days',
    icon: '🔥',
  },
} as const;

// Unified Business subscription plan
export const BUSINESS_PLANS = [
  {
    id: 'sellar_pro',
    name: 'Sellar Pro',
    priceGHS: 400,
    priceMonthly: 400,
    billingPeriod: 'monthly',
    maxListings: null, // unlimited
    features: {
      analytics: 'comprehensive', // Single comprehensive analytics suite
      autoBoost: true,
      autoBoostDays: 3,
      prioritySupport: true,
      homepagePlacement: true,
      premiumBranding: true,
      sponsoredPosts: true,
      bulkOperations: true,
      apiAccess: false, // Keep for future expansion
      accountManager: false, // Removed complex feature
    },
    badges: ['business', 'priority_seller', 'premium'],
    description: 'Complete solution for serious and business sellers',
    highlights: [
      'Auto-refresh every 2 hours (stays at top)',
      'Unlimited listings',
      'Comprehensive analytics dashboard',
      'Priority support',
      'Homepage placement',
      'Premium branding',
      'Sponsored posts',
      'Bulk operations',
    ],
    popular: true, // Only plan, so it's popular
  },
] as const;

// Helper functions
export function calculateCreditValue(credits: number): number {
  // Use the best rate from packages (Business package rate)
  return credits * 0.154;
}

export function getFeatureByKey(key: string) {
  return FEATURE_CATALOG[key as keyof typeof FEATURE_CATALOG] || null;
}

// Get feature cost - Pro users get features for free (auto-refresh benefit)
export function getFeatureCost(featureKey: string, isBusinessUser: boolean = false): number {
  const feature = getFeatureByKey(featureKey);
  if (!feature) return 0;
  
  // Pro users get features for free (auto-refresh benefit)
  if (isBusinessUser) return 0;
  
  // Regular users pay standard price
  return (feature as any).credits ?? 0;
}

// Get Pro benefit for a feature
export function getProBenefit(featureKey: string): string | null {
  const feature = getFeatureByKey(featureKey);
  if (!feature) return null;
  
  return (feature as any).proBenefit || null;
}

// Calculate Sellar Pro value proposition
export function calculateSellarProValue(): {
  autoRefreshBenefit: string;
  unlimitedListings: boolean;
  prioritySupport: boolean;
  comprehensiveAnalytics: boolean;
} {
  return {
    autoRefreshBenefit: 'Auto-refresh every 2 hours (stays at top)',
    unlimitedListings: true,
    prioritySupport: true,
    comprehensiveAnalytics: true,
  };
}

export function getCreditPackageById(id: string) {
  return CREDIT_PACKAGES.find(pkg => pkg.id === id);
}

export function getBusinessPlanById(id: string) {
  return BUSINESS_PLANS.find(plan => plan.id === id);
}

// All available features in a single list (no categories)
export const ALL_FEATURES = Object.keys(FEATURE_CATALOG);

// Feature categories for UI organization (simplified)
export const FEATURE_CATEGORIES = [
  {
    id: 'all',
    name: 'All Features',
    description: 'Boost your listings and sales',
    icon: '⚡',
    features: ALL_FEATURES,
  },
] as const;