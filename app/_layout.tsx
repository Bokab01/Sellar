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

Sentry.init({
  dsn: 'https://6599b79bf71d8de895ac3c894c856fe7@o4509911485775872.ingest.de.sentry.io/4510037487124560',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

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

        // Initialize monetization data (credits and subscription)
        try {
          const { refreshCredits, refreshSubscription } = useMonetizationStore.getState();
          await Promise.all([
            refreshCredits(),
            refreshSubscription(),
          ]);
        } catch (error) {
          console.error('Failed to initialize monetization data:', error);
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
        </RewardsProvider>
      </FollowProvider>
    </AuthErrorBoundary>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
});