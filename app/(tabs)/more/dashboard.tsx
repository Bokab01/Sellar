import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { 
  BarChart3, 
  Zap, 
  HeadphonesIcon,
  TrendingUp,
  RefreshCw
} from 'lucide-react-native';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics, type QuickStats, type AnalyticsData } from '@/lib/analyticsService';
import { router } from 'expo-router';
import { navigation } from '@/lib/navigation';
import { DashboardSkeleton } from '@/components/LoadingSkeleton/DashboardSkeleton';

// Import components directly for faster loading
import { BusinessOverview } from '@/components/Dashboard/BusinessOverview';
import { BusinessAnalytics } from '@/components/Dashboard/BusinessAnalytics';
import { BusinessSupport } from '@/components/Dashboard/BusinessSupport';

// Import components directly - no lazy loading to prevent flash
import { FreeUserDashboard } from '@/components/Dashboard/FreeUserDashboard';
import AutoBoostDashboard from '@/components/AutoBoostDashboard/AutoBoostDashboard';

type DashboardTab = 'overview' | 'boost' | 'analytics' | 'support';

interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: (color: string) => React.ReactNode;
}

export default function BusinessDashboardScreen() {
  const { theme } = useTheme();
  const { contentBottomPadding } = useBottomTabBarSpacing();
  const { user } = useAuth();
  const currentSubscription = useMonetizationStore(state => state.currentSubscription);
  const hasBusinessPlan = useMonetizationStore(state => state.hasBusinessPlan);
  const { getQuickStats, getBusinessAnalytics } = useAnalytics();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    profileViews: 0,
    totalMessages: 0,
    totalReviews: 0,
    averageRating: 0,
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Determine if user has business plan - stable reference
  const isBusinessUser = hasBusinessPlan();
  
  const currentTier: 'free' | 'business' = isBusinessUser ? 'business' : 'free';

  // ✅ FIX: Reset state when user changes or tier changes
  useEffect(() => {
    // Reset to default state when switching users or tiers
    setActiveTab('overview');
    setQuickStats({
      profileViews: 0,
      totalMessages: 0,
      totalReviews: 0,
      averageRating: 0,
    });
    setAnalyticsData(null);
    setLoading(true);
  }, [user?.id, currentTier]);

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
        label: 'Auto-Refresh',
        icon: (color: string) => <RefreshCw size={18} color={color} />,
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

  // Load dashboard data - reload when user or tier changes
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user?.id, currentTier]);

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

  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
  }, []);

  // Render tab bar for business users - memoized to prevent re-renders
  const renderTabBar = useMemo(() => {
    if (availableTabs.length === 0) return null;
    
    return (
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
    );
  }, [availableTabs, activeTab, theme]);

  // Render tab content for business users - no Suspense to prevent flash
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
        return <AutoBoostDashboard />;
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

  // Wrap everything in View with background to prevent flash
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {currentTier === 'free' ? (
        // Free user dashboard (single screen, no tabs)
        <View style={{ flex: 1, marginTop: 0, backgroundColor: theme.colors.background }}>
          {/* <AppHeader title="Sellar Pro Dashboard" /> */}
          <FreeUserDashboard
            loading={loading}
            quickStats={quickStats}
          />
        </View>
      ) : (
        // Business user dashboard (with tabs)
      <View style={{ flex: 1, marginTop: theme.spacing.md, backgroundColor: theme.colors.background }}>
        {renderTabBar}
        {activeTab === 'boost' ? (
          // Use View for boost tab to avoid nested virtualized lists
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {renderTabContent}
          </View>
        ) : (
          // Use ScrollView for other tabs
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{ paddingBottom: contentBottomPadding }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderTabContent}
        </ScrollView>
        )}
      </View>
      )}
    </View>
  );
}
