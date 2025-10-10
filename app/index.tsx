import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useNewUserDetection } from '@/hooks/useNewUserDetection';
import { View, ActivityIndicator } from 'react-native';
import { Text, SafeAreaWrapper } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

const MAX_LOADING_TIME = 5000; // 5 seconds timeout

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const { isNewUser, loading: newUserLoading } = useNewUserDetection();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [forceReady, setForceReady] = useState(false);

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
      if (loading || newUserLoading) {
        console.warn('⚠️ Loading timeout reached. Forcing navigation to prevent stuck screen.');
        setForceReady(true);
      }
    }, MAX_LOADING_TIME);

    return () => clearTimeout(timeoutId);
  }, [loading, newUserLoading]);

  // Show loading state while checking authentication and new user status
  if ((loading || newUserLoading || !isReady) && !forceReady) {
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

  // Redirect based on authentication state and new user status
  if (user) {
    // Check if user is new and show welcome screen
    if (isNewUser === true) {
      return <Redirect href="/(auth)/welcome" />;
    }
    // Existing user goes to home
    return <Redirect href="/(tabs)/home" />;
  } else {
    // Not authenticated, show onboarding
    return <Redirect href="/(auth)/onboarding" />;
  }
}
