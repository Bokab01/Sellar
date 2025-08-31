import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { dbHelpers, supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  Button,
  PriceDisplay,
  Badge,
  ListItem,
  EmptyState,
  LoadingSkeleton,
  AppModal,
  Input,
  Toast,
} from '@/components';
import { 
  Wallet, 
  Plus, 
  Minus, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Gift,
  TrendingUp,
  History,
  DollarSign
} from 'lucide-react-native';

export default function WalletScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch user profile with wallet info
      const { data: profileData } = await dbHelpers.getProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch transaction history
      const { data: transactionData } = await supabase
        .from('transactions')
        .select(`
          *,
          related_listing:related_listing_id (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (transactionData) {
        setTransactions(transactionData);
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const handleAddFunds = async () => {
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const fundAmount = Number(amount);
    if (isNaN(fundAmount) || fundAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (fundAmount < 5) {
      Alert.alert('Error', 'Minimum top-up amount is GHS 5');
      return;
    }

    setProcessing(true);
    try {
      // TODO: Integrate with Paystack for actual payment processing
      // For now, simulate successful payment
      
      // Create credit transaction
      await supabase.rpc('create_transaction', {
        p_user_id: user!.id,
        p_type: 'credit',
        p_amount: fundAmount,
        p_description: `Wallet top-up via mobile money`,
        p_reference_id: `topup_${Date.now()}`,
      });

      setShowAddFunds(false);
      setAmount('');
      setToastMessage(`GHS ${fundAmount.toFixed(2)} added to your wallet!`);
      setToastVariant('success');
      setShowToast(true);
      
      // Refresh data
      await fetchWalletData();
    } catch (error) {
      setToastMessage('Failed to add funds. Please try again.');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const availableBalance = (profile?.wallet_balance || 0) + (profile?.credit_balance || 0);
    if (withdrawAmount > availableBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    if (withdrawAmount < 10) {
      Alert.alert('Error', 'Minimum withdrawal amount is GHS 10');
      return;
    }

    setProcessing(true);
    try {
      // Create debit transaction
      await supabase.rpc('create_transaction', {
        p_user_id: user!.id,
        p_type: 'debit',
        p_amount: withdrawAmount,
        p_description: `Withdrawal to mobile money`,
        p_reference_id: `withdraw_${Date.now()}`,
      });

      setShowWithdraw(false);
      setAmount('');
      setToastMessage(`GHS ${withdrawAmount.toFixed(2)} withdrawal initiated!`);
      setToastVariant('success');
      setShowToast(true);
      
      // Refresh data
      await fetchWalletData();
    } catch (error) {
      setToastMessage('Failed to process withdrawal. Please try again.');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'refund':
      case 'bonus':
        return <ArrowDownLeft size={20} color={theme.colors.success} />;
      case 'debit':
      case 'purchase':
        return <ArrowUpRight size={20} color={theme.colors.error} />;
      default:
        return <DollarSign size={20} color={theme.colors.text.muted} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'refund':
      case 'bonus':
        return theme.colors.success;
      case 'debit':
      case 'purchase':
        return theme.colors.error;
      default:
        return theme.colors.text.primary;
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Wallet"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={150} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.xl }} />
          <LoadingSkeleton width="100%" height={200} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={60} style={{ marginBottom: theme.spacing.md }} />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  const walletBalance = profile?.wallet_balance || 0;
  const creditBalance = profile?.credit_balance || 0;
  const pendingBalance = profile?.pending_balance || 0;
  const totalBalance = walletBalance + creditBalance;

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Wallet & Credit"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            variant="icon"
            icon={<History size={20} color={theme.colors.text.primary} />}
            onPress={() => router.push('/(tabs)/transactions')}
          />,
        ]}
      />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Container>
          {/* Balance Card */}
          <View
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xl,
              marginBottom: theme.spacing.xl,
              ...theme.shadows.lg,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.primaryForeground + 'CC',
                  marginBottom: theme.spacing.sm,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Total Balance
              </Text>
              <PriceDisplay
                amount={totalBalance}
                size="xl"
                currency="GHS"
                style={{
                  marginBottom: theme.spacing.md,
                }}
              />
              
              {pendingBalance > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.primaryForeground + 'AA' }}
                  >
                    + GHS {pendingBalance.toFixed(2)} pending
                  </Text>
                </View>
              )}
            </View>

            {/* Balance Breakdown */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingTop: theme.spacing.lg,
                borderTopWidth: 1,
                borderTopColor: theme.colors.primaryForeground + '20',
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text
                  variant="h4"
                  style={{
                    color: theme.colors.primaryForeground,
                    fontWeight: '700',
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  {walletBalance.toFixed(2)}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primaryForeground + 'CC' }}
                >
                  Wallet
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  variant="h4"
                  style={{
                    color: theme.colors.primaryForeground,
                    fontWeight: '700',
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  {creditBalance.toFixed(2)}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: theme.colors.primaryForeground + 'CC' }}
                >
                  Credits
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.xl,
            }}
          >
            <Button
              variant="primary"
              icon={<Plus size={18} color={theme.colors.primaryForeground} />}
              onPress={() => setShowAddFunds(true)}
              style={{ flex: 1 }}
              size="lg"
            >
              Add Funds
            </Button>
            
            <Button
              variant="secondary"
              icon={<Minus size={18} color={theme.colors.primary} />}
              onPress={() => setShowWithdraw(true)}
              style={{ flex: 1 }}
              size="lg"
              disabled={totalBalance < 10}
            >
              Withdraw
            </Button>
          </View>

          {/* Recent Transactions */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text variant="h3">Recent Transactions</Text>
              <Button
                variant="ghost"
                onPress={() => router.push('/(tabs)/transactions')}
                size="sm"
              >
                View All
              </Button>
            </View>

            {transactions.length > 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  ...theme.shadows.sm,
                }}
              >
                {transactions.slice(0, 5).map((transaction, index) => (
                  <ListItem
                    key={transaction.id}
                    title={transaction.description}
                    subtitle={transaction.related_listing?.title || `${transaction.type} transaction`}
                    timestamp={new Date(transaction.created_at).toLocaleDateString()}
                    rightIcon={getTransactionIcon(transaction.type)}
                    style={{
                      borderBottomWidth: index < Math.min(transactions.length, 5) - 1 ? 1 : 0,
                    }}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon={<History size={48} color={theme.colors.text.muted} />}
                title="No transactions yet"
                description="Your transaction history will appear here"
              />
            )}
          </View>

          {/* Earning Opportunities */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Earn More Credits
            </Text>

            <View style={{ gap: theme.spacing.md }}>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.colors.success + '10',
                  borderColor: theme.colors.success + '30',
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.success,
                      borderRadius: theme.borderRadius.full,
                      width: 48,
                      height: 48,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <UserPlus size={24} color={theme.colors.successForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                      Invite Friends
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      Earn GHS 10 for each friend who joins and makes their first sale
                    </Text>
                  </View>
                  <Badge text="GHS 10" variant="success" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: theme.colors.warning + '10',
                  borderColor: theme.colors.warning + '30',
                  borderWidth: 1,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.warning,
                      borderRadius: theme.borderRadius.full,
                      width: 48,
                      height: 48,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <TrendingUp size={24} color={theme.colors.warningForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                      Complete Sales
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      Earn 2% credit back on every successful sale
                    </Text>
                  </View>
                  <Badge text="2%" variant="warning" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Container>
      </ScrollView>

      {/* Add Funds Modal */}
      <AppModal
        visible={showAddFunds}
        onClose={() => setShowAddFunds(false)}
        title="Add Funds"
        primaryAction={{
          text: 'Add Funds',
          onPress: handleAddFunds,
          loading: processing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowAddFunds(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <Text variant="body" color="secondary">
            Add money to your Sellar wallet using mobile money or bank transfer
          </Text>

          <Input
            label="Amount (GHS)"
            placeholder="Enter amount to add"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            helper="Minimum: GHS 5.00"
          />

          <View
            style={{
              backgroundColor: theme.colors.primary + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary, textAlign: 'center' }}>
              💳 Secure payment via Paystack • No hidden fees
            </Text>
          </View>
        </View>
      </AppModal>

      {/* Withdraw Modal */}
      <AppModal
        visible={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        title="Withdraw Funds"
        primaryAction={{
          text: 'Withdraw',
          onPress: handleWithdraw,
          loading: processing,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowWithdraw(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
              Available Balance:
            </Text>
            <PriceDisplay amount={totalBalance} size="lg" />
          </View>

          <Input
            label="Withdrawal Amount (GHS)"
            placeholder="Enter amount to withdraw"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            helper={`Minimum: GHS 10.00 • Available: GHS ${totalBalance.toFixed(2)}`}
          />

          <View
            style={{
              backgroundColor: theme.colors.warning + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.warning, textAlign: 'center' }}>
              ⏱️ Withdrawals are processed within 1-3 business days
            </Text>
          </View>
        </View>
      </AppModal>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}