// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50,
    priceGHS: 10,
    pricePerCredit: 0.200,
    popular: false,
    description: 'Perfect for getting started',
  },
  {
    id: 'seller',
    name: 'Seller',
    credits: 120,
    priceGHS: 20,
    pricePerCredit: 0.167,
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
    id: 'business',
    name: 'Business',
    credits: 650,
    priceGHS: 100,
    pricePerCredit: 0.154,
    popular: false,
    description: 'Maximum value for businesses',
  },
] as const;

// Feature catalog with credit costs
export const FEATURE_CATALOG = {
  // Visibility features
  visibility: {
    pulse_boost_24h: {
      name: 'Pulse Boost',
      description: '24-hour visibility boost',
      credits: 15,
      duration: '24 hours',
      icon: '⚡',
      category: 'visibility',
    },
    mega_pulse_7d: {
      name: 'Mega Pulse',
      description: '7-day mega visibility boost',
      credits: 50,
      duration: '7 days',
      icon: '🚀',
      category: 'visibility',
    },
    category_spotlight_3d: {
      name: 'Category Spotlight',
      description: '3-day category spotlight',
      credits: 35,
      duration: '3 days',
      icon: '🎯',
      category: 'visibility',
    },
  },
  
  // Management features
  management: {
    ad_refresh: {
      name: 'Ad Refresh',
      description: 'Refresh listing to top',
      credits: 5,
      duration: 'instant',
      icon: '🔄',
      category: 'management',
    },
    auto_refresh_30d: {
      name: 'Auto-Refresh',
      description: '30-day auto-refresh',
      credits: 60,
      duration: '30 days',
      icon: '⚙️',
      category: 'management',
    },
    direct_whatsapp: {
      name: 'Direct to WhatsApp',
      description: 'WhatsApp contact button',
      credits: 20,
      duration: 'permanent',
      icon: '💬',
      category: 'management',
    },
  },
  
  // Business features
  business: {
    business_profile: {
      name: 'Business Profile',
      description: 'Unlock business features',
      credits: 50,
      duration: 'permanent',
      icon: '🏢',
      category: 'business',
    },
    analytics_report: {
      name: 'Analytics Report',
      description: 'Detailed performance analytics',
      credits: 40,
      duration: '30 days',
      icon: '📊',
      category: 'business',
    },
    priority_support: {
      name: 'Priority Support',
      description: 'Fast-track customer support',
      credits: 30,
      duration: '30 days',
      icon: '🎧',
      category: 'business',
    },
  },
} as const;

// Business subscription plans
export const BUSINESS_PLANS = [
  {
    id: 'starter_business',
    name: 'Starter Business',
    priceGHS: 100,
    priceMonthly: 100,
    billingPeriod: 'monthly',
    boostCredits: 20,
    maxListings: 20,
    features: {
      analytics: 'basic',
      autoBoost: false,
      prioritySupport: false,
    },
    badges: ['business'],
    description: 'Perfect for small businesses',
    highlights: [
      '20 boost credits (3-day boosts)',
      'Up to 20 active listings',
      'Business badge',
      'Basic analytics',
    ],
    popular: false,
  },
  {
    id: 'pro_business',
    name: 'Pro Business',
    priceGHS: 250,
    priceMonthly: 250,
    billingPeriod: 'monthly',
    boostCredits: 80,
    maxListings: null, // unlimited
    features: {
      analytics: 'advanced',
      autoBoost: true,
      autoBoostDays: 3,
      prioritySupport: false,
    },
    badges: ['business', 'priority_seller'],
    description: 'For growing businesses',
    highlights: [
      '80 boost credits (flexible mix)',
      'Unlimited listings',
      'Business + Priority Seller badges',
      'Auto-boost (3 days)',
      'Advanced analytics',
    ],
    popular: true,
  },
  {
    id: 'premium_business',
    name: 'Premium Business',
    priceGHS: 400,
    priceMonthly: 400,
    billingPeriod: 'monthly',
    boostCredits: 150,
    maxListings: null, // unlimited
    features: {
      analytics: 'full',
      autoBoost: true,
      prioritySupport: true,
      homepagePlacement: true,
      accountManager: true,
    },
    badges: ['business', 'priority_seller', 'premium'],
    description: 'Complete business solution',
    highlights: [
      '150 boost credits (flexible)',
      'Unlimited listings',
      'Premium branding & homepage placement',
      'Full analytics suite',
      'Priority support & account manager',
      'Sponsored posts',
    ],
    popular: false,
  },
] as const;

// Helper functions
export function calculateCreditValue(credits: number): number {
  // Use the best rate from packages (Business package rate)
  return credits * 0.154;
}

export function getFeatureByKey(key: string) {
  for (const category of Object.values(FEATURE_CATALOG)) {
    if (category[key as keyof typeof category]) {
      return category[key as keyof typeof category];
    }
  }
  return null;
}

export function getCreditPackageById(id: string) {
  return CREDIT_PACKAGES.find(pkg => pkg.id === id);
}

export function getBusinessPlanById(id: string) {
  return BUSINESS_PLANS.find(plan => plan.id === id);
}

// Feature categories for UI organization
export const FEATURE_CATEGORIES = [
  {
    id: 'visibility',
    name: 'Visibility Boosts',
    description: 'Get more eyes on your listings',
    icon: '👁️',
    features: Object.keys(FEATURE_CATALOG.visibility),
  },
  {
    id: 'management',
    name: 'Listing Management',
    description: 'Automate and optimize your listings',
    icon: '⚙️',
    features: Object.keys(FEATURE_CATALOG.management),
  },
  {
    id: 'business',
    name: 'Business Tools',
    description: 'Professional selling features',
    icon: '🏢',
    features: Object.keys(FEATURE_CATALOG.business),
  },
] as const;