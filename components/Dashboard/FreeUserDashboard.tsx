import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { 
  Crown, 
  BarChart3, 
  Zap, 
  HeadphonesIcon, 
  TrendingUp,
  Users,
  MessageSquare,
  Star,
  Plus,
  ArrowUpRight,
  ArrowUp
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Container } from '@/components/Layout';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import type { QuickStats } from '@/lib/analyticsService';

interface FreeUserDashboardProps {
  loading: boolean;
  quickStats: QuickStats;
}

export const FreeUserDashboard: React.FC<FreeUserDashboardProps> = ({
  loading,
  quickStats,
}) => {
  const { theme } = useTheme();

  return (
    <Container style={{ paddingTop: theme.spacing.lg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Premium Upgrade Hero Card */}
        <View style={{
          backgroundColor: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.primary}05)`,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          borderWidth: 2,
          borderColor: theme.colors.primary + '20',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background Pattern */}
          <View style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.primary + '10',
          }} />
          
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.lg }}>
            <View style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              marginRight: theme.spacing.md,
            }}>
              <Crown size={28} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.xs, color: theme.colors.primary }}>
                Unlock Business Power
              </Text>
              <Text variant="body" color="secondary" style={{ lineHeight: 22 }}>
                Get comprehensive analytics, auto-refresh every 2 hours, and priority support to grow your business faster.
              </Text>
            </View>
          </View>

          {/* Feature Preview Grid */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
          }}>
            {[
              { icon: BarChart3, label: 'Advanced Analytics', color: theme.colors.success },
              { icon: Zap, label: '120 Boost Credits', color: theme.colors.warning },
              { icon: HeadphonesIcon, label: 'Priority Support', color: theme.colors.primary },
              { icon: TrendingUp, label: 'Growth Tools', color: theme.colors.info },
            ].map((feature, index) => (
              <View key={index} style={{
                flex: 1,
                minWidth: '48%',
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}>
                <feature.icon size={20} color={feature.color} />
                <Text variant="caption" style={{ 
                  marginTop: theme.spacing.xs, 
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  {feature.label}
                </Text>
              </View>
            ))}
          </View>

          <Button
            variant="primary"
            onPress={() => router.push('/subscription-plans')}
            style={{ 
              width: '100%',
              paddingVertical: theme.spacing.md,
              borderRadius: theme.borderRadius.lg,
            }}
          >
            <ArrowUp size={18} color="#FFFFFF" />
            <Text variant="body" style={{ 
              color: '#FFFFFF', 
              marginLeft: theme.spacing.sm,
              fontWeight: '700',
            }}>
              Upgrade to Business
            </Text>
          </Button>
        </View>

        {/* Basic Analytics Section */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <BarChart3 size={24} color={theme.colors.primary} />
            <Text variant="h3" style={{ marginLeft: theme.spacing.sm, color: theme.colors.primary }}>
              Basic Analytics
            </Text>
          </View>

          {/* Quick Stats Grid */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.lg,
          }}>
            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Users size={20} color={theme.colors.primary} />
              <Text variant="body" style={{ fontWeight: '600', marginTop: theme.spacing.xs }}>
                {loading ? '...' : quickStats.profileViews}
              </Text>
              <Text variant="caption" color="secondary">Profile Views</Text>
            </View>

            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <MessageSquare size={20} color={theme.colors.success} />
              <Text variant="body" style={{ fontWeight: '600', marginTop: theme.spacing.xs }}>
                {loading ? '...' : quickStats.totalMessages}
              </Text>
              <Text variant="caption" color="secondary">Messages</Text>
            </View>

            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <Star size={20} color={theme.colors.warning} />
              <Text variant="body" style={{ fontWeight: '600', marginTop: theme.spacing.xs }}>
                {loading ? '...' : (quickStats.averageRating || 0).toFixed(1)}
              </Text>
              <Text variant="caption" color="secondary">Rating</Text>
            </View>

            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              alignItems: 'center',
            }}>
              <TrendingUp size={20} color={theme.colors.info} />
              <Text variant="body" style={{ fontWeight: '600', marginTop: theme.spacing.xs }}>
                {loading ? '...' : quickStats.totalReviews}
              </Text>
              <Text variant="caption" color="secondary">Reviews</Text>
            </View>
          </View>

          {/* Upgrade Notice */}
          <View style={{
            backgroundColor: theme.colors.primary + '10',
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.primary + '20',
          }}>
            <Text variant="body" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
              <Text style={{ fontWeight: '600' }}>Want more insights?</Text>
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Upgrade to Business for advanced analytics, growth tracking, and detailed performance metrics.
            </Text>
          </View>
        </View>

        {/* Quick Actions for Free Users */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Quick Actions
          </Text>
          
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/create')}
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Plus size={20} color={theme.colors.primary} />
                <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                  Create New Listing
                </Text>
              </View>
              <ArrowUpRight size={16} color={theme.colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/feature-marketplace')}
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Zap size={20} color={theme.colors.warning} />
                <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                  Browse Features
                </Text>
                <Badge text="Credits Required" variant="info" style={{ marginLeft: theme.spacing.sm }} />
              </View>
              <ArrowUpRight size={16} color={theme.colors.text.secondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/more/settings')}
            style={{
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <HeadphonesIcon size={20} color={theme.colors.success} />
                <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                  Get Help & Support
                </Text>
              </View>
              <ArrowUpRight size={16} color={theme.colors.text.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Business Plan Benefits */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Why Upgrade to Business?
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            {[
              { 
                icon: Zap, 
                title: '120 Monthly Boost Credits', 
                description: 'Promote your listings with priority placement and featured badges',
                color: theme.colors.warning 
              },
              { 
                icon: BarChart3, 
                title: 'Advanced Analytics', 
                description: 'Detailed insights, conversion tracking, and performance metrics',
                color: theme.colors.primary 
              },
              { 
                icon: HeadphonesIcon, 
                title: 'Priority Support', 
                description: 'Fast response times and dedicated business support team',
                color: theme.colors.success 
              },
              { 
                icon: TrendingUp, 
                title: 'Growth Tools', 
                description: 'Auto-refresh every 2 hours and advanced listing management',
                color: theme.colors.info 
              },
            ].map((benefit, index) => (
              <View key={index} style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingVertical: theme.spacing.sm,
              }}>
                <View style={{
                  backgroundColor: benefit.color + '15',
                  borderRadius: theme.borderRadius.full,
                  padding: theme.spacing.sm,
                  marginRight: theme.spacing.md,
                  marginTop: theme.spacing.xs,
                }}>
                  <benefit.icon size={16} color={benefit.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                    {benefit.title}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {benefit.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <Button
            variant="primary"
            onPress={() => router.push('/subscription-plans')}
            style={{ 
              width: '100%',
              marginTop: theme.spacing.lg,
            }}
          >
            <Crown size={18} color="#FFFFFF" />
            <Text variant="body" style={{ 
              color: '#FFFFFF', 
              marginLeft: theme.spacing.sm,
              fontWeight: '700',
            }}>
              Start Free Trial
            </Text>
          </Button>
        </View>
      </ScrollView>
    </Container>
  );
};
