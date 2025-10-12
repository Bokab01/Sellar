import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { Text, SafeAreaWrapper } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';
import { AUTH_TIMEOUTS } from '@/constants/auth';

const MAX_LOADING_TIME = AUTH_TIMEOUTS.APP_INIT_MAX; // Maximum time for complete app initialization

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [forceReady, setForceReady] = useState(false);

  // ✅ OPTIMIZED: Removed useNewUserDetection from here
  // New user check now happens AFTER navigation to home screen

  useEffect(() => {
    // Add a small delay to ensure auth state is properly initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Safety timeout: If loading takes too long, force navigation
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout reached. Forcing navigation to prevent stuck screen.');
        setForceReady(true);
      }
    }, MAX_LOADING_TIME);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Show loading state while checking authentication
  if ((loading || !isReady) && !forceReady) {
    return (
      <SafeAreaWrapper backgroundColor={theme.colors.background}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 16,
        }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="body" color="secondary">Loading...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  // ✅ SIMPLIFIED: Navigate immediately based on auth state
  // New user detection happens in home screen, not here
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  } else {
    // Not authenticated, show onboarding
    return <Redirect href="/(auth)/onboarding" />;
  }
}
