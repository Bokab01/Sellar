import React, { useMemo } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { 
  Crown, 
  TrendingUp, 
  Zap, 
  BarChart3, 
  HeadphonesIcon, 
  Plus,
  ArrowUpRight,
  Settings,
  CreditCard,
  Calendar,
  Users,
  MessageSquare,
  Star
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Container } from '@/components/Layout';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import type { QuickStats, AnalyticsData } from '@/lib/analyticsService';

interface BusinessOverviewProps {
  loading: boolean;
  quickStats: QuickStats;
  analyticsData: AnalyticsData | null;
  onTabChange: (tab: 'overview' | 'boost' | 'analytics' | 'support') => void;
}

export const BusinessOverview: React.FC<BusinessOverviewProps> = ({
  loading,
  quickStats,
  analyticsData,
  onTabChange,
}) => {
  const { theme } = useTheme();
  const { 
    currentSubscription, 
    balance, 
    refreshCredits, 
    refreshSubscription 
  } = useMonetizationStore();

  const planName = currentSubscription?.subscription_plans?.name || 'Business Plan';
  const planPrice = currentSubscription?.subscription_plans?.price || 0;
  const billingCycle = currentSubscription?.subscription_plans?.billing_cycle || 'monthly';
  const nextBillingDate = currentSubscription?.next_billing_date;

  const handleCancelSubscription = () => {
    // Navigate to subscription management
    router.push('/subscription-plans?action=manage');
  };

  const handleUseCredits = () => {
    // Navigate to business credit usage (not the marketplace for free users)
    router.push('/feature-marketplace');
  };

  return (
    <Container style={{ paddingTop: theme.spacing.lg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Business Plan Status Hero */}
        <View style={{
          backgroundColor: `linear-gradient(135deg, ${theme.colors.success}15, ${theme.colors.primary}08)`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          borderWidth: 2,
          borderColor: theme.colors.success + '20',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background Elements */}
          <View style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: theme.colors.success + '08',
          }} />
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <View style={{
              backgroundColor: theme.colors.success,
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginRight: theme.spacing.md,
            }}>
              <Crown size={32} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                <Text variant="h2" style={{ color: theme.colors.success, marginRight: theme.spacing.sm }}>
                  {planName}
                </Text>
                <Badge 
                  text={currentSubscription?.status === 'cancelled' ? 'Cancelled' : 'Active'} 
                  variant={currentSubscription?.status === 'cancelled' ? 'warning' : 'success'} 
                />
              </View>
              <Text variant="body" color="secondary" style={{ lineHeight: 24 }}>
                {currentSubscription?.status === 'cancelled' 
                  ? 'Your subscription is cancelled but remains active until the end of your billing period.'
                  : 'Your business plan is active and performing well!'
                }
              </Text>
            </View>
          </View>

          {/* Plan Details */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text variant="h3" style={{ color: theme.colors.success, fontWeight: '700' }}>
                ${planPrice}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                per {billingCycle}
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="h3" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                {balance || 0}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Boost Credits
              </Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <Text variant="h3" style={{ color: theme.colors.warning, fontWeight: '700' }}>
                ∞
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Listings
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button
              variant="secondary"
              onPress={handleUseCredits}
              style={{ flex: 1 }}
            >
              <Zap size={18} color={theme.colors.warning} />
              <Text variant="body" style={{ color: theme.colors.warning, marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                Use Credits
              </Text>
            </Button>
            
            <Button
              variant="tertiary"
              onPress={handleCancelSubscription}
              style={{ flex: 1 }}
            >
              <Settings size={18} color={theme.colors.text.secondary} />
              <Text variant="body" style={{ color: theme.colors.text.secondary, marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                {currentSubscription?.status === 'cancelled' ? 'View Details' : 'Manage Plan'}
              </Text>
            </Button>
          </View>
        </View>

        {/* Key Performance Metrics */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h3" style={{ marginBottom: theme.spacing.lg, color: theme.colors.primary }}>
            Performance Overview
          </Text>

          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Users size={20} color={theme.colors.primary} />
              <Text variant="h3" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: theme.spacing.xs }}>
                {loading ? '...' : quickStats.profileViews}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Profile Views
              </Text>
            </View>
            
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <MessageSquare size={20} color={theme.colors.success} />
              <Text variant="h3" style={{ color: theme.colors.success, fontWeight: '700', marginTop: theme.spacing.xs }}>
                {loading ? '...' : quickStats.totalMessages}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Messages
              </Text>
            </View>
            
            <View style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Star size={20} color={theme.colors.warning} />
              <Text variant="h3" style={{ color: theme.colors.warning, fontWeight: '700', marginTop: theme.spacing.xs }}>
                {loading ? '...' : (quickStats.averageRating || 0).toFixed(1)}
              </Text>
              <Text variant="caption" color="secondary" style={{ fontWeight: '600' }}>
                Rating
              </Text>
            </View>
          </View>

          {/* Growth Indicator */}
          {analyticsData && (
            <View style={{
              backgroundColor: theme.colors.success + '10',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.success + '20',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={16} color={theme.colors.success} />
                <Text variant="body" style={{ color: theme.colors.success, fontWeight: '600', marginLeft: theme.spacing.xs }}>
                  +{Math.round(((analyticsData.viewsThisWeek || 0) / Math.max(analyticsData.viewsLastWeek || 1, 1) - 1) * 100)}% growth this week
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Navigation Grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.xl,
        }}>
          <TouchableOpacity
            onPress={() => onTabChange('boost')}
            style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{
              backgroundColor: theme.colors.warning + '15',
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}>
              <Zap size={24} color={theme.colors.warning} />
            </View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              Boost Management
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Use your {balance || 0} credits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onTabChange('analytics')}
            style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{
              backgroundColor: theme.colors.primary + '15',
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}>
              <BarChart3 size={24} color={theme.colors.primary} />
            </View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              Advanced Analytics
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Detailed insights
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onTabChange('support')}
            style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{
              backgroundColor: theme.colors.success + '15',
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}>
              <HeadphonesIcon size={24} color={theme.colors.success} />
            </View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              Priority Support
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Get expert help
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/create')}
            style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.border,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{
              backgroundColor: theme.colors.info + '15',
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}>
              <Plus size={24} color={theme.colors.info} />
            </View>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              Create Listing
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Add new product
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Details */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Subscription Details
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
            }}>
              <Text variant="body" color="secondary">Plan</Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {planName}
              </Text>
            </View>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
            }}>
              <Text variant="body" color="secondary">Billing</Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                ${planPrice}/{billingCycle}
              </Text>
            </View>
            
            {nextBillingDate && (
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="body" color="secondary">Next Billing</Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {new Date(nextBillingDate).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: theme.spacing.sm,
            }}>
              <Text variant="body" color="secondary">Monthly Credits</Text>
              <Text variant="body" style={{ fontWeight: '600', color: theme.colors.warning }}>
                120 credits
              </Text>
            </View>
          </View>
        </View>

        {/* Business Insights Preview */}
        {analyticsData && (
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            padding: theme.spacing.xl,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TrendingUp size={24} color={theme.colors.primary} />
                <Text variant="h3" style={{ marginLeft: theme.spacing.sm, color: theme.colors.primary }}>
                  This Week's Performance
                </Text>
              </View>
              <TouchableOpacity onPress={() => onTabChange('analytics')}>
                <Text variant="body" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: theme.spacing.md }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}>
                <Text variant="body" color="secondary">Total Views</Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {analyticsData.viewsThisWeek || 0}
                </Text>
              </View>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}>
                <Text variant="body" color="secondary">Messages Received</Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {analyticsData.messagesThisWeek || 0}
                </Text>
              </View>
              
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
              }}>
                <Text variant="body" color="secondary">Conversion Rate</Text>
                <Text variant="body" style={{ fontWeight: '600', color: theme.colors.success }}>
                  {analyticsData.conversionRate?.toFixed(1) || 0}%
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Container>
  );
};
