import React from 'react';
import { createLazyComponent, LazyComponent } from '@/components/LazyComponent/LazyComponent';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { useMemoryManager } from '@/utils/memoryManager';

// Lazy load heavy screens to improve initial app load time
export const LazyCreateListingScreen = createLazyComponent(
  () => import('../../app/(tabs)/create'),
  {
    fallback: <LoadingSkeleton width="100%" height={600} />,
    height: 600,
  }
);

export const LazyProfileScreen = createLazyComponent(
  () => import('../../app/profile/[id]'),
  {
    fallback: <LoadingSkeleton width="100%" height={500} />,
    height: 500,
  }
);

export const LazySettingsScreen = createLazyComponent(
  () => import('../../app/(tabs)/more/settings'),
  {
    fallback: <LoadingSkeleton width="100%" height={400} />,
    height: 400,
  }
);

export const LazyMyListingsScreen = createLazyComponent(
  () => import('../../app/my-listings'),
  {
    fallback: <LoadingSkeleton width="100%" height={500} />,
    height: 500,
  }
);

// Memory-aware component wrapper
export function MemoryAwareScreen({ 
  children, 
  fallback,
  memoryThreshold = 0.7 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
  memoryThreshold?: number;
}) {
  const { shouldLoadHeavyComponent, memoryUsage } = useMemoryManager();
  
  // Don't load heavy components if memory usage is too high
  if (memoryUsage && memoryUsage.percentage > memoryThreshold) {
    return (
      <LazyComponent fallback={fallback}>
        {children}
      </LazyComponent>
    );
  }
  
  // Load immediately if memory usage is acceptable
  return <>{children}</>;
}

// Progressive loading wrapper for heavy components
export function ProgressiveLoadingWrapper({
  children,
  priority = 1,
  delay = 0,
}: {
  children: React.ReactNode;
  priority?: number;
  delay?: number;
}) {
  const { shouldLoadHeavyComponent } = useMemoryManager();
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldLoadHeavyComponent()) {
        setShouldLoad(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [shouldLoadHeavyComponent, delay]);

  if (!shouldLoad) {
    return <LoadingSkeleton width="100%" height={200} />;
  }

  return <>{children}</>;
}

// Intersection-based lazy loading for screen sections
export function LazyScreenSection({
  children,
  threshold = 0.1,
  rootMargin = '50px',
}: {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}) {
  return (
    <LazyComponent
      fallback={<LoadingSkeleton width="100%" height={150} />}
    >
      {children}
    </LazyComponent>
  );
}

// Conditional component loader based on device capabilities
export function AdaptiveComponentLoader({
  heavyComponent,
  lightComponent,
  fallback,
}: {
  heavyComponent: React.ReactNode;
  lightComponent: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { shouldLoadHeavyComponent, memoryUsage } = useMemoryManager();

  // Use light component if memory is constrained
  if (memoryUsage && memoryUsage.percentage > 0.8) {
    return <>{lightComponent}</>;
  }

  // Use heavy component if we have enough resources
  if (shouldLoadHeavyComponent()) {
    return (
      <LazyComponent fallback={fallback}>
        {heavyComponent}
      </LazyComponent>
    );
  }

  // Default to light component
  return <>{lightComponent}</>;
}
