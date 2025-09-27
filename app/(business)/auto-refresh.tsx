import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import AutoBoostDashboard from '@/components/AutoBoostDashboard/AutoBoostDashboard';
import { router } from 'expo-router';

export default function AutoRefreshScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Auto-Refresh Settings"
        showBackButton
        onBackPress={() => router.back()}
      />
      <AutoBoostDashboard />
    </SafeAreaWrapper>
  );
}
