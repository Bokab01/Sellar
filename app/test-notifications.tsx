import React from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SafeAreaWrapper, AppHeader, NotificationTester } from '@/components';
import { router } from 'expo-router';

export default function TestNotificationsScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Test Notifications"
        showBackButton
        onBackPress={() => router.back()}
      />
      
      <ScrollView 
        contentContainerStyle={{ 
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl 
        }}
      >
        <NotificationTester />
      </ScrollView>
    </SafeAreaWrapper>
  );
}
