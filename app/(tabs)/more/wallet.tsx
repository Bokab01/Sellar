import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { CREDIT_PACKAGES, BUSINESS_PLANS } from '@/constants/monetization';
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
  CreditBalance,
  Toast,
} from '@/components';
import { 
  Zap, 
  Plus, 
  ShoppingCart, 
  Building, 
  ArrowUpRight, 
  TrendingUp,
  History,
  Gift,
  Star,
  Crown,
  UserPlus,
  ArrowDownLeft,
  DollarSign
} from 'lucide-react-native';

export default function WalletScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  // Use selective subscriptions to prevent unnecessary re-renders
  const creditBalance = useMonetizationStore(state => state.balance);
  const creditLoading = useMonetizationStore(state => state.loading);
  const refreshCredits = useMonetizationStore(state => state.refreshCredits);

  
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  // Memoize callback functions to prevent re-renders (must be at top level)
  const handleTopUp = useCallback(() => {
    router.push('/buy-credits');
  }, []);

  const handleBusinessPlans = useCallback(() => {
    router.push('/subscription-plans');
  }, []);

  const handleFeatureMarketplace = useCallback(() => {
    router.push('/feature-marketplace');
  }, []);

  // Memoize styles to prevent re-renders
  const styles = useMemo(() => ({
    scrollContentContainer: { paddingBottom: theme.spacing.xl },
    sectionContainer: { marginBottom: theme.spacing.xl },
    packageCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    popularPackageCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    businessPlanCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    // Common layout styles
    rowSpaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    rowCenterGap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    flex1: { flex: 1 },
    gapMd: { gap: theme.spacing.md },
    alignEnd: { alignItems: 'flex-end' },
    // Text styles
    sectionTitle: { marginBottom: theme.spacing.lg },
    itemTitle: { marginRight: theme.spacing.sm },
    itemDescription: { marginBottom: theme.spacing.sm },
    itemCredits: { fontWeight: '600', fontSize: 16 },
    zapIcon: { marginRight: theme.spacing.xs },
    // Loading styles
    loadingMain: { marginBottom: theme.spacing.xl },
    loadingSecondary: { marginBottom: theme.spacing.lg },
    loadingItem: { marginBottom: theme.spacing.md },
  }), [theme]);

  useEffect(() => {
    if (user) {
      fetchWalletData();
      // Don't call refreshCredits here - it should already be loaded
      // and calling it causes infinite re-renders
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
    await Promise.all([
      fetchWalletData(),
      refreshCredits()
    ]);
    setRefreshing(false);
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
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={150} borderRadius={theme.borderRadius.lg} style={styles.loadingMain} />
          <LoadingSkeleton width="100%" height={200} borderRadius={theme.borderRadius.lg} style={styles.loadingSecondary} />
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={60} style={styles.loadingItem} />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }


  return (
    <SafeAreaWrapper>
      <ScrollView 
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Container>
          {/* Credit Balance Component */}
          <CreditBalance
            balance={creditBalance}
            maxCredits={1000}
            onTopUp={handleTopUp}
            onBusinessPlans={handleBusinessPlans}
            loading={creditLoading}
          />

          {/* Credit Packages Preview */}
          <View style={styles.sectionContainer}>
            <Text variant="h3" style={styles.sectionTitle}>
              Popular Credit Packages
            </Text>
            
            <View style={styles.gapMd}>
              {CREDIT_PACKAGES.slice(0, 2).map((package_) => (
                <TouchableOpacity
                  key={package_.id}
                  onPress={handleTopUp}
                  style={[
                    package_.popular ? styles.popularPackageCard : styles.packageCard,
                    theme.shadows.sm,
                  ]}
                  activeOpacity={0.95}
                >
                  <View style={styles.rowSpaceBetween}>
                    <View style={styles.flex1}>
                      <View style={[styles.rowCenter, { marginBottom: theme.spacing.xs }]}>
                        <Text variant="h4" style={styles.itemTitle}>
                          {package_.name}
                        </Text>
                        {package_.popular && (
                          <Badge text="Popular" variant="success" />
                        )}
                      </View>
                      <Text variant="bodySmall" color="muted" style={styles.itemDescription}>
                        {package_.description}
                      </Text>
                      <View style={styles.rowCenter}>
                        <Zap size={16} color={theme.colors.primary} style={styles.zapIcon} />
                        <Text variant="body" style={styles.itemCredits}>
                          {package_.credits} Credits
                        </Text>
                      </View>
                    </View>
                    <View style={styles.alignEnd}>
                      <PriceDisplay 
                        amount={package_.priceGHS} 
                        currency="GHS" 
                        size="lg"
                        style={{ marginBottom: theme.spacing.xs }}
                      />
                      <Text variant="caption" color="muted">
                        GHS {package_.pricePerCredit.toFixed(3)}/credit
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
                onPress={() => router.push('/transactions')}
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
                    subtitle={transaction.related_listing?.title || `${transaction.type || 'Unknown'} transaction`}
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
                      Earn 1% cashback in credits on successful sales
                    </Text>
                  </View>
                  <Badge text="1%" variant="warning" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Business Plans Preview */}
          <View style={styles.sectionContainer}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Business Plans
            </Text>
            
            <TouchableOpacity
              onPress={handleBusinessPlans}
              style={[
                styles.businessPlanCard,
                { borderColor: theme.colors.primary + '30' },
                theme.shadows.sm,
              ]}
              activeOpacity={0.95}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <View
                  style={{
                    backgroundColor: theme.colors.primary + '20',
                    borderRadius: theme.borderRadius.full,
                    width: 48,
                    height: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: theme.spacing.md,
                  }}
                >
                  <Crown size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.xs }}>
                    Pro Business Plan
                  </Text>
                  <Text variant="bodySmall" color="muted">
                    80 credits monthly • Unlimited listings • Auto-boost
                  </Text>
                </View>
                <PriceDisplay amount={250} currency="GHS" size="lg" />
              </View>
              <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                Tap to view all business plans →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feature Marketplace */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
              Spend Your Credits
            </Text>
            
            <TouchableOpacity
              onPress={handleFeatureMarketplace}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
              activeOpacity={0.95}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                <View
                  style={{
                    backgroundColor: theme.colors.warning + '20',
                    borderRadius: theme.borderRadius.full,
                    width: 48,
                    height: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: theme.spacing.md,
                  }}
                >
                  <Zap size={24} color={theme.colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h4" style={{ marginBottom: theme.spacing.xs }}>
                    Feature Marketplace
                  </Text>
                  <Text variant="bodySmall" color="muted">
                    Boost listings • Analytics • Premium features
                  </Text>
                </View>
                <ArrowUpRight size={20} color={theme.colors.text.muted} />
              </View>
              <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
                Explore premium features →
              </Text>
            </TouchableOpacity>
          </View>
        </Container>
      </ScrollView>



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
