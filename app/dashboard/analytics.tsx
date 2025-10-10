import React, { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import { BusinessAnalytics } from '@/components/Dashboard/BusinessAnalytics';

export default function DashboardAnalyticsScreen() {
  const { theme } = useTheme();

  // Handle tab navigation from within components
  const handleTabChange = useCallback((tab: string) => {
    // Navigate to the corresponding tab in the layout
    if (tab === 'overview') {
      router.push('/dashboard');
    } else if (tab === 'boost') {
      router.push('/dashboard/auto-refresh');
    } else if (tab === 'support') {
      router.push('/dashboard/support');
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
      >
        <BusinessAnalytics onTabChange={handleTabChange} />
      </ScrollView>
    </View>
  );
}

