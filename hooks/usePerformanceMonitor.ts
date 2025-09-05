import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  jsHeapSize: number;
  navigationTime: number;
  apiResponseTime: number;
  imageLoadTime: number;
  crashCount: number;
  errorCount: number;
}

interface PerformanceEvent {
  type: 'render' | 'navigation' | 'api' | 'image' | 'error' | 'crash';
  duration?: number;
  metadata?: any;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    memoryUsage: 0,
    jsHeapSize: 0,
    navigationTime: 0,
    apiResponseTime: 0,
    imageLoadTime: 0,
    crashCount: 0,
    errorCount: 0,
  };

  private events: PerformanceEvent[] = [];
  private listeners: ((metrics: PerformanceMetrics) => void)[] = [];
  private timers: Map<string, number> = new Map();

  constructor() {
    this.setupGlobalErrorHandling();
    this.setupMemoryMonitoring();
  }

  private setupGlobalErrorHandling() {
    // Global error handler
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.recordEvent({
        type: 'error',
        metadata: { message: args.join(' ') },
        timestamp: Date.now(),
      });
      this.metrics.errorCount++;
      this.notifyListeners();
      originalConsoleError.apply(console, args);
    };

    // Unhandled promise rejections
    if (typeof global !== 'undefined' && global.process) {
      global.process.on?.('unhandledRejection', (reason: any) => {
        this.recordEvent({
          type: 'error',
          metadata: { type: 'unhandledRejection', reason },
          timestamp: Date.now(),
        });
        this.metrics.errorCount++;
        this.notifyListeners();
      });
    }
  }

  private setupMemoryMonitoring() {
    // Monitor memory usage periodically
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 30000); // Every 30 seconds
  }

  private updateMemoryMetrics() {
    try {
      // React Native doesn't have direct access to memory info
      // This is a placeholder for native module integration
      if (global.performance && (global.performance as any).memory) {
        this.metrics.jsHeapSize = (global.performance as any).memory.usedJSHeapSize;
        this.metrics.memoryUsage = (global.performance as any).memory.totalJSHeapSize;
      }
    } catch (error) {
      // Silently fail if memory monitoring is not available
    }
  }

  startTimer(key: string) {
    this.timers.set(key, Date.now());
  }

  endTimer(key: string, type: PerformanceEvent['type'], metadata?: any): number {
    const startTime = this.timers.get(key);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.timers.delete(key);

    this.recordEvent({
      type,
      duration,
      metadata,
      timestamp: Date.now(),
    });

    // Update relevant metrics
    switch (type) {
      case 'render':
        this.metrics.renderTime = duration;
        break;
      case 'navigation':
        this.metrics.navigationTime = duration;
        break;
      case 'api':
        this.metrics.apiResponseTime = duration;
        break;
      case 'image':
        this.metrics.imageLoadTime = duration;
        break;
    }

    this.notifyListeners();
    return duration;
  }

  recordEvent(event: PerformanceEvent) {
    this.events.push(event);
    
    // Keep only last 100 events to prevent memory leaks
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getEvents(): PerformanceEvent[] {
    return [...this.events];
  }

  subscribe(listener: (metrics: PerformanceMetrics) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.metrics));
  }

  // Performance analysis methods
  getAverageRenderTime(): number {
    const renderEvents = this.events.filter(e => e.type === 'render' && e.duration);
    if (renderEvents.length === 0) return 0;
    
    const total = renderEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    return total / renderEvents.length;
  }

  getSlowOperations(threshold: number = 1000): PerformanceEvent[] {
    return this.events.filter(e => e.duration && e.duration > threshold);
  }

  generateReport(): string {
    const avgRender = this.getAverageRenderTime();
    const slowOps = this.getSlowOperations();
    
    return `
Performance Report:
- Average Render Time: ${avgRender.toFixed(2)}ms
- Navigation Time: ${this.metrics.navigationTime}ms
- API Response Time: ${this.metrics.apiResponseTime}ms
- Error Count: ${this.metrics.errorCount}
- Slow Operations: ${slowOps.length}
- Memory Usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
    `.trim();
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(
    performanceMonitor.getMetrics()
  );
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    // Subscribe to metrics updates
    const unsubscribe = performanceMonitor.subscribe(setMetrics);
    return unsubscribe;
  }, []);

  // Track component render performance - only on mount/unmount
  useEffect(() => {
    renderStartTime.current = Date.now();
    
    return () => {
      const renderTime = Date.now() - renderStartTime.current;
      performanceMonitor.recordEvent({
        type: 'render',
        duration: renderTime,
        timestamp: Date.now(),
      });
    };
  }, []); // Add empty dependency array to prevent infinite re-renders

  const startTimer = useCallback((key: string) => {
    performanceMonitor.startTimer(key);
  }, []);

  const endTimer = useCallback((key: string, type: PerformanceEvent['type'], metadata?: any) => {
    return performanceMonitor.endTimer(key, type, metadata);
  }, []);

  const recordEvent = useCallback((event: Omit<PerformanceEvent, 'timestamp'>) => {
    performanceMonitor.recordEvent({
      ...event,
      timestamp: Date.now(),
    });
  }, []);

  const getReport = useCallback(() => {
    return performanceMonitor.generateReport();
  }, []);

  return {
    metrics,
    startTimer,
    endTimer,
    recordEvent,
    getReport,
    events: performanceMonitor.getEvents(),
  };
}

// Hook for monitoring API performance
export function useApiPerformanceMonitor() {
  const { startTimer, endTimer } = usePerformanceMonitor();

  const wrapApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const timerKey = `api_${endpoint}_${Date.now()}`;
    startTimer(timerKey);
    
    try {
      const result = await apiCall();
      endTimer(timerKey, 'api', { endpoint, success: true });
      return result;
    } catch (error) {
      endTimer(timerKey, 'api', { endpoint, success: false, error: (error as any).message });
      throw error;
    }
  }, [startTimer, endTimer]);

  return { wrapApiCall };
}

// Hook for monitoring navigation performance
export function useNavigationPerformanceMonitor() {
  const { startTimer, endTimer } = usePerformanceMonitor();
  const navigationStartTime = useRef<number>(0);

  const startNavigation = useCallback((route: string) => {
    const timerKey = `navigation_${route}`;
    navigationStartTime.current = Date.now();
    startTimer(timerKey);
  }, [startTimer]);

  const endNavigation = useCallback((route: string) => {
    const timerKey = `navigation_${route}`;
    endTimer(timerKey, 'navigation', { route });
  }, [endTimer]);

  return {
    startNavigation,
    endNavigation,
  };
}

// Hook for monitoring image loading performance
export function useImagePerformanceMonitor() {
  const { startTimer, endTimer } = usePerformanceMonitor();

  const trackImageLoad = useCallback((imageUrl: string) => {
    const timerKey = `image_${imageUrl}`;
    startTimer(timerKey);

    return {
      onLoad: () => endTimer(timerKey, 'image', { url: imageUrl, success: true }),
      onError: (error: any) => endTimer(timerKey, 'image', { url: imageUrl, success: false, error }),
    };
  }, [startTimer, endTimer]);

  return { trackImageLoad };
}

// Hook for app state monitoring
export function useAppStateMonitor() {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const { recordEvent } = usePerformanceMonitor();

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      recordEvent({
        type: 'navigation',
        metadata: { 
          from: appState, 
          to: nextAppState,
          type: 'app_state_change'
        },
      });
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]); // Remove recordEvent from dependencies to prevent circular dependency

  return appState;
}

export default performanceMonitor;
