import { useEffect, useState, useCallback } from 'react';
import { preloadCriticalComponents, preloadFeatureComponents } from '@/lib/codeSplitting';

interface PerformanceMetrics {
  componentLoadTime: number;
  memoryUsage: number;
  renderCount: number;
  lastRenderTime: number;
}

export function usePerformanceOptimization() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    componentLoadTime: 0,
    memoryUsage: 0,
    renderCount: 0,
    lastRenderTime: 0,
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  // Track component load time
  const trackComponentLoad = useCallback((componentName: string, startTime: number) => {
    const loadTime = performance.now() - startTime;
    setMetrics(prev => ({
      ...prev,
      componentLoadTime: loadTime,
    }));
    
    console.log(`🚀 ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
  }, []);

  // Track render performance
  const trackRender = useCallback(() => {
    const renderTime = performance.now();
    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
      lastRenderTime: renderTime,
    }));
  }, []);

  // Preload components based on user behavior
  const preloadComponents = useCallback((feature: 'business' | 'community' | 'recommendations' | 'search') => {
    setIsOptimizing(true);
    preloadFeatureComponents(feature);
    
    // Simulate optimization delay
    setTimeout(() => {
      setIsOptimizing(false);
    }, 100);
  }, []);

  // Initialize performance optimization
  useEffect(() => {
    // Preload critical components on app start
    preloadCriticalComponents();
    
    // Track initial render
    trackRender();
  }, [trackRender]);

  return {
    metrics,
    isOptimizing,
    trackComponentLoad,
    trackRender,
    preloadComponents,
  };
}

// Hook for component-level performance tracking
export function useComponentPerformance(componentName: string) {
  const [loadStartTime] = useState(() => performance.now());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTime = performance.now() - loadStartTime;
    setIsLoaded(true);
    
    console.log(`📊 ${componentName} performance:`, {
      loadTime: `${loadTime.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
    });
  }, [componentName, loadStartTime]);

  return {
    isLoaded,
    loadTime: performance.now() - loadStartTime,
  };
}
