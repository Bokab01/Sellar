import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Keep splash screen visible while loading
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        // Authenticated routes
        <Stack.Screen name="(tabs)" />
      ) : (
        // Authentication routes
        <>
          <Stack.Screen name="(auth)/sign-in" />
          <Stack.Screen name="(auth)/sign-up" />
        </>
      )}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ThemeProvider>
      <AppContent />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}