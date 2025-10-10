import React, { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import { BusinessSupport } from '@/components/Dashboard/BusinessSupport';

export default function DashboardSupportScreen() {
  const { theme } = useTheme();

  // Handle tab navigation from within components
  const handleTabChange = useCallback((tab: string) => {
    // Navigate to the corresponding tab in the layout
    if (tab === 'overview') {
      router.push('/dashboard');
    } else if (tab === 'boost') {
      router.push('/dashboard/auto-refresh');
    } else if (tab === 'analytics') {
      router.push('/dashboard/analytics');
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
      >
        <BusinessSupport onTabChange={handleTabChange} />
      </ScrollView>
    </View>
  );
}

