import React, { useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import { BusinessAnalytics } from '@/components/Dashboard/BusinessAnalytics';

export default function DashboardAnalyticsScreen() {
  const { theme } = useTheme();
  const analyticsRef = useRef<{ handleRefresh: () => Promise<void> }>(null);

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

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (analyticsRef.current?.handleRefresh) {
      await analyticsRef.current.handleRefresh();
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={false} // Controlled by BusinessAnalytics component
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <BusinessAnalytics ref={analyticsRef} onTabChange={handleTabChange} />
      </ScrollView>
    </View>
  );
}

