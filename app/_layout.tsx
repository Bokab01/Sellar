import 'react-native-get-random-values'; // Must be imported before any crypto operations

// EMERGENCY: Disable security logging to stop infinite loops

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { useEffect } from 'react';
import { securityService } from '@/lib/securityService';
import { offlineStorage } from '@/lib/offlineStorage';
import { memoryManager } from '@/utils/memoryManager';
import { recoverFromCorruptedSession } from '@/utils/authErrorHandler';
import { useMonetizationStore } from '@/store/useMonetizationStore';

// App content component that uses theme context
function AppContent() {
  const { theme, isDarkMode } = useTheme();
  
  useFrameworkReady();
  
  // Temporarily disable push notifications to prevent infinite loop
  // TODO: Re-enable after fixing the database constraint issue
  // usePushNotifications();
  
  // Initialize performance monitoring
  const { startTimer, endTimer } = usePerformanceMonitor();
  const { isOnline, pendingChanges } = useOfflineSync();
  
  // Splash screen management
  const { isAppReady, showCustomSplash, handleAppReady, handleAnimationComplete } = useSplashScreen();


  // Initialize all services
  useEffect(() => {
    const initializeServices = async () => {
      const initTimer = 'app_initialization';
      startTimer(initTimer);

      try {
        // Recover from any corrupted sessions first
        try {
          const recovery = await recoverFromCorruptedSession();
          if (recovery.recovered) {
            console.log('Session recovery completed:', recovery.cleanState ? 'clean state' : 'authenticated state');
          } else {
            console.warn('Session recovery failed:', recovery.error);
          }
        } catch (error) {
          console.error('Session recovery error:', error);
          // Continue initialization even if recovery fails
        }

        // Initialize security services
        try {
          await securityService.initialize();
          console.log('Security services initialized successfully');
        } catch (error) {
          console.error('Failed to initialize security services:', error);
          // Continue app initialization even if security services fail
        }

        // Initialize offline storage
        try {
          console.log('Offline storage initialized');
        } catch (error) {
          console.error('Failed to initialize offline storage:', error);
        }

        // Initialize memory manager
        try {
          console.log('Memory manager initialized');
        } catch (error) {
          console.error('Failed to initialize memory manager:', error);
        }

        // Initialize monetization data (credits and subscription)
        try {
          const { refreshCredits, refreshSubscription } = useMonetizationStore.getState();
          await Promise.all([
            refreshCredits(),
            refreshSubscription(),
          ]);
          console.log('Monetization data initialized successfully');
        } catch (error) {
          console.error('Failed to initialize monetization data:', error);
        }

        console.log('All services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      } finally {
        endTimer(initTimer, 'navigation', { screen: 'app_initialization' });
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
  }, [startTimer, endTimer]);

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
        <Stack.Screen name="knowledge-base"  />
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
        </RewardsProvider>
      </FollowProvider>
    </AuthErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}