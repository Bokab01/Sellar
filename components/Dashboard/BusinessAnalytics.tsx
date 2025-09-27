import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  MessageSquare, 
  Eye,
  Star,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  Zap
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Container } from '@/components/Layout';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { DashboardSkeleton } from '@/components/LoadingSkeleton/DashboardSkeleton';
import { useAnalytics, type AnalyticsData } from '@/lib/analyticsService';
import { exportService } from '@/lib/exportService';

interface BusinessAnalyticsProps {
  onTabChange: (tab: 'overview' | 'boost' | 'analytics' | 'support') => void;
}

export const BusinessAnalytics: React.FC<BusinessAnalyticsProps> = ({ onTabChange }) => {
  const { theme } = useTheme();
  const { getBusinessAnalytics } = useAnalytics();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getBusinessAnalytics(timeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await getBusinessAnalytics(timeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!analyticsData) {
      Alert.alert('No Data', 'Please wait for analytics data to load before exporting.');
      return;
    }

    setExporting(true);
    try {
      await exportService.exportAnalytics(analyticsData, {
        format,
        timeRange,
        includeCharts: true,
      });
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading && !analyticsData) {
    return <DashboardSkeleton type="analytics" />;
  }

  return (
    <Container style={{ paddingTop: theme.spacing.lg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Time Range Selector */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl,
        }}>
          <View>
            <Text variant="h2" style={{ color: theme.colors.primary }}>
              Business Analytics
            </Text>
            <Text variant="body" color="secondary">
              Comprehensive performance insights
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={refreshing}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.full,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <RefreshCw 
              size={20} 
              color={refreshing ? theme.colors.text.secondary : theme.colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.xs,
          marginBottom: theme.spacing.xl,
          flexDirection: 'row',
        }}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                backgroundColor: timeRange === range ? theme.colors.primary : 'transparent',
                borderRadius: theme.borderRadius.md,
                alignItems: 'center',
              }}
            >
              <Text
                variant="body"
                style={{
                  color: timeRange === range ? theme.colors.text.inverse : theme.colors.text.primary,
                  fontWeight: timeRange === range ? '600' : '500',
                }}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Performance Indicators */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h3" style={{ marginBottom: theme.spacing.lg, color: theme.colors.primary }}>
            Key Performance Indicators
          </Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.md,
          }}>
            {/* Total Views */}
            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <Eye size={20} color={theme.colors.primary} />
                <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                  TOTAL VIEWS
                </Text>
              </View>
              <Text variant="h2" style={{ color: theme.colors.primary, fontWeight: '700', marginBottom: theme.spacing.xs }}>
                {formatNumber(analyticsData?.totalViews || 0)}
              </Text>
              {analyticsData && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {analyticsData.viewsThisWeek >= (analyticsData.viewsLastWeek || 0) ? (
                    <ArrowUpRight size={14} color={theme.colors.success} />
                  ) : (
                    <ArrowDownRight size={14} color={theme.colors.destructive} />
                  )}
                  <Text
                    variant="caption"
                    style={{
                      color: analyticsData.viewsThisWeek >= (analyticsData.viewsLastWeek || 0) 
                        ? theme.colors.success 
                        : theme.colors.destructive,
                      marginLeft: theme.spacing.xs,
                      fontWeight: '600',
                    }}
                  >
                    {getGrowthPercentage(analyticsData.viewsThisWeek, analyticsData.viewsLastWeek || 0)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Total Messages */}
            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <MessageSquare size={20} color={theme.colors.success} />
                <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                  MESSAGES
                </Text>
              </View>
              <Text variant="h2" style={{ color: theme.colors.success, fontWeight: '700', marginBottom: theme.spacing.xs }}>
                {formatNumber(analyticsData?.totalMessages || 0)}
              </Text>
              {analyticsData && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {analyticsData.messagesThisWeek >= (analyticsData.messagesLastWeek || 0) ? (
                    <ArrowUpRight size={14} color={theme.colors.success} />
                  ) : (
                    <ArrowDownRight size={14} color={theme.colors.destructive} />
                  )}
                  <Text
                    variant="caption"
                    style={{
                      color: analyticsData.messagesThisWeek >= (analyticsData.messagesLastWeek || 0) 
                        ? theme.colors.success 
                        : theme.colors.destructive,
                      marginLeft: theme.spacing.xs,
                      fontWeight: '600',
                    }}
                  >
                    {getGrowthPercentage(analyticsData.messagesThisWeek, analyticsData.messagesLastWeek || 0)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Conversion Rate */}
            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <Target size={20} color={theme.colors.warning} />
                <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                  CONVERSION
                </Text>
              </View>
              <Text variant="h2" style={{ color: theme.colors.warning, fontWeight: '700', marginBottom: theme.spacing.xs }}>
                {(analyticsData?.conversionRate || 0).toFixed(1)}%
              </Text>
              <Text variant="caption" color="secondary">
                Messages per view
              </Text>
            </View>

            {/* Average Rating */}
            <View style={{
              flex: 1,
              minWidth: '48%',
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                <Star size={20} color={theme.colors.info} />
                <Text variant="caption" color="secondary" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
                  RATING
                </Text>
              </View>
              <Text variant="h2" style={{ color: theme.colors.info, fontWeight: '700', marginBottom: theme.spacing.xs }}>
                {(analyticsData?.averageRating || 0).toFixed(1)}
              </Text>
              <Text variant="caption" color="secondary">
                Out of 5.0 stars
              </Text>
            </View>
          </View>
        </View>

        {/* Top Performing Listings */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Top Performing Listings
          </Text>
          
          {analyticsData?.topPerformingListings?.length ? (
            <View style={{ gap: theme.spacing.md }}>
              {analyticsData.topPerformingListings.slice(0, 5).map((listing, index) => (
                <View
                  key={listing.id}
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                    <View style={{
                      backgroundColor: index < 3 ? theme.colors.warning + '15' : theme.colors.surface,
                      borderRadius: theme.borderRadius.full,
                      width: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: theme.spacing.sm,
                    }}>
                      <Text variant="caption" style={{ 
                        color: index < 3 ? theme.colors.warning : theme.colors.text.secondary,
                        fontWeight: '700',
                      }}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text variant="body" style={{ flex: 1, fontWeight: '600' }}>
                      {listing.title}
                    </Text>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="body" style={{ fontWeight: '600', color: theme.colors.primary }}>
                          {listing.views}
                        </Text>
                        <Text variant="caption" color="secondary">Views</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="body" style={{ fontWeight: '600', color: theme.colors.success }}>
                          {listing.messages}
                        </Text>
                        <Text variant="caption" color="secondary">Messages</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="body" style={{ fontWeight: '600', color: theme.colors.warning }}>
                          {listing.offers}
                        </Text>
                        <Text variant="caption" color="secondary">Offers</Text>
                      </View>
                    </View>
                    
                    <Badge 
                      text={`${((listing.messages / Math.max(listing.views, 1)) * 100).toFixed(1)}%`}
                      variant="success"
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<BarChart3 size={48} color={theme.colors.text.secondary} />}
              title="No Performance Data"
              description="Create more listings to see performance analytics."
              action={{
                text: 'Create Listing',
                onPress: () => onTabChange('overview'),
              }}
            />
          )}
        </View>

        {/* Category Performance */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Category Performance
          </Text>
          
          {analyticsData?.categoryPerformance?.length ? (
            <View style={{ gap: theme.spacing.md }}>
              {analyticsData.categoryPerformance.slice(0, 5).map((category, index) => (
                <View
                  key={category.category}
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                    <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
                      {category.category}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {category.listings} listings
                    </Text>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="body" style={{ fontWeight: '600', color: theme.colors.primary }}>
                          {category.views}
                        </Text>
                        <Text variant="caption" color="secondary">Views</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="body" style={{ fontWeight: '600', color: theme.colors.success }}>
                          {category.messages}
                        </Text>
                        <Text variant="caption" color="secondary">Messages</Text>
                      </View>
                    </View>
                    
                    <Badge 
                      text={`${((category.messages / Math.max(category.views, 1)) * 100).toFixed(1)}%`}
                      variant="info"
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<BarChart3 size={48} color={theme.colors.text.secondary} />}
              title="No Category Data"
              description="Create listings in different categories to see performance breakdown."
            />
          )}
        </View>

        {/* Engagement Trends */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            {timeRange === '7d' ? 'Daily' : timeRange === '30d' ? 'Daily' : 'Daily'} Engagement Trends
          </Text>
          
          {analyticsData?.dailyViews?.length ? (
            <View style={{ gap: theme.spacing.sm }}>
              {analyticsData.dailyViews.slice(-(timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90)).map((day, index) => {
                const maxViews = Math.max(...analyticsData.dailyViews.map(d => d.views));
                const viewsPercentage = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                const messagesPercentage = maxViews > 0 ? (day.messages / maxViews) * 100 : 0;
                
                return (
                  <View key={day.date} style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                      <Text variant="body" style={{ fontWeight: '600' }}>
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                        <Text variant="caption" style={{ color: theme.colors.primary }}>
                          {day.views} views
                        </Text>
                        <Text variant="caption" style={{ color: theme.colors.success }}>
                          {day.messages} messages
                        </Text>
                      </View>
                    </View>
                    
                    {/* Simple bar chart visualization */}
                    <View style={{ flexDirection: 'row', gap: theme.spacing.xs, height: 8 }}>
                      <View style={{
                        flex: 1,
                        backgroundColor: theme.colors.primary + '20',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          width: `${viewsPercentage}%`,
                          height: '100%',
                          backgroundColor: theme.colors.primary,
                        }} />
                      </View>
                      <View style={{
                        flex: 1,
                        backgroundColor: theme.colors.success + '20',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          width: `${messagesPercentage}%`,
                          height: '100%',
                          backgroundColor: theme.colors.success,
                        }} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon={<TrendingUp size={48} color={theme.colors.text.secondary} />}
              title="No Trend Data"
              description="More data will appear as your listings gain traction."
            />
          )}
        </View>

        {/* Export and Actions */}
        <View style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Analytics Actions
          </Text>
          
          <View style={{ gap: theme.spacing.md }}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Export Analytics Report',
                  'Choose the format for your analytics report:',
                  [
                    {
                      text: 'CSV',
                      onPress: () => handleExport('csv'),
                    },
                    {
                      text: 'PDF (HTML)',
                      onPress: () => handleExport('pdf'),
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                );
              }}
              disabled={exporting}
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                opacity: exporting ? 0.6 : 1,
              }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Download size={20} color={exporting ? theme.colors.text.secondary : theme.colors.primary} />
                  <Text variant="body" style={{ 
                    fontWeight: '600', 
                    marginLeft: theme.spacing.sm,
                    color: exporting ? theme.colors.text.secondary : theme.colors.text.primary,
                  }}>
                    {exporting ? 'Exporting...' : 'Export Analytics Report'}
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  PDF & CSV formats
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onTabChange('boost')}
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
                  <Zap size={20} color={theme.colors.success} />
                  <Text variant="body" style={{ fontWeight: '600', marginLeft: theme.spacing.sm }}>
                    Auto-Refresh Settings
                  </Text>
                </View>
                <Text variant="caption" color="secondary">
                  Manage auto-refresh
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Container>
  );
};
