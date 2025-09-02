import React, { useState, useEffect } from 'react';
import { View, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text, LoadingSkeleton, EmptyState, Button, Badge } from '@/components';
import { 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Heart, 
  Users,
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Lock,
  Upgrade
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface AnalyticsDashboardProps {
  tier: 'starter' | 'pro' | 'premium';
}

interface AnalyticsData {
  listingViews: {
    total: number;
    trend: number;
    data: Array<{ date: string; views: number }>;
  };
  profileViews: {
    total: number;
    trend: number;
  };
  messages: {
    total: number;
    trend: number;
  };
  favorites: {
    total: number;
    trend: number;
  };
  topListings: Array<{
    id: string;
    title: string;
    views: number;
    messages: number;
  }>;
}

const { width: screenWidth } = Dimensions.get('window');

export function AnalyticsDashboard({ tier }: AnalyticsDashboardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod, tier]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Simulate analytics data based on tier
      // In a real implementation, this would fetch from your analytics service
      const mockData: AnalyticsData = {
        listingViews: {
          total: Math.floor(Math.random() * 1000) + 100,
          trend: Math.floor(Math.random() * 40) - 20,
          data: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            views: Math.floor(Math.random() * 50) + 10,
          })),
        },
        profileViews: {
          total: Math.floor(Math.random() * 500) + 50,
          trend: Math.floor(Math.random() * 30) - 15,
        },
        messages: {
          total: Math.floor(Math.random() * 100) + 10,
          trend: Math.floor(Math.random() * 20) - 10,
        },
        favorites: {
          total: Math.floor(Math.random() * 200) + 20,
          trend: Math.floor(Math.random() * 25) - 12,
        },
        topListings: Array.from({ length: 5 }, (_, i) => ({
          id: `listing-${i}`,
          title: `Sample Listing ${i + 1}`,
          views: Math.floor(Math.random() * 100) + 20,
          messages: Math.floor(Math.random() * 20) + 2,
        })),
      };

      setData(mockData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp size={16} color={theme.colors.success} />;
    if (trend < 0) return <ArrowDown size={16} color={theme.colors.error} />;
    return <Minus size={16} color={theme.colors.text.muted} />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return theme.colors.success;
    if (trend < 0) return theme.colors.error;
    return theme.colors.text.muted;
  };

  const renderPeriodSelector = () => (
    <View style={{
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    }}>
      {(['7d', '30d', '90d'] as const).map((period) => (
        <Button
          key={period}
          variant={selectedPeriod === period ? 'primary' : 'ghost'}
          size="small"
          onPress={() => setSelectedPeriod(period)}
          style={{ flex: 1 }}
        >
          <Text
            variant="bodySmall"
            style={{
              color: selectedPeriod === period ? theme.colors.surface : theme.colors.text.primary,
              fontWeight: selectedPeriod === period ? '600' : '400',
            }}
          >
            {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </Text>
        </Button>
      ))}
    </View>
  );

  const renderMetricCard = (
    title: string,
    value: number,
    trend: number,
    icon: React.ReactNode,
    locked: boolean = false
  ) => (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      opacity: locked ? 0.6 : 1,
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      }}>
        <View style={{
          backgroundColor: theme.colors.primary + '15',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.sm,
        }}>
          {locked ? <Lock size={20} color={theme.colors.text.muted} /> : icon}
        </View>
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
        }}>
          {!locked && getTrendIcon(trend)}
          <Text
            variant="bodySmall"
            style={{
              color: locked ? theme.colors.text.muted : getTrendColor(trend),
              fontWeight: '600',
            }}
          >
            {locked ? 'Locked' : `${trend > 0 ? '+' : ''}${trend}%`}
          </Text>
        </View>
      </View>

      <Text variant="bodySmall" color="muted" style={{ marginBottom: theme.spacing.xs }}>
        {title}
      </Text>
      
      <Text variant="h3" style={{ fontWeight: '700' }}>
        {locked ? '---' : value.toLocaleString()}
      </Text>
    </View>
  );

  const renderSimpleChart = (data: Array<{ date: string; views: number }>) => {
    const maxValue = Math.max(...data.map(d => d.views));
    const chartWidth = screenWidth - (theme.spacing.lg * 4);
    const chartHeight = 60;

    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
          Listing Views Trend
        </Text>
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'end',
          justifyContent: 'space-between',
          height: chartHeight,
        }}>
          {data.map((point, index) => {
            const height = (point.views / maxValue) * chartHeight;
            return (
              <View key={index} style={{ alignItems: 'center', flex: 1 }}>
                <View style={{
                  width: 8,
                  height: Math.max(height, 2),
                  backgroundColor: theme.colors.primary,
                  borderRadius: 4,
                  marginBottom: theme.spacing.sm,
                }} />
                <Text variant="caption" color="muted">
                  {new Date(point.date).getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTopListings = (listings: AnalyticsData['topListings'], locked: boolean = false) => (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      opacity: locked ? 0.6 : 1,
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
      }}>
        <Text variant="h4">Top Performing Listings</Text>
        {locked && <Lock size={20} color={theme.colors.text.muted} />}
      </View>

      {locked ? (
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
          <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
            Upgrade to Pro or Premium to see your top performing listings
          </Text>
        </View>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          {listings.map((listing, index) => (
            <View
              key={listing.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.sm,
                borderBottomWidth: index < listings.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.colors.primary + '15',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: theme.spacing.md,
              }}>
                <Text variant="bodySmall" style={{ 
                  color: theme.colors.primary, 
                  fontWeight: '600' 
                }}>
                  {index + 1}
                </Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '500' }}>
                  {listing.title}
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.xs,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Eye size={14} color={theme.colors.text.muted} />
                    <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                      {listing.views}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MessageSquare size={14} color={theme.colors.text.muted} />
                    <Text variant="caption" color="muted" style={{ marginLeft: theme.spacing.xs }}>
                      {listing.messages}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderUpgradePrompt = () => (
    <View style={{
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      alignItems: 'center',
    }}>
      <Upgrade size={32} color={theme.colors.primary} style={{ marginBottom: theme.spacing.md }} />
      
      <Text variant="h4" style={{ 
        textAlign: 'center', 
        marginBottom: theme.spacing.sm,
        color: theme.colors.primary,
      }}>
        Unlock Advanced Analytics
      </Text>
      
      <Text variant="body" color="secondary" style={{ 
        textAlign: 'center', 
        marginBottom: theme.spacing.lg,
      }}>
        {tier === 'starter' 
          ? 'Upgrade to Pro for advanced analytics with detailed insights and competitor analysis.'
          : 'Upgrade to Premium for the full analytics suite with predictive insights and export capabilities.'
        }
      </Text>

      <Button
        variant="primary"
        onPress={() => router.push('/(tabs)/subscription-plans')}
      >
        <Text variant="body" style={{ color: theme.colors.surface }}>
          Upgrade Plan
        </Text>
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <LoadingSkeleton count={4} height={100} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ padding: theme.spacing.lg }}>
        <EmptyState
          icon={<BarChart3 size={48} color={theme.colors.text.muted} />}
          title="Analytics Unavailable"
          description={error || "Unable to load analytics data"}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.lg }}>
      {/* Tier Badge */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
      }}>
        <Text variant="h4">Analytics Dashboard</Text>
        <Badge 
          text={`${tier.charAt(0).toUpperCase() + tier.slice(1)} Analytics`}
          variant={tier === 'starter' ? 'warning' : tier === 'pro' ? 'primary' : 'success'}
        />
      </View>

      {renderPeriodSelector()}

      {/* Key Metrics */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
      }}>
        {renderMetricCard(
          'Listing Views',
          data.listingViews.total,
          data.listingViews.trend,
          <Eye size={20} color={theme.colors.primary} />
        )}
        
        {renderMetricCard(
          'Profile Views',
          data.profileViews.total,
          data.profileViews.trend,
          <Users size={20} color={theme.colors.primary} />,
          tier === 'starter' // Lock for starter tier
        )}
      </View>

      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
      }}>
        {renderMetricCard(
          'Messages Received',
          data.messages.total,
          data.messages.trend,
          <MessageSquare size={20} color={theme.colors.primary} />
        )}
        
        {renderMetricCard(
          'Favorites',
          data.favorites.total,
          data.favorites.trend,
          <Heart size={20} color={theme.colors.primary} />,
          tier === 'starter' // Lock for starter tier
        )}
      </View>

      {/* Chart - Available for all tiers */}
      {renderSimpleChart(data.listingViews.data)}

      {/* Top Listings - Pro and Premium only */}
      {renderTopListings(data.topListings, tier === 'starter')}

      {/* Upgrade prompt for non-premium users */}
      {tier !== 'premium' && renderUpgradePrompt()}
    </ScrollView>
  );
}
