import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  LoadingSkeleton,
} from '@/components';
import { 
  useTransactionAnalytics,
  useTransactionSummary,
  useTransactions
} from '@/hooks/useTransactions';
import { 
  formatAmount, 
  formatCredits,
  calculateTransactionStats,
  getDateRangePresets
} from '@/lib/transactionService';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Award
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function TransactionAnalyticsScreen() {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<'lastWeek' | 'lastMonth' | 'lastThreeMonths'>('lastMonth');
  const [refreshing, setRefreshing] = useState(false);

  const datePresets = getDateRangePresets();
  const currentPeriod = datePresets[selectedPeriod];

  const { analytics, loading: analyticsLoading, refetch: refetchAnalytics } = useTransactionAnalytics(
    currentPeriod.start.toISOString(),
    currentPeriod.end.toISOString()
  );
  const { summary, loading: summaryLoading, refetch: refetchSummary } = useTransactionSummary();
  const { transactions } = useTransactions();

  // Calculate additional stats
  const stats = useMemo(() => {
    return calculateTransactionStats(transactions);
  }, [transactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAnalytics(), refetchSummary()]);
    setRefreshing(false);
  };

  const renderPeriodSelector = () => (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    }}>
      <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
        Time Period
      </Text>
      
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {(['lastWeek', 'lastMonth', 'lastThreeMonths'] as const).map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? 'primary' : 'tertiary'}
            size="sm"
            onPress={() => setSelectedPeriod(period)}
            style={{ flex: 1 }}
          >
            {datePresets[period].label}
          </Button>
        ))}
      </View>
    </View>
  );

  const renderOverviewCards = () => {
    if (!analytics || !summary) return null;

    const totalSpent = analytics.totals.credits_spent;
    const totalEarned = analytics.totals.credits_earned;
    const netChange = totalEarned - totalSpent;

    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}>
        <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
          Overview
        </Text>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.lg,
        }}>
          {/* Total Transactions */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.primary + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.sm,
            }}>
              <BarChart3 size={24} color={theme.colors.primary} />
            </View>
            <Text variant="h2" style={{ marginBottom: theme.spacing.xs }}>
              {analytics.totals.transaction_count}
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Transactions
            </Text>
          </View>

          {/* Credits Spent */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.error + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.sm,
            }}>
              <ArrowUpRight size={24} color={theme.colors.error} />
            </View>
            <Text variant="h2" style={{ marginBottom: theme.spacing.xs }}>
              {totalSpent.toLocaleString()}
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Credits Spent
            </Text>
          </View>

          {/* Credits Earned */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: theme.colors.success + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.sm,
            }}>
              <ArrowDownLeft size={24} color={theme.colors.success} />
            </View>
            <Text variant="h2" style={{ marginBottom: theme.spacing.xs }}>
              {totalEarned.toLocaleString()}
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Credits Earned
            </Text>
          </View>
        </View>

        {/* Net Change */}
        <View style={{
          backgroundColor: netChange >= 0 ? theme.colors.success + '10' : theme.colors.error + '10',
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          alignItems: 'center',
        }}>
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
            Net Change
          </Text>
          <Text 
            variant="h3" 
            style={{ 
              color: netChange >= 0 ? theme.colors.success : theme.colors.error,
            }}
          >
            {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()} credits
          </Text>
        </View>
      </View>
    );
  };

  const renderTransactionBreakdown = () => {
    if (!analytics) return null;

    const typeEntries = Object.entries(analytics.by_type || {});
    const totalTransactions = analytics.totals.transaction_count;

    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <PieChart size={24} color={theme.colors.primary} />
          <Text variant="h3" style={{ marginLeft: theme.spacing.sm }}>
            Transaction Breakdown
          </Text>
        </View>

        {typeEntries.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            {typeEntries.map(([type, data]) => {
              const percentage = totalTransactions > 0 ? (data.count / totalTransactions) * 100 : 0;
              
              return (
                <View key={type} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    <View style={{
                      height: 8,
                      backgroundColor: theme.colors.surfaceVariant,
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        height: '100%',
                        width: `${percentage}%`,
                        backgroundColor: theme.colors.primary,
                      }} />
                    </View>
                  </View>
                  
                  <View style={{ alignItems: 'flex-end', marginLeft: theme.spacing.md }}>
                    <Text variant="body" style={{ fontWeight: '600' }}>
                      {data.count}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text variant="body" color="secondary" style={{ textAlign: 'center', padding: theme.spacing.xl }}>
            No transaction data available for this period.
          </Text>
        )}
      </View>
    );
  };

  const renderPerformanceMetrics = () => {
    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}>
          <Target size={24} color={theme.colors.primary} />
          <Text variant="h3" style={{ marginLeft: theme.spacing.sm }}>
            Performance Metrics
          </Text>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          {/* Success Rate */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View>
              <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
                Success Rate
              </Text>
              <Text variant="caption" color="secondary">
                Completed transactions
              </Text>
            </View>
            <Text variant="h3" style={{ color: theme.colors.success }}>
              {stats.successRate.toFixed(1)}%
            </Text>
          </View>

          {/* Average Transaction */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View>
              <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
                Average Transaction
              </Text>
              <Text variant="caption" color="secondary">
                Average amount per transaction
              </Text>
            </View>
            <Text variant="h3">
              {formatAmount(stats.averageTransactionAmount)}
            </Text>
          </View>

          {/* Most Common Type */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View>
              <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
                Most Common Type
              </Text>
              <Text variant="caption" color="secondary">
                Your most frequent transaction
              </Text>
            </View>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {stats.mostCommonType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (analyticsLoading && summaryLoading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Transaction Analytics"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </Container>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Transaction Analytics"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Container>
          {/* Period Selector */}
          {renderPeriodSelector()}

          {/* Overview Cards */}
          {renderOverviewCards()}

          {/* Transaction Breakdown */}
          {renderTransactionBreakdown()}

          {/* Performance Metrics */}
          {renderPerformanceMetrics()}

          {/* Quick Actions */}
          <View style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xl,
          }}>
            <Button
              variant="primary"
              size="lg"
              onPress={() => router.push('/transactions')}
              icon={<BarChart3 size={20} color={theme.colors.white} />}
              style={{ flex: 1 }}
            >
              View All Transactions
            </Button>
            <Button
              variant="tertiary"
              size="lg"
              onPress={() => router.push('/buy-credits')}
              icon={<CreditCard size={20} color={theme.colors.primary} />}
              style={{ flex: 1 }}
            >
              Buy Credits
            </Button>
          </View>
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
