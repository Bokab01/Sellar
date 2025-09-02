import 'react-native-get-random-values'; // Must be imported before any crypto operations
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useEffect } from 'react';
import { securityService } from '@/lib/securityService';

export default function RootLayout() {
  useFrameworkReady();
  usePushNotifications();

  // Initialize security services
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        await securityService.initialize();
        console.log('Security services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize security services:', error);
        // Continue app initialization even if security services fail
        // This prevents the app from crashing during development
      }
    };

    // Add a small delay to ensure other services are ready
    const timer = setTimeout(() => {
      initializeSecurity();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}