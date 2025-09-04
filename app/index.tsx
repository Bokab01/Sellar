import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View } from 'react-native';
import { Text, SafeAreaWrapper } from '@/components';
import { useTheme } from '@/theme/ThemeProvider';

export default function IndexScreen() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure auth state is properly initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking authentication
  if (loading || !isReady) {
    return (
      <SafeAreaWrapper backgroundColor={theme.colors.background}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
        }}>
          <Text variant="body">Loading...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  // Redirect based on authentication state
  if (user) {
    return <Redirect href="/(tabs)/home" />;
  } else {
    return <Redirect href="/(auth)/sign-in" />;
  }
}
