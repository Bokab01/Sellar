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
    id: 'pro',
    name: 'Pro',
    credits: 300,
    priceGHS: 50,
    pricePerCredit: 0.167,
    popular: false,
    description: 'For serious sellers',
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

// Streamlined feature catalog with credit costs
export const FEATURE_CATALOG = {
  // Core visibility features
  pulse_boost_24h: {
    name: 'Pulse Boost',
    description: '24-hour visibility boost',
    credits: 15,
    duration: '24 hours',
    icon: '⚡',
  },
  mega_pulse_7d: {
    name: 'Mega Pulse',
    description: '7-day mega visibility boost',
    credits: 50,
    duration: '7 days',
    icon: '🚀',
  },
  category_spotlight_3d: {
    name: 'Category Spotlight',
    description: '3-day category spotlight',
    credits: 35,
    duration: '3 days',
    icon: '🎯',
  },
  ad_refresh: {
    name: 'Ad Refresh',
    description: 'Refresh listing to top',
    credits: 5,
    duration: 'instant',
    icon: '🔄',
  },
  
  // Value-added features
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
    id: 'sellar_business',
    name: 'Sellar Business',
    priceGHS: 400,
    priceMonthly: 400,
    billingPeriod: 'monthly',
    boostCredits: 120, // Generous monthly allocation
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
    description: 'Complete business solution for serious sellers',
    highlights: [
      '120 boost credits monthly',
      'Unlimited listings',
      'Auto-boost your listings',
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