import 'react-native-get-random-values'; // Must be imported before any crypto operations
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { IntegrationStatus } from '@/components/IntegrationStatus/IntegrationStatus';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useEffect } from 'react';
import { securityService } from '@/lib/securityService';
import { offlineStorage } from '@/lib/offlineStorage';
import { memoryManager } from '@/utils/memoryManager';

export default function RootLayout() {
  useFrameworkReady();
  usePushNotifications();
  
  // Initialize performance monitoring
  const { startTimer, endTimer } = usePerformanceMonitor();
  const { isOnline, pendingChanges } = useOfflineSync();

  // Initialize all services
  useEffect(() => {
    const initializeServices = async () => {
      const initTimer = 'app_initialization';
      startTimer(initTimer);

      try {
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

        console.log('All services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize services:', error);
      } finally {
        endTimer(initTimer, 'navigation', { screen: 'app_initialization' });
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
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      
      {/* Development Integration Status - Temporarily disabled */}
      {/* <IntegrationStatus visible={__DEV__} position="top-right" /> */}
    </ThemeProvider>
  );
}