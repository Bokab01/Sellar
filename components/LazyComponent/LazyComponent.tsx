import React, { Suspense, lazy, ComponentType, LazyExoticComponent } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Text } from '@/components/Typography/Text';

interface LazyComponentProps {
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  height?: number;
  style?: any;
}

interface LazyComponentState {
  hasError: boolean;
  error?: Error;
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  LazyComponentState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LazyComponentState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error?: Error }) {
  const { theme } = useTheme();
  
  return (
          <View
        style={{
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.error + '20',
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
        }}
      >
        <Text variant="body" style={{ color: theme.colors.error }}>
          Failed to load component
        </Text>
        {error && (
          <Text variant="caption" style={{ 
            color: theme.colors.error,
            opacity: 0.7,
            marginTop: theme.spacing.sm,
          }}>
            {error.message}
          </Text>
        )}
      </View>
  );
}

function DefaultLoadingFallback({ height }: { height?: number }) {
  const { theme } = useTheme();
  
  return (
    <View style={{ padding: theme.spacing.md }}>
      <LoadingSkeleton width="100%" height={height || 100} />
    </View>
  );
}

export function LazyComponent({
  fallback,
  errorFallback,
  height,
  style,
  children,
}: LazyComponentProps & { children: React.ReactNode }) {
  return (
    <LazyErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <DefaultLoadingFallback height={height} />}>
        <View style={style}>
          {children}
        </View>
      </Suspense>
    </LazyErrorBoundary>
  );
}

// Higher-order component for creating lazy components
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: LazyComponentProps = {}
) {
  return function LazyWrappedComponent(props: P) {
    return (
      <LazyComponent {...options}>
        <Component {...props} />
      </LazyComponent>
    );
  };
}

// Utility function to create lazy components with better error handling
export function createLazyComponent<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  options: LazyComponentProps = {}
) {
  const LazyComp = lazy(async () => {
    try {
      const module = await importFunction();
      return module;
    } catch (error) {
      console.error('Failed to load lazy component:', error);
      // Return a fallback component
      return {
        default: (() => (
          <DefaultErrorFallback error={error as Error} />
        )) as unknown as T,
      };
    }
  });

  // Wrap with error boundary and loading state
  const WrappedComponent = (props: any) => (
    <LazyComponent {...options}>
      <LazyComp {...props} />
    </LazyComponent>
  );

  return WrappedComponent;
}

// Preload function for lazy components
export function preloadLazyComponent(
  lazyComponent: any
): Promise<void> {
  // This will trigger the import and cache the component
  return new Promise((resolve) => {
    try {
      // Trigger the lazy component loading
      React.createElement(lazyComponent);
      resolve();
    } catch (error) {
      console.error('Failed to preload component:', error);
      resolve();
    }
  });
}

// Hook for managing lazy component preloading
export function useLazyPreload() {
  const preloadedComponents = React.useRef(new Set<string>());

  const preload = React.useCallback(async (
    componentId: string,
    importFunction: () => Promise<any>
  ) => {
    if (preloadedComponents.current.has(componentId)) {
      return; // Already preloaded
    }

    try {
      await importFunction();
      preloadedComponents.current.add(componentId);
    } catch (error) {
      console.error(`Failed to preload component ${componentId}:`, error);
    }
  }, []);

  const isPreloaded = React.useCallback((componentId: string) => {
    return preloadedComponents.current.has(componentId);
  }, []);

  return { preload, isPreloaded };
}

// Intersection observer based lazy loading for components
export function useIntersectionLazyLoad(
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const elementRef = React.useRef<View>(null);

  React.useEffect(() => {
    // React Native doesn't have IntersectionObserver
    // This is a placeholder for a native implementation
    // In a real app, you might use a library like react-native-intersection-observer
    
    // For now, we'll use a simple timeout to simulate lazy loading
    const timer = setTimeout(() => {
      setIsVisible(true);
      setHasBeenVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return {
    ref: elementRef,
    isVisible,
    hasBeenVisible,
  };
}

// Component for intersection-based lazy loading
export function IntersectionLazyComponent({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  once = true,
  ...lazyProps
}: LazyComponentProps & {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}) {
  const { ref, isVisible, hasBeenVisible } = useIntersectionLazyLoad({
    threshold,
    rootMargin,
  });

  const shouldRender = once ? hasBeenVisible : isVisible;

  return (
    <View ref={ref}>
      {shouldRender ? (
        <LazyComponent {...lazyProps}>
          {children}
        </LazyComponent>
      ) : (
        fallback || <DefaultLoadingFallback />
      )}
    </View>
  );
}

// Lazy loading for heavy components based on user interaction
export function useInteractionLazyLoad() {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const triggerLoad = React.useCallback(() => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  }, [shouldLoad]);

  const onComponentLoaded = React.useCallback(() => {
    setIsLoaded(true);
  }, []);

  return {
    shouldLoad,
    isLoaded,
    triggerLoad,
    onComponentLoaded,
  };
}

// Component for interaction-based lazy loading
export function InteractionLazyComponent({
  children,
  trigger = 'press',
  fallback,
  loadingComponent,
  ...lazyProps
}: LazyComponentProps & {
  children: React.ReactNode;
  trigger?: 'press' | 'focus' | 'hover';
  loadingComponent?: React.ReactNode;
}) {
  const { shouldLoad, isLoaded, triggerLoad, onComponentLoaded } = useInteractionLazyLoad();
  const { theme } = useTheme();

  if (!shouldLoad) {
    return (
      <View
        style={{
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
        }}
        onTouchEnd={triggerLoad}
      >
        {fallback || (
          <>
            <Text variant="body" style={{ marginBottom: theme.spacing.sm }}>
              Tap to load content
            </Text>
            <Text variant="caption" color="muted">
              This will load additional features
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <LazyComponent
      {...lazyProps}
      fallback={loadingComponent || <DefaultLoadingFallback />}
    >
      <View onLayout={onComponentLoaded}>
        {children}
      </View>
    </LazyComponent>
  );
}
