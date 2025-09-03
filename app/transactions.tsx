import React, { useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl, FlatList } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  EmptyState,
  LoadingSkeleton,
  Button,
} from '@/components';
import { TransactionCard } from '@/components/TransactionCard/TransactionCard';
import { TransactionFilters, TransactionFilters as FilterComponent } from '@/components/TransactionFilters/TransactionFilters';
import { 
  useTransactions, 
  useTransactionSummary,
  Transaction 
} from '@/hooks/useTransactions';
import { 
  formatAmount, 
  formatCredits,
  groupTransactionsByDate,
  searchTransactions,
  filterTransactionsByType,
  filterTransactionsByStatus,
  filterTransactionsByDateRange
} from '@/lib/transactionService';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  BarChart3,
  Plus,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react-native';

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [refreshing, setRefreshing] = useState(false);

  const { transactions, loading, error, refetch } = useTransactions();
  const { summary, loading: summaryLoading } = useTransactionSummary();

  // Filter and search transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search
    if (filters.searchQuery) {
      filtered = searchTransactions(filtered, filters.searchQuery);
    }

    // Apply type filter
    if (filters.type) {
      filtered = filterTransactionsByType(filtered, [filters.type]);
    }

    // Apply status filter
    if (filters.status) {
      filtered = filterTransactionsByStatus(filtered, [filters.status]);
    }

    // Apply date range filter
    if (filters.startDate && filters.endDate) {
      filtered = filterTransactionsByDateRange(
        filtered,
        new Date(filters.startDate),
        new Date(filters.endDate)
      );
    }

    // Apply amount range filter
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      filtered = filtered.filter(t => {
        const amount = Math.abs(t.amount);
        const minCheck = filters.amountMin === undefined || amount >= filters.amountMin;
        const maxCheck = filters.amountMax === undefined || amount <= filters.amountMax;
        return minCheck && maxCheck;
      });
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    return filtered;
  }, [transactions, filters]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDate(filteredTransactions);
  }, [filteredTransactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    // For now, just show an alert with transaction details
    // TODO: Implement transaction details modal or screen
    console.log('Transaction pressed:', transaction.id);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const renderSummaryCard = () => {
    if (summaryLoading || !summary) return null;

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
          Transaction Summary
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
              {summary.total_transactions}
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Total Transactions
            </Text>
          </View>

          {/* Credits Purchased */}
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
              {summary.credits_purchased.toLocaleString()}
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Credits Purchased
            </Text>
          </View>

          {/* Credits Used */}
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
              {summary.credits_used.toLocaleString()}
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              Credits Used
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
        }}>
          <Button
            variant="primary"
            size="md"
            onPress={() => router.push('/buy-credits')}
            icon={<Plus size={20} color={theme.colors.white} />}
            style={{ flex: 1 }}
          >
            Buy Credits
          </Button>
          <Button
            variant="tertiary"
            size="md"
            onPress={() => router.push('/transaction-analytics')}
            icon={<BarChart3 size={20} color={theme.colors.primary} />}
            style={{ flex: 1 }}
          >
            Analytics
          </Button>
        </View>
      </View>
    );
  };

  const renderTransactionGroup = ({ item }: { item: [string, Transaction[]] }) => {
    const [date, groupTransactions] = item;
    
    return (
      <View key={date} style={{ marginBottom: theme.spacing.lg }}>
        {/* Date Header */}
        <Text 
          variant="h4" 
          style={{ 
            marginBottom: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
          }}
        >
          {date}
        </Text>

        {/* Transactions */}
        {groupTransactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onPress={handleTransactionPress}
            showDate={false}
          />
        ))}
      </View>
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Transactions"
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
        title="Transaction History"
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
          {/* Summary Card */}
          {renderSummaryCard()}

          {/* Filters */}
          <FilterComponent
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={clearFilters}
          />

          {/* Error State */}
          {error && (
            <View style={{
              backgroundColor: theme.colors.error + '10',
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
            }}>
              <Text variant="body" style={{ color: theme.colors.error, textAlign: 'center' }}>
                {error}
              </Text>
            </View>
          )}

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <EmptyState
              title="No Transactions Found"
              description={
                Object.keys(filters).length > 0
                  ? "No transactions match your current filters. Try adjusting your search criteria."
                  : "You haven't made any transactions yet. Start by purchasing credits or making your first listing."
              }
              action={
                Object.keys(filters).length > 0 ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={clearFilters}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={() => router.push('/buy-credits')}
                    icon={<CreditCard size={20} color={theme.colors.white} />}
                  >
                    Buy Credits
                  </Button>
                )
              }
            />
          ) : (
            <View style={{ marginBottom: theme.spacing.xl }}>
              {/* Results Count */}
              <Text 
                variant="bodySmall" 
                color="secondary" 
                style={{ 
                  marginBottom: theme.spacing.lg,
                  paddingHorizontal: theme.spacing.sm,
                }}
              >
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
              </Text>

              {/* Grouped Transactions */}
              {Object.entries(groupedTransactions).map((item) => 
                renderTransactionGroup({ item })
              )}
            </View>
          )}
        </Container>
      </ScrollView>
    </SafeAreaWrapper>
  );
}