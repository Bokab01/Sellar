import React, { useState, useMemo, useCallback } from 'react';
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
import { 
  useFinancialTransactions, 
  useTransactionSummary,
  FinancialTransaction as Transaction 
} from '@/hooks/useTransactions';
import { 
  formatAmount, 
  formatCredits,
  groupTransactionsByDate
} from '@/lib/transactionService';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Plus,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react-native';

export default function TransactionsScreen() {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { transactions, loading, error, refresh } = useFinancialTransactions();
  const { summary, loading: summaryLoading } = useTransactionSummary();

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDate(transactions);
  }, [transactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleTransactionPress = useCallback((transaction: Transaction) => {
    // For now, just show an alert with transaction details
    // TODO: Implement transaction details modal or screen
    console.log('Transaction pressed:', transaction.id);
  }, []);


  const renderSummaryCard = useCallback(() => {
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
              <CreditCard size={24} color={theme.colors.primary} />
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
              {(summary.total_credits || 0).toLocaleString()}
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
              {(summary.total_amount || 0).toLocaleString()}
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
            icon={<Plus size={20} color={theme.colors.primaryForeground} />}
            style={{ flex: 1 }}
          >
            Buy Credits
          </Button>
        </View>
      </View>
    );
  }, [summaryLoading, summary, theme]);

  const renderTransactionGroup = useCallback(({ item }: { item: [string, Transaction[]] }) => {
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
  }, [theme, handleTransactionPress]);

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
          {transactions.length === 0 ? (
            <EmptyState
              title="No Transactions Found"
              description="You haven't made any transactions yet. Start by purchasing credits or making your first listing."
              action={{
                text: "Buy Credits",
                onPress: () => router.push('/buy-credits')
              }}
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
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
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
