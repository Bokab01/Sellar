import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { BusinessSupport } from '@/components/Dashboard/BusinessSupport';
import { router } from 'expo-router';

export default function BusinessSupportScreen() {
  const { theme } = useTheme();

  const handleTabChange = (tab: 'overview' | 'boost' | 'analytics' | 'support') => {
    if (tab === 'overview') {
      router.push('/(business)/dashboard');
    } else if (tab === 'boost') {
      router.push('/(business)/auto-refresh');
    } else if (tab === 'analytics') {
      router.push('/(business)/analytics');
    }
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Business Support"
        showBackButton
        onBackPress={() => router.back()}
      />
      <BusinessSupport onTabChange={handleTabChange} />
    </SafeAreaWrapper>
  );
}
