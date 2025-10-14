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
import { TransactionDetailsModal } from '@/components/TransactionDetailsModal/TransactionDetailsModal';
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
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowDetailsModal(false);
    // Delay clearing transaction to allow modal animation to complete
    setTimeout(() => setSelectedTransaction(null), 300);
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
              {summary.transactions.total_count}
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
              {(summary.transactions.total_earned_amount || 0).toLocaleString()}
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
              {(summary.transactions.total_spent_amount || 0).toLocaleString()}
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

  // ✅ Memoized transaction render function for FlatList
  const renderTransaction = useCallback(({ item: transaction }: { item: Transaction }) => (
    <TransactionCard
      transaction={transaction}
      onPress={handleTransactionPress}
      showDate={true}
    />
  ), [handleTransactionPress]);

  // ✅ Optimized keyExtractor
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  // ✅ List header component with summary
  const ListHeader = useCallback(() => (
    <>
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

      {/* Results Count */}
      {transactions.length > 0 && (
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
      )}
    </>
  ), [renderSummaryCard, error, theme, transactions.length]);

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Transaction History"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          {/* Summary Card Skeleton */}
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <LoadingSkeleton width={120} height={20} />
              <LoadingSkeleton width={80} height={24} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
              <LoadingSkeleton width={100} height={16} />
              <LoadingSkeleton width={60} height={16} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <LoadingSkeleton width={80} height={16} />
              <LoadingSkeleton width={70} height={16} />
            </View>
          </View>

          {/* Transaction Groups Skeleton */}
          {Array.from({ length: 3 }).map((_, groupIndex) => (
            <View key={groupIndex} style={{ marginBottom: theme.spacing.lg }}>
              {/* Date Header Skeleton */}
              <LoadingSkeleton 
                width={120} 
                height={18} 
                style={{ 
                  marginBottom: theme.spacing.md,
                  paddingHorizontal: theme.spacing.sm,
                }} 
              />
              
              {/* Transaction Cards Skeleton */}
              {Array.from({ length: 2 + Math.floor(Math.random() * 3) }).map((_, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
                    <LoadingSkeleton width={40} height={40} borderRadius={20} />
                    <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                      <LoadingSkeleton width="70%" height={16} style={{ marginBottom: theme.spacing.xs }} />
                      <LoadingSkeleton width="50%" height={12} />
                    </View>
                    <LoadingSkeleton width={80} height={20} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <LoadingSkeleton width={100} height={14} />
                    <LoadingSkeleton width={60} height={14} />
                  </View>
                </View>
              ))}
            </View>
          ))}
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

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            title="No Transactions Found"
            description="You haven't made any transactions yet. Start by purchasing credits or making your first listing."
            action={{
              text: "Buy Credits",
              onPress: () => router.push('/buy-credits')
            }}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        // ✅ Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={{
          paddingBottom: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        visible={showDetailsModal}
        transaction={selectedTransaction}
        onClose={handleCloseModal}
      />
    </SafeAreaWrapper>
  );
}
