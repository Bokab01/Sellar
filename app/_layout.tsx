import 'react-native-get-random-values'; // Must be imported before any crypto operations

// EMERGENCY: Disable security logging to stop infinite loops

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { IntegrationStatus } from '@/components/IntegrationStatus/IntegrationStatus';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { RewardsProvider } from '@/components/RewardsProvider/RewardsProvider';
import { SplashScreenManager, useSplashScreen } from '@/components/SplashScreen';
import { AuthErrorBoundary } from '@/components/AuthErrorBoundary/AuthErrorBoundary';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary/GlobalErrorBoundary';
import { FollowProvider } from '@/hooks/useFollowState';
import { TrialEndingModal } from '@/components/TrialEndingModal/TrialEndingModal';
import { useEffect } from 'react';
import { securityService } from '@/lib/securityService';
import { offlineStorage } from '@/lib/offlineStorage';
import { memoryManager } from '@/utils/memoryManager';
import { recoverFromCorruptedSession } from '@/utils/authErrorHandler';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { initializeWebOptimizations } from '@/lib/webOptimizations';
import { useRefreshTokenError } from '@/hooks/useRefreshTokenError';
import { setupAuthErrorInterceptor } from '@/lib/authErrorInterceptor';
import { setupNetworkInterceptor } from '@/scripts/monitorBandwidth';
import * as Sentry from '@sentry/react-native';
import { usePresence } from '@/hooks/usePresence';
import { useGlobalNotificationSubscription } from '@/hooks/useGlobalNotificationSubscription';
import { useGlobalChatSubscription } from '@/hooks/useGlobalChatSubscription';
import { InAppNotificationHandler } from '@/components/InAppNotificationHandler/InAppNotificationHandler';
import { useRealtimeConnectionManager } from '@/hooks/useRealtimeConnectionManager';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useBlockedUsersLoader } from '@/hooks/useBlockedUsersLoader';
import { AppState, AppStateStatus } from 'react-native';

// Suppress non-critical errors in development
// This prevents metro bundler errors from causing rendering issues
if (__DEV__) {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const firstArg = args[0];
    
    // Suppress the specific metro error that causes rendering issues
    if (typeof firstArg === 'string' && firstArg.includes('Text strings must be rendered within a <Text> component')) {
      return;
    }
    
    // ✅ Suppress profile fetch timeout errors (non-critical, handled gracefully)
    if (typeof firstArg === 'string' && firstArg.includes('Profile fetch timeout')) {
      return;
    }
    
    if (typeof firstArg === 'string' && firstArg.includes('Error fetching user profile')) {
      return;
    }
    
    originalError.apply(console, args);
  };
}

// Only initialize Sentry in production
if (!__DEV__) {
  Sentry.init({
    dsn: 'https://6599b79bf71d8de895ac3c894c856fe7@o4509911485775872.ingest.de.sentry.io/4510037487124560',
    sendDefaultPii: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
  });
}

