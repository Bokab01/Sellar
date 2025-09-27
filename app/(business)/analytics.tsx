import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { BusinessAnalytics } from '@/components/Dashboard/BusinessAnalytics';
import { router } from 'expo-router';

export default function BusinessAnalyticsScreen() {
  const { theme } = useTheme();

  const handleTabChange = (tab: 'overview' | 'boost' | 'analytics' | 'support') => {
    if (tab === 'overview') {
      router.push('/(business)/dashboard');
    } else if (tab === 'boost') {
      router.push('/(business)/auto-refresh');
    } else if (tab === 'support') {
      router.push('/(business)/support');
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Business Analytics"
        showBackButton
        onBackPress={() => router.back()}
      />
      <BusinessAnalytics onTabChange={handleTabChange} />
    </SafeAreaWrapper>
  );
}
