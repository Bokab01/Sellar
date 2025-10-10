import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAnalytics, type QuickStats, type AnalyticsData } from '@/lib/analyticsService';
import { router } from 'expo-router';

// Import dashboard components
import { BusinessOverview } from '@/components/Dashboard/BusinessOverview';
import { FreeUserDashboard } from '@/components/Dashboard/FreeUserDashboard';

export default function DashboardOverviewScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const hasBusinessPlan = useMonetizationStore(state => state.hasBusinessPlan);
  const { getQuickStats, getBusinessAnalytics } = useAnalytics();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    profileViews: 0,
    totalMessages: 0,
    totalReviews: 0,
    averageRating: 0,
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Determine if user has business plan
  const isBusinessUser = hasBusinessPlan();

  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, analytics] = await Promise.all([
        getQuickStats(),
        getBusinessAnalytics(),
      ]);
      
      setQuickStats(stats);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle tab navigation from within components
  const handleTabChange = useCallback((tab: string) => {
    // Navigate to the corresponding tab in the layout
    if (tab === 'boost') {
      router.push('/dashboard/auto-refresh');
    } else if (tab === 'analytics') {
      router.push('/dashboard/analytics');
    } else if (tab === 'support') {
      router.push('/dashboard/support');
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isBusinessUser ? (
          <BusinessOverview
            loading={loading}
            quickStats={quickStats}
            analyticsData={analyticsData}
            onTabChange={handleTabChange}
          />
        ) : (
          <FreeUserDashboard
            loading={loading}
            quickStats={quickStats}
          />
        )}
      </ScrollView>
    </View>
  );
}



