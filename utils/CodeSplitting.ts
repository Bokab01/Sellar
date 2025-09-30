import { lazy, ComponentType } from 'react';

// Lazy load heavy components
export const LazyImageViewer = lazy(() => 
  import('@/components/ImageViewer/ImageViewer').then(module => ({ default: module.ImageViewer }))
);

export const LazyBusinessAnalytics = lazy(() => 
  import('@/components/Dashboard/BusinessAnalytics').then(module => ({ default: module.BusinessAnalytics }))
);

export const LazyModerationDashboard = lazy(() => 
  import('@/components/ModerationDashboard/ModerationDashboard').then(module => ({ default: module.ModerationDashboard }))
);

export const LazyGDPRCompliance = lazy(() => 
  import('@/components/GDPRCompliance/GDPRCompliance').then(module => ({ default: module.GDPRCompliance }))
);

// Dynamic imports for screens
export const loadHomeScreen = () => import('@/app/(tabs)/home/index');
export const loadCommunityScreen = () => import('@/app/(tabs)/community/index');
export const loadInboxScreen = () => import('@/app/(tabs)/inbox/index');
export const loadMoreScreen = () => import('@/app/(tabs)/more/index');

// Dynamic imports for heavy features (placeholder for future implementation)
export const loadBusinessFeatures = () => Promise.resolve({ default: () => null });
export const loadModerationFeatures = () => Promise.resolve({ default: () => null });
export const loadAnalyticsFeatures = () => Promise.resolve({ default: () => null });

// Preload critical components
export const preloadCriticalComponents = async () => {
  const criticalComponents = [
    () => import('@/components/Card/Card'),
    () => import('@/components/Grid/Grid'),
    () => import('@/components/Button/Button'),
    () => import('@/components/Input/Input'),
  ];

  await Promise.all(criticalComponents.map(load => load()));
};

// Preload based on user role
export const preloadUserSpecificComponents = async (userRole: 'individual' | 'business' | 'moderator') => {
  const roleComponents = {
    individual: [
      () => import('@/components/Recommendations/RecommendationSection'),
      () => Promise.resolve({ default: () => null }), // FavoritesList placeholder
    ],
    business: [
      () => import('@/components/Dashboard/BusinessOverview'),
      () => import('@/components/Dashboard/BusinessAnalytics'),
      () => import('@/components/BusinessListings/BusinessListings'),
    ],
    moderator: [
      () => import('@/components/ModerationDashboard/ModerationDashboard'),
      () => Promise.resolve({ default: () => null }), // ModerationTools placeholder
    ],
  };

  const components = roleComponents[userRole] || [];
  await Promise.all(components.map(load => load()));
};

// Smart component loading based on usage patterns
export class SmartComponentLoader {
  private componentCache = new Map<string, ComponentType<any>>();
  private usageStats = new Map<string, number>();
  private preloadQueue: (() => Promise<any>)[] = [];

  async loadComponent<T extends ComponentType<any>>(
    componentName: string,
    loader: () => Promise<{ default: T }>
  ): Promise<T> {
    // Check cache first
    if (this.componentCache.has(componentName)) {
      this.usageStats.set(componentName, (this.usageStats.get(componentName) || 0) + 1);
      return this.componentCache.get(componentName) as T;
    }

    // Load component
    const module = await loader();
    const component = module.default;
    
    // Cache component
    this.componentCache.set(componentName, component);
    this.usageStats.set(componentName, 1);

    return component;
  }

  preloadComponent(componentName: string, loader: () => Promise<any>): void {
    this.preloadQueue.push(async () => {
      if (!this.componentCache.has(componentName)) {
        const module = await loader();
        this.componentCache.set(componentName, module.default);
      }
    });
  }

  async processPreloadQueue(): Promise<void> {
    await Promise.all(this.preloadQueue.map(load => load()));
    this.preloadQueue = [];
  }

  getUsageStats(): Record<string, number> {
    return Object.fromEntries(this.usageStats);
  }

  getCacheStats(): { cachedComponents: number; cacheSize: number } {
    return {
      cachedComponents: this.componentCache.size,
      cacheSize: this.componentCache.size * 1024, // Rough estimate
    };
  }
}

// Global smart loader instance
export const smartLoader = new SmartComponentLoader();
