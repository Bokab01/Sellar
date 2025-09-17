import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { 
  BarChart3, 
  Zap, 
  HeadphonesIcon,
  TrendingUp
} from 'lucide-react-native';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics, type QuickStats, type AnalyticsData } from '@/lib/analyticsService';

// Import dashboard components
import { 
  BusinessOverview, 
  BusinessBoostManager, 
  BusinessAnalytics, 
  BusinessSupport, 
  FreeUserDashboard 
} from '@/components/Dashboard';

type DashboardTab = 'overview' | 'boost' | 'analytics' | 'support';

interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: (color: string) => React.ReactNode;
}

export default function BusinessDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const currentSubscription = useMonetizationStore(state => state.currentSubscription);
  const hasBusinessPlan = useMonetizationStore(state => state.hasBusinessPlan);
  const { getQuickStats, getBusinessAnalytics } = useAnalytics();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    profileViews: 0,
    totalMessages: 0,
    totalReviews: 0,
    averageRating: 0,
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Determine if user has business plan
  const isBusinessUser = useMemo(() => {
    return hasBusinessPlan();
  }, [hasBusinessPlan, currentSubscription]);
  
  const currentTier = useMemo((): 'free' | 'business' => {
    return isBusinessUser ? 'business' : 'free';
  }, [isBusinessUser]);

  // Available tabs for business users only
  const availableTabs = useMemo((): TabConfig[] => {
    if (currentTier !== 'business') {
      return [];
    }

    return [
      {
        id: 'overview',
        label: 'Overview',
        icon: (color: string) => <BarChart3 size={18} color={color} />,
      },
      {
        id: 'boost',
        label: 'Boost',
        icon: (color: string) => <Zap size={18} color={color} />,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: (color: string) => <TrendingUp size={18} color={color} />,
      },
      {
        id: 'support',
        label: 'Support',
        icon: (color: string) => <HeadphonesIcon size={18} color={color} />,
      },
    ];
  }, [currentTier]);

  // Load dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setSubscriptionLoading(true);
        // First, refresh subscription data to ensure we have the latest info
        await useMonetizationStore.getState().refreshSubscription();
        setSubscriptionLoading(false);
        
        // Then load dashboard data
        await loadDashboardData();
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        setSubscriptionLoading(false);
      }
    };
    
    initializeDashboard();
  }, []);

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
      // Force refresh subscription data
      await useMonetizationStore.getState().refreshSubscription();
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
  }, []);

  // Render tab bar for business users
  const renderTabBar = useMemo(() => (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingVertical: theme.spacing.md,
    }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
        }}
        style={{ flexGrow: 0 }}
      >
        <View style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 50,
          padding: theme.spacing.xs,
          flexDirection: 'row',
        }}>
          {availableTabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.lg,
                  backgroundColor: isActive ? theme.colors.primary : 'transparent',
                  borderRadius: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  marginRight: index < availableTabs.length - 1 ? theme.spacing.xs : 0,
                }}
              >
                {tab.icon(isActive ? theme.colors.text.inverse : theme.colors.text.primary)}
                <Text
                  variant="bodySmall"
                  style={{
                    color: isActive ? theme.colors.text.inverse : theme.colors.text.primary,
                    fontWeight: isActive ? '600' : '500',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  ), [availableTabs, activeTab, theme]);

  // Render tab content for business users
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <BusinessOverview
            loading={loading}
            quickStats={quickStats}
            analyticsData={analyticsData}
            onTabChange={handleTabChange}
          />
        );
      case 'boost':
        return (
          <BusinessBoostManager
            onTabChange={handleTabChange}
          />
        );
      case 'analytics':
        return (
          <BusinessAnalytics
            onTabChange={handleTabChange}
          />
        );
      case 'support':
        return (
          <BusinessSupport
            onTabChange={handleTabChange}
          />
        );
      default:
        return (
          <BusinessOverview
            loading={loading}
            quickStats={quickStats}
            analyticsData={analyticsData}
            onTabChange={handleTabChange}
          />
        );
    }
  }, [activeTab, loading, quickStats, analyticsData, handleTabChange]);

  // Show loading while subscription data is being fetched
  if (subscriptionLoading) {
    return (
      <SafeAreaWrapper>
        <View style={{ flex: 1, marginTop: theme.spacing.md }}>
          <AppHeader title="Dashboard" />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text variant="body" color="secondary">Loading subscription data...</Text>
          </View>
        </View>
      </SafeAreaWrapper>
    );
  }

  // Free user dashboard (single screen, no tabs)
  if (currentTier === 'free') {
    return (
      <SafeAreaWrapper>
        <View style={{ flex: 1, marginTop: theme.spacing.md }}>
          <AppHeader title="Dashboard" />
          <FreeUserDashboard
            loading={loading}
            quickStats={quickStats}
          />
        </View>
      </SafeAreaWrapper>
    );
  }

  // Business user dashboard (with tabs)
  return (
    <SafeAreaWrapper>
      <View style={{ flex: 1, marginTop: theme.spacing.md }}>
        {renderTabBar}
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderTabContent}
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