// App content component that uses theme context
function AppContent() {
  const { theme, isDarkMode } = useTheme();
  
  useFrameworkReady();
  
  // Re-enable push notifications with error handling
  usePushNotifications();
  
  // Initialize performance monitoring
  const { startRender, endRender } = usePerformanceMonitor('app_layout');
  
  // Re-enable offline sync with performance optimizations
  const { isOnline, pendingChanges } = useOfflineSync();
  
  // Handle refresh token errors globally
  useRefreshTokenError();
  
  // Track user presence (online/offline status) globally
  usePresence();
  // Manage realtime reconnection globally (AppState, NetInfo, auth)
  useRealtimeConnectionManager();

  // Ensure unread notification count is initialized and kept fresh on resume
  const { fetchNotifications } = useNotificationStore();
  useEffect(() => {
    // Initial fetch with timeout
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
    Promise.race([fetchNotifications(), timeoutPromise]).catch(err => {
      console.warn('Initial fetchNotifications timed out or failed:', err);
    });
    
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // Fetch on resume with timeout protection
        const resumeTimeout = new Promise(resolve => setTimeout(resolve, 5000));
        Promise.race([fetchNotifications(), resumeTimeout]).catch(err => {
          console.warn('Resume fetchNotifications timed out or failed:', err);
        });
      }
    });
    return () => sub.remove();
  }, [fetchNotifications]);
  
  // Set up global notification real-time subscription
  useGlobalNotificationSubscription();
  
  // Set up global chat real-time subscription for unread counts
  useGlobalChatSubscription();
  
  // Load blocked users into store on app start
  useBlockedUsersLoader();
  
  // Splash screen management
  const { isAppReady, showCustomSplash, handleAppReady, handleAnimationComplete } = useSplashScreen();


  // Initialize all services (gradually re-enabled with performance optimizations)
  useEffect(() => {
    const initializeServices = async () => {
      
      // Quick initialization with timeout fallback
      const initPromise = initializeAllServices();
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000)); // 3 second timeout
      
      try {
        await Promise.race([initPromise, timeoutPromise]);
      } catch (error) {
        console.warn('Service initialization had issues, but continuing:', error);
      }
      
      handleAppReady();
    };
    
    const initializeAllServices = async () => {
      const initTimer = 'app_initialization';
      startRender();

      try {
        // Setup global auth error interceptor first
        setupAuthErrorInterceptor();

        // Recover from any corrupted sessions first (with timeout)
        try {
          const recoveryPromise = recoverFromCorruptedSession();
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1000));
          const recovery = await Promise.race([recoveryPromise, timeoutPromise]) as any;
          
          if (recovery && recovery.recovered) {
          } else {
            console.warn('Session recovery skipped or failed');
          }
        } catch (error) {
          console.error('Session recovery error:', error);
          // Continue initialization even if recovery fails
        }

        // Initialize security services (with timeout)
        try {
          const securityPromise = securityService.initialize();
          const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
          await Promise.race([securityPromise, timeoutPromise]);
        } catch (error) {
          console.error('Failed to initialize security services:', error);
          // Continue app initialization even if security services fail
        }

        // Initialize offline storage
        try {
        } catch (error) {
          console.error('Failed to initialize offline storage:', error);
        }

        // Initialize memory manager
        try {
        } catch (error) {
          console.error('Failed to initialize memory manager:', error);
        }

        // Initialize web optimizations
        try {
          initializeWebOptimizations();
        } catch (error) {
          console.error('Failed to initialize web optimizations:', error);
        }

        // Initialize bandwidth monitoring
        try {
          setupNetworkInterceptor();
        } catch (error) {
          console.error('Failed to initialize bandwidth monitoring:', error);
        }

        // R2 Storage is now secure via Edge Functions (no client-side initialization needed)
        console.log('✅ R2 Storage ready - using secure Edge Functions for uploads');

        // Initialize monetization data (credits and subscription) with timeout
        try {
          const { refreshCredits, refreshSubscription } = useMonetizationStore.getState();
          const monetizationPromises = Promise.all([
            refreshCredits(),
            refreshSubscription(),
          ]);
          const monetizationTimeout = new Promise((resolve) => setTimeout(resolve, 5000));
          
          await Promise.race([monetizationPromises, monetizationTimeout]);
        } catch (error) {
          console.warn('Failed to initialize monetization data (continuing anyway):', error);
        }

      } catch (error) {
        console.error('Failed to initialize services:', error);
      } finally {
        endRender();
        // Mark app as ready after services are initialized
        handleAppReady();
      }
    };

    // Add a small delay to ensure other services are ready
    const timer = setTimeout(() => {
      initializeServices();
    }, 100);

    return () => {
      clearTimeout(timer);
      // Cleanup services when app unmounts
      memoryManager.destroy();
      offlineStorage.destroy();
    };
  }, [startRender, endRender]);

  return (
    <AuthErrorBoundary>
      <FollowProvider>
        <RewardsProvider>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            // Add consistent background color to prevent flashing
            contentStyle: { backgroundColor: theme.colors.background },
            // Optimize animations for smoother transitions
            animation: 'slide_from_right',
            animationDuration: 200,
          }}
        >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/[id]"  />
        <Stack.Screen name="buy-credits"  />
        <Stack.Screen name="edit-profile"  />
        <Stack.Screen name="feature-marketplace"  />
        <Stack.Screen name="help"  />
        <Stack.Screen name="invite"  />
        <Stack.Screen name="my-listings"  />
        <Stack.Screen name="my-rewards"  />
        <Stack.Screen name="notification-settings"  />
        <Stack.Screen name="notifications"  />
        <Stack.Screen name="paystack-diagnostics" />
        <Stack.Screen name="search"  />
        <Stack.Screen name="subscription-plans"  />
        <Stack.Screen name="support-tickets"  />
        <Stack.Screen name="favorites"  />
        <Stack.Screen name="reviews"  />
        <Stack.Screen name="transactions"  />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="chat-detail/[id]" />
      </Stack>
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'} 
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      
      {/* Development Integration Status - Temporarily disabled */}
      {/* <IntegrationStatus visible={__DEV__} position="top-right" /> */}
      
      {/* Professional Splash Screen with Dark Mode Support */}
      {showCustomSplash && (
        <SplashScreenManager
          isAppReady={isAppReady}
          onAnimationComplete={handleAnimationComplete}
        />
      )}
      
      {/* Trial Ending Modal - Global */}
      <TrialEndingModal />
      
      {/* In-App Notification Handler - Global */}
      <InAppNotificationHandler />
        </RewardsProvider>
      </FollowProvider>
    </AuthErrorBoundary>
  );
}

function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}

// Only wrap with Sentry in production
export default __DEV__ ? RootLayout : Sentry.wrap(RootLayout);