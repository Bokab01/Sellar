import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper, Container } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Badge } from '@/components/Badge/Badge';
import { Button } from '@/components/Button/Button';
import { 
  BarChart3, 
  Zap, 
  HeadphonesIcon,
  Crown,
  TrendingUp,
  Settings,
  Users,
  MessageSquare,
  Star,
  ArrowUpRight,
  Lock,
  ArrowUpRight as Upgrade
} from 'lucide-react-native';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import { useAnalytics, type QuickStats, type AnalyticsData } from '@/lib/analyticsService';

// Import dashboard components with direct imports to avoid circular dependencies
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard/AnalyticsDashboard';
import { AutoBoostDashboard } from '@/components/AutoBoostDashboard/AutoBoostDashboard';
import { PrioritySupportDashboard } from '@/components/PrioritySupportDashboard/PrioritySupportDashboard';
import { PremiumFeaturesDashboard } from '@/components/PremiumFeaturesDashboard/PremiumFeaturesDashboard';

type DashboardTab = 'overview' | 'analytics' | 'autoboost' | 'support' | 'premium';

interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: React.ReactNode;
  requiredTier: 'business' | 'free';
  badge?: string;
}

export default function BusinessDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  // Use selective subscriptions to prevent unnecessary re-renders
  const currentSubscription = useMonetizationStore(state => state.currentSubscription);
  const refreshSubscription = useMonetizationStore(state => state.refreshSubscription);
  
  // Use simplified business features hook
  const businessFeatures = useBusinessFeatures();
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

  // Simplified tier calculation for unified plan
  const currentTier = useMemo((): 'free' | 'business' => {
    return businessFeatures.isBusinessUser ? 'business' : 'free';
  }, [businessFeatures.isBusinessUser]);

  // Memoize available tabs to prevent unnecessary re-renders
  const availableTabs = useMemo((): TabConfig[] => {
    const tabs: TabConfig[] = [
      {
        id: 'overview',
        label: 'Overview',
        icon: <BarChart3 size={18} color={theme.colors.text.primary} />,
        requiredTier: 'free',
      },
    ];

    // Simplified: Add all business features for unified plan
    if (currentTier === 'business') {
      tabs.push({
        id: 'analytics',
        label: 'Analytics',
        icon: <TrendingUp size={18} color={theme.colors.text.primary} />,
        requiredTier: 'business',
        badge: 'Comprehensive',
      });

      tabs.push({
        id: 'autoboost',
        label: 'Auto-boost',
        icon: <Zap size={18} color={theme.colors.warning} />,
        requiredTier: 'business',
      });

      tabs.push({
        id: 'support',
        label: 'Priority Support',
        icon: <HeadphonesIcon size={18} color={theme.colors.success} />,
        requiredTier: 'business',
      });

      tabs.push({
        id: 'premium',
        label: 'Business Features',
        icon: <Crown size={18} color={theme.colors.primary} />,
        requiredTier: 'business',
      });
    }

    return tabs;
  }, [currentTier, theme]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load subscription data
      await refreshSubscription();
      
      // Load analytics data for business users
      if (businessFeatures.isBusinessUser) {
        const [stats, analytics] = await Promise.all([
          getQuickStats(),
          getBusinessAnalytics()
        ]);
        
        setQuickStats(stats);
        setAnalyticsData(analytics);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, businessFeatures.isBusinessUser, refreshSubscription, getQuickStats, getBusinessAnalytics]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Memoize tab bar styles
  const tabBarStyles = useMemo(() => ({
    scrollView: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    contentContainer: { 
      paddingHorizontal: theme.spacing.lg 
    },
  }), [theme]);

  // Render tab bar
  const renderTabBar = useMemo(() => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tabBarStyles.scrollView}
      contentContainerStyle={tabBarStyles.contentContainer}
    >
      {availableTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              marginRight: theme.spacing.sm,
              backgroundColor: isActive ? theme.colors.primary + '15' : 'transparent',
              borderRadius: theme.borderRadius.md,
              borderColor: isActive ? theme.colors.primary + '30' : 'transparent',
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            {tab.icon}
            <Text
              variant="bodySmall"
              style={{
                color: isActive ? theme.colors.primary : theme.colors.text.primary,
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {tab.label}
            </Text>
            {tab.badge && (
              <Badge
                text={tab.badge}
                variant="info"
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  ), [availableTabs, activeTab, theme, tabBarStyles]);

  // Memoize overview tab
  const renderOverviewTab = useMemo(() => {
    if (currentTier === 'free') {
      return (
        <Container style={{ paddingTop: theme.spacing.xl }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            alignItems: 'center',
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <Crown size={48} color={theme.colors.primary} style={{ marginBottom: theme.spacing.lg }} />
            
            <Text variant="h3" style={{ 
              textAlign: 'center', 
              marginBottom: theme.spacing.md,
              fontWeight: '600',
            }}>
              Unlock Business Features
            </Text>
            
            <Text variant="body" color="secondary" style={{ 
              textAlign: 'center', 
              marginBottom: theme.spacing.xl,
              lineHeight: 24,
            }}>
              Get access to powerful business tools, analytics, and priority support with a business plan.
            </Text>

            <View style={{ gap: theme.spacing.md, width: '100%' }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
                <BarChart3 size={20} color={theme.colors.success} />
                <Text variant="body" style={{ marginLeft: theme.spacing.md }}>
                  Business analytics & insights
                </Text>
              </View>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
                <Zap size={20} color={theme.colors.warning} />
                <Text variant="body" style={{ marginLeft: theme.spacing.md }}>
                  Auto-boost for listings
                </Text>
              </View>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
                <HeadphonesIcon size={20} color={theme.colors.primary} />
                <Text variant="body" style={{ marginLeft: theme.spacing.md }}>
                  Priority customer support
                </Text>
              </View>
            </View>

            <Button
              variant="primary"
              onPress={() => router.push('/subscription-plans')}
              style={{ 
                marginTop: theme.spacing.xl,
                width: '100%',
              }}
            >
              <Upgrade size={18} color={theme.colors.surface} />
              <Text variant="body" style={{ 
                color: theme.colors.surface, 
                marginLeft: theme.spacing.sm,
                fontWeight: '600',
              }}>
                View Business Plans
              </Text>
            </Button>
          </View>
        </Container>
      );
    }

    // Business plan overview
    const planName = currentSubscription?.subscription_plans?.name || 'Business Plan';
    
    return (
      <Container style={{ paddingTop: theme.spacing.lg }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Plan Status Card */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <Text variant="h4">{planName}</Text>
              <Badge 
                text="Active" 
                variant="success" 
              />
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.lg,
            }}>
              <View>
                <Text variant="bodySmall" color="muted">Monthly Credits</Text>
                <Text variant="h4" style={{ fontWeight: '600' }}>
                  120
                </Text>
              </View>
              
              <View>
                <Text variant="bodySmall" color="muted">Max Listings</Text>
                <Text variant="h4" style={{ fontWeight: '600' }}>
                  ∞
                </Text>
              </View>
              
              <View>
                <Text variant="bodySmall" color="muted">Analytics</Text>
                <Text variant="h4" style={{ fontWeight: '600' }}>
                  Comprehensive
                </Text>
              </View>
            </View>

            <Button
              variant="secondary"
              onPress={() => router.push('/subscription-plans')}
              style={{ width: '100%' }}
            >
              <Settings size={18} color={theme.colors.primary} />
              <Text variant="body" style={{ 
                color: theme.colors.primary, 
                marginLeft: theme.spacing.sm,
              }}>
                Manage Subscription
              </Text>
            </Button>
          </View>

          {/* Quick Stats */}
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Users size={24} color={theme.colors.primary} />
              <Text variant="h4" style={{ fontWeight: '600', marginTop: theme.spacing.sm }}>
                {loading ? '...' : quickStats.profileViews}
              </Text>
              <Text variant="bodySmall" color="muted">
                Profile Views
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <MessageSquare size={24} color={theme.colors.success} />
              <Text variant="h4" style={{ fontWeight: '600', marginTop: theme.spacing.sm }}>
                {loading ? '...' : quickStats.totalMessages}
              </Text>
              <Text variant="bodySmall" color="muted">
                Messages
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Star size={24} color={theme.colors.warning} />
              <Text variant="h4" style={{ fontWeight: '600', marginTop: theme.spacing.sm }}>
                {loading ? '...' : quickStats.totalReviews}
              </Text>
              <Text variant="bodySmall" color="muted">
                Reviews ({quickStats.averageRating.toFixed(1)}★)
              </Text>
            </View>
          </View>

          {/* Analytics Overview */}
          {analyticsData && (
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
                Analytics Overview
              </Text>
              
              {/* Key Metrics Row */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: theme.spacing.lg,
              }}>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" style={{ fontWeight: '600', color: theme.colors.primary }}>
                    {analyticsData.totalViews}
                  </Text>
                  <Text variant="bodySmall" color="muted">Total Views</Text>
                  <Text variant="caption" color={analyticsData.viewsThisWeek > analyticsData.viewsLastWeek ? 'success' : 'muted'}>
                    {analyticsData.viewsThisWeek > analyticsData.viewsLastWeek ? '+' : ''}
                    {((analyticsData.viewsThisWeek - analyticsData.viewsLastWeek) / Math.max(analyticsData.viewsLastWeek, 1) * 100).toFixed(0)}% this week
                  </Text>
                </View>
                
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" style={{ fontWeight: '600', color: theme.colors.success }}>
                    {analyticsData.conversionRate.toFixed(1)}%
                  </Text>
                  <Text variant="bodySmall" color="muted">Conversion</Text>
                  <Text variant="caption" color="muted">Views to Messages</Text>
                </View>
                
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" style={{ fontWeight: '600', color: theme.colors.warning }}>
                    {analyticsData.totalOffers}
                  </Text>
                  <Text variant="bodySmall" color="muted">Total Offers</Text>
                  <Text variant="caption" color="muted">{analyticsData.activeListings} active listings</Text>
                </View>
              </View>

              {/* Top Performing Listing */}
              {analyticsData.topPerformingListings.length > 0 && (
                <View>
                  <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.md }}>
                    Top Performing Listing
                  </Text>
                  <View style={{
                    backgroundColor: theme.colors.surfaceVariant,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                  }}>
                    <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                      {analyticsData.topPerformingListings[0].title}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="bodySmall" color="muted">
                        {analyticsData.topPerformingListings[0].views} views
                      </Text>
                      <Text variant="bodySmall" color="muted">
                        {analyticsData.topPerformingListings[0].messages} messages
                      </Text>
                      <Text variant="bodySmall" color="muted">
                        {analyticsData.topPerformingListings[0].offers} offers
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Feature Access Cards */}
          <View style={{ gap: theme.spacing.md }}>
            {availableTabs.slice(1).map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {tab.icon}
                  <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {tab.label}
                    </Text>
                    <Text variant="bodySmall" color="muted">
                      {tab.id === 'analytics' && 'View detailed business insights'}
                      {tab.id === 'autoboost' && 'Automatically promote your listings'}
                      {tab.id === 'support' && 'Get priority customer support'}
                      {tab.id === 'premium' && 'Access exclusive premium features'}
                    </Text>
                    {tab.badge && (
                      <Badge
                        text={tab.badge}
                        variant="info"
                        style={{ marginTop: theme.spacing.xs }}
                      />
                    )}
                  </View>
                </View>
                <ArrowUpRight size={20} color={theme.colors.text.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Container>
    );
  }, [currentTier, theme, currentSubscription, businessFeatures, availableTabs]);

  // Memoize tab content
  const renderTabContent = useMemo(() => {
    if (loading) {
      return (
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          <LoadingSkeleton height={120} />
          <LoadingSkeleton height={120} />
          <LoadingSkeleton height={120} />
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverviewTab;
      case 'analytics':
        return <AnalyticsDashboard tier={currentTier === 'free' ? 'starter' : currentTier} />;
      case 'autoboost':
        return <AutoBoostDashboard />;
      case 'support':
        return <PrioritySupportDashboard />;
      case 'premium':
        return <PremiumFeaturesDashboard />;
      default:
        return renderOverviewTab;
    }
  }, [loading, activeTab, currentTier, theme, renderOverviewTab]);

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
