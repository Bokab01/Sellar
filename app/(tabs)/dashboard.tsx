import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  LoadingSkeleton,
  EmptyState,
  Badge,
  Button,
} from '@/components';
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
  Upgrade
} from 'lucide-react-native';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useAuth } from '@/hooks/useAuth';

// Import dashboard components (we'll create these)
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard/AnalyticsDashboard';
import { AutoBoostDashboard } from '@/components/AutoBoostDashboard/AutoBoostDashboard';
import { PrioritySupportDashboard } from '@/components/PrioritySupportDashboard/PrioritySupportDashboard';
import { PremiumFeaturesDashboard } from '@/components/PremiumFeaturesDashboard/PremiumFeaturesDashboard';

type DashboardTab = 'overview' | 'analytics' | 'autoboost' | 'support' | 'premium';

interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: React.ReactNode;
  requiredTier: 'starter' | 'pro' | 'premium' | 'free';
  badge?: string;
}

export default function BusinessDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    currentSubscription, 
    hasBusinessPlan, 
    refreshSubscription,
    entitlements 
  } = useMonetizationStore();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get current plan tier
  const getCurrentTier = (): 'free' | 'starter' | 'pro' | 'premium' => {
    if (!hasBusinessPlan()) return 'free';
    
    const planName = currentSubscription?.subscription_plans?.name?.toLowerCase();
    if (planName?.includes('premium')) return 'premium';
    if (planName?.includes('pro')) return 'pro';
    if (planName?.includes('starter')) return 'starter';
    return 'free';
  };

  const currentTier = getCurrentTier();

  // Define available tabs based on subscription tier
  const getAvailableTabs = (): TabConfig[] => {
    const baseTabs: TabConfig[] = [
      {
        id: 'overview',
        label: 'Overview',
        icon: <BarChart3 size={18} color={theme.colors.text.primary} />,
        requiredTier: 'free',
      },
    ];

    // Analytics tab - available for all business plans
    if (currentTier !== 'free') {
      baseTabs.push({
        id: 'analytics',
        label: 'Analytics',
        icon: <TrendingUp size={18} color={theme.colors.text.primary} />,
        requiredTier: 'starter',
        badge: currentTier === 'starter' ? 'Basic' : currentTier === 'pro' ? 'Advanced' : 'Full',
      });
    }

    // Auto-boost tab - available for Pro and Premium
    if (currentTier === 'pro' || currentTier === 'premium') {
      baseTabs.push({
        id: 'autoboost',
        label: 'Auto-boost',
        icon: <Zap size={18} color={theme.colors.warning} />,
        requiredTier: 'pro',
      });
    }

    // Priority Support tab - available for Premium only
    if (currentTier === 'premium') {
      baseTabs.push({
        id: 'support',
        label: 'Priority Support',
        icon: <HeadphonesIcon size={18} color={theme.colors.success} />,
        requiredTier: 'premium',
      });

      baseTabs.push({
        id: 'premium',
        label: 'Premium Features',
        icon: <Crown size={18} color={theme.colors.primary} />,
        requiredTier: 'premium',
      });
    }

    return baseTabs;
  };

  const availableTabs = getAvailableTabs();

  // Initialize data
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      await refreshSubscription();
      setLoading(false);
    };

    initializeDashboard();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  };

  // Render tab bar
  const renderTabBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
      contentContainerStyle={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
      }}
    >
      {availableTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              marginRight: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              backgroundColor: isActive ? theme.colors.primary + '15' : 'transparent',
              borderWidth: isActive ? 1 : 0,
              borderColor: isActive ? theme.colors.primary + '30' : 'transparent',
            }}
          >
            {tab.icon}
            <Text
              variant="bodySmall"
              style={{
                marginLeft: theme.spacing.xs,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? theme.colors.primary : theme.colors.text.primary,
              }}
            >
              {tab.label}
            </Text>
            {tab.badge && (
              <Badge
                text={tab.badge}
                variant="secondary"
                size="small"
                style={{ marginLeft: theme.spacing.xs }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          <LoadingSkeleton count={3} height={120} />
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'analytics':
        return <AnalyticsDashboard tier={currentTier} />;
      case 'autoboost':
        return <AutoBoostDashboard />;
      case 'support':
        return <PrioritySupportDashboard />;
      case 'premium':
        return <PremiumFeaturesDashboard />;
      default:
        return renderOverviewTab();
    }
  };

  // Overview tab content
  const renderOverviewTab = () => {
    if (currentTier === 'free') {
      return (
        <Container style={{ paddingTop: theme.spacing.xl }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            alignItems: 'center',
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
              lineHeight: 22,
            }}>
              Get access to powerful analytics, auto-boost, priority support, and more with a business plan.
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
              onPress={() => router.push('/(tabs)/subscription-plans')}
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
                  {entitlements.monthlyCredits || 0}
                </Text>
              </View>
              
              <View>
                <Text variant="bodySmall" color="muted">Max Listings</Text>
                <Text variant="h4" style={{ fontWeight: '600' }}>
                  {entitlements.maxListings ? entitlements.maxListings : '∞'}
                </Text>
              </View>
              
              <View>
                <Text variant="bodySmall" color="muted">Analytics</Text>
                <Text variant="h4" style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                  {entitlements.analyticsLevel || 'None'}
                </Text>
              </View>
            </View>

            <Button
              variant="outline"
              onPress={() => router.push('/(tabs)/subscription-plans')}
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
                0
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
                0
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
                0
              </Text>
              <Text variant="bodySmall" color="muted">
                Reviews
              </Text>
            </View>
          </View>

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
                  justifyContent: 'space-between',
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
                      {tab.id === 'autoboost' && 'Automatically boost your listings'}
                      {tab.id === 'support' && 'Get priority customer support'}
                      {tab.id === 'premium' && 'Access premium business features'}
                    </Text>
                  </View>
                  {tab.badge && (
                    <Badge
                      text={tab.badge}
                      variant="secondary"
                      size="small"
                      style={{ marginRight: theme.spacing.sm }}
                    />
                  )}
                </View>
                <ArrowUpRight size={20} color={theme.colors.text.muted} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Container>
    );
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Business Dashboard"
        showBackButton
        onBackPress={() => router.back()}
        rightElement={
          <TouchableOpacity onPress={handleRefresh}>
            <Settings size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        }
      />

      <View style={{ flex: 1 }}>
        {renderTabBar()}
        
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderTabContent()}
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
