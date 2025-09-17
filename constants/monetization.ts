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

// Streamlined feature catalog with dual pricing (regular vs business credits)
export const FEATURE_CATALOG = {
  // Core visibility features with massive business discounts
  pulse_boost_24h: {
    name: 'Pulse Boost',
    description: '24-hour visibility boost + auto-refresh every 2h',
    regularCredits: 15,
    businessCredits: 1,     // 93% discount for business users!
    duration: '24 hours',
    icon: '⚡',
    businessAutoRefresh: '2 hours', // Auto-refresh every 2 hours for business users
  },
  mega_pulse_7d: {
    name: 'Mega Pulse',
    description: '7-day mega visibility boost + auto-refresh every 2h',
    regularCredits: 50,
    businessCredits: 3,     // 94% discount for business users!
    duration: '7 days',
    icon: '🚀',
    businessAutoRefresh: '2 hours', // Auto-refresh every 2 hours for business users
  },
  category_spotlight_3d: {
    name: 'Category Spotlight',
    description: '3-day category spotlight + auto-refresh every 2h',
    regularCredits: 35,
    businessCredits: 2,     // 94% discount for business users!
    duration: '3 days',
    icon: '🎯',
    businessAutoRefresh: '2 hours', // Auto-refresh every 2 hours for business users
  },
  ad_refresh: {
    name: 'Ad Refresh',
    description: 'Refresh listing to top + auto-refresh every 2h',
    regularCredits: 5,
    businessCredits: 0,     // FREE for business users + auto-refresh every 2h
    duration: 'instant',
    icon: '🔄',
    businessAutoRefresh: '2 hours', // Auto-refresh every 2 hours for business users
  },
  
  // Value-added features with business discounts
  listing_highlight: {
    name: 'Listing Highlight',
    description: 'Highlight listing with colored border',
    regularCredits: 10,
    businessCredits: 1,     // 90% discount for business users
    duration: '7 days',
    icon: '✨',
  },
  urgent_badge: {
    name: 'Urgent Badge',
    description: 'Add "Urgent Sale" badge to listing',
    regularCredits: 8,
    businessCredits: 1,     // 87% discount for business users
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

// Get feature cost based on user type
export function getFeatureCost(featureKey: string, isBusinessUser: boolean = false): number {
  const feature = getFeatureByKey(featureKey);
  if (!feature) return 0;
  
  if (isBusinessUser) {
    return (feature as any).businessCredits ?? (feature as any).regularCredits ?? 0;
  }
  
  return (feature as any).regularCredits ?? 0;
}

// Calculate discount percentage for business users
export function getBusinessDiscount(featureKey: string): number {
  const feature = getFeatureByKey(featureKey);
  if (!feature) return 0;
  
  const businessCredits = (feature as any).businessCredits;
  const regularCredits = (feature as any).regularCredits;
  
  if (!businessCredits || !regularCredits || businessCredits >= regularCredits) return 0;
  
  return Math.round((1 - businessCredits / regularCredits) * 100);
}

// Calculate total value of business plan credits
export function calculateBusinessCreditValue(credits: number = 120): {
  pulseBoosts: number;
  categorySpotlights: number; 
  megaPulses: number;
  totalRegularValue: number;
} {
  const pulseBoosts = Math.floor(credits / 1);      // 120 possible
  const categorySpotlights = Math.floor(credits / 2); // 60 possible  
  const megaPulses = Math.floor(credits / 3);       // 40 possible
  
  // Calculate what this would cost in regular credits
  const totalRegularValue = (pulseBoosts * 15) + (categorySpotlights * 35) + (megaPulses * 50);
  
  return {
    pulseBoosts,
    categorySpotlights,
    megaPulses,
    totalRegularValue
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