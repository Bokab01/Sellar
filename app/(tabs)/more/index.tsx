import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { dbHelpers, supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  Container,
  AppHeader,
  ListItem,
  Avatar,
  Button,
  PriceDisplay,
  Badge,
  CompactUserBadges,
  LoadingSkeleton,
  Toast,
  AppModal,
} from '@/components';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import { 
  User, 
  Settings, 
  Wallet, 
  ShoppingCart,
  Building,
  Zap,
  Package, 
  Star, 
  CreditCard, 
  CircleHelp as HelpCircle, 
  UserPlus2, 
  UserMinus,
  LogOut, 
  Shield,
  Bell,
  Heart,
  FileText,
  Award,
  Smartphone,
  Edit3,
  BarChart3
} from 'lucide-react-native';

export default function MoreScreen() {
  const { theme } = useTheme();
  const { user, signOut } = useAuthStore();
  const { contentBottomPadding } = useBottomTabBarSpacing();
  // Use selective subscriptions to prevent unnecessary re-renders
  const balance = useMonetizationStore(state => state.balance);
  const currentPlan = useMonetizationStore(state => state.currentPlan);
  // Only subscribe to transaction COUNT, not the entire array to prevent re-renders
  const transactionCount = useMonetizationStore(state => state.transactions.length);
  const refreshCredits = useMonetizationStore(state => state.refreshCredits);
  const refreshSubscription = useMonetizationStore(state => state.refreshSubscription);
  const hasBusinessPlan = useMonetizationStore(state => state.hasBusinessPlan);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  
  // Track if we've already loaded data to prevent unnecessary refreshes
  const hasLoadedData = React.useRef(false);
  const isInitialMount = React.useRef(true);

  const fetchUserData = React.useCallback(async (isInitialLoad = false) => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await dbHelpers.getProfile(user.id);
      if (profileData) {
        // ✅ Check if user has active Sellar Pro subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('status, current_period_end, plan_id, subscription_plans(name)')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'cancelled'])
          .single();

        const isSellarPro = subscription && 
          (subscription as any).subscription_plans?.name === 'Sellar Pro' &&
          (subscription.current_period_end ? new Date(subscription.current_period_end) > new Date() : true);

        setProfile({ ...profileData, is_sellar_pro: isSellarPro });
        hasLoadedData.current = true;
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      // Only set loading to false on initial load
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [user]);

  // Single effect to handle initial data loading
  useEffect(() => {
    if (user && isInitialMount.current) {
      isInitialMount.current = false;
      fetchUserData(true);
    } else if (!user) {
      // Reset when user logs out
      hasLoadedData.current = false;
      isInitialMount.current = true;
      setProfile(null);
      setLoading(true);
    }
  }, [user, fetchUserData]);

  // Refresh data when screen comes into focus (only refresh credits/subscription, not profile)
  useFocusEffect(
    React.useCallback(() => {
      if (user && hasLoadedData.current) {
        // Use getState to avoid dependencies on store functions
        const { balance: currentBalance, currentPlan: currentSub, refreshCredits: doRefreshCredits, refreshSubscription: doRefreshSub } = useMonetizationStore.getState();
        
        // Only refresh credits if balance is 0 or we don't have transaction data
        if (currentBalance === 0 || transactionCount === 0) {
          doRefreshCredits();
        }
        // Only refresh subscription if we don't have current plan data
        if (!currentSub) {
          doRefreshSub();
        }
      }
    }, [user, transactionCount]) // Minimal dependencies
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserData(false),
      refreshCredits(),
      refreshSubscription()
    ]);
    setRefreshing(false);
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    setShowSignOutModal(false);
    try {
      // ✅ FIX: Reset monetization store before signing out
      useMonetizationStore.getState().resetStore();
      
      await signOut();
      
      // Navigate to auth screen immediately
      router.replace('/(auth)/onboarding');
    } catch (error) {
      console.error('Sign out error:', error);
      // ✅ FIX: Still reset store even if sign out fails
      useMonetizationStore.getState().resetStore();
      // Still navigate even if sign out fails
      router.replace('/(auth)/onboarding');
    }
  };

  // Pre-compute values to prevent recalculation flash
  const firstName = user?.user_metadata?.first_name || profile?.first_name || 'User';
  const lastName = user?.user_metadata?.last_name || profile?.last_name || '';
  const fullName = `${firstName || 'User'} ${lastName || ''}`.trim() || 'User';
  const walletBalance = profile?.wallet_balance || 0;
  const creditBalance = balance; // Use monetization store balance

  // Memoize helper functions
  const getVerificationSubtitle = React.useCallback(() => {
    switch (profile?.verification_status) {
      case 'verified': return 'Account verified ✓';
      case 'pending': return 'Verification in progress...';
      case 'rejected': return 'Verification failed - retry available';
      default: return 'Verify your account for more features';
    }
  }, [profile?.verification_status]);

  const getVerificationColor = React.useCallback(() => {
    switch (profile?.verification_status) {
      case 'verified': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.text.muted;
    }
  }, [profile?.verification_status, theme.colors]);

  const getVerificationBadge = React.useCallback(() => {
    switch (profile?.verification_status) {
      case 'verified': return { text: 'Verified', variant: 'success' as const };
      case 'pending': return { text: 'Pending', variant: 'warning' as const };
      case 'rejected': return { text: 'Failed', variant: 'error' as const };
      default: return undefined;
    }
  }, [profile?.verification_status]);

  // Memoize menu sections to prevent unnecessary re-renders
  const menuSections = React.useMemo(() => [
    {
      title: 'Account',
      items: [
       /*  {
          title: 'My Profile',
          subtitle: 'View your public profile',
          icon: <User size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push(`/profile/${user?.id}`),
        }, */
        {
          title: 'Edit Profile',
          subtitle: 'Update your profile and business information',
          icon: <Edit3 size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/edit-profile'),
        },
        /* {
          title: 'Wallet & Credit',
          subtitle: `${Math.floor(creditBalance)} credits • GHS ${walletBalance.toFixed(2)} wallet`,
          icon: <Wallet size={20} color={theme.colors.success} />,
          badge: creditBalance > 0 ? { text: `${Math.floor(creditBalance)}`, variant: 'success' as const } : undefined,
          onPress: () => router.push('/(tabs)/more/wallet'),
        }, */
       /*  {
          title: 'Buy Credits',
          subtitle: 'Purchase credits for premium features',
          icon: <ShoppingCart size={20} color={theme.colors.primary} />,
          onPress: () => router.push('/buy-credits'),
        }, */
        {
          title: 'My Rewards',
          subtitle: 'Track your credits and achievements',
          icon: <Award size={20} color={theme.colors.warning} />,
          onPress: () => router.push('/my-rewards'),
        },
        {
          title: hasBusinessPlan() ? 'Sellar Pro Dashboard' : 'Dashboard',
          subtitle: hasBusinessPlan() ? 'Detailed analytics and insights' : 'View your performance metrics',
          icon: <BarChart3 size={20} color={theme.colors.primary} />,
          badge: hasBusinessPlan() ? { text: 'Pro', variant: 'success' as const } : undefined,
          onPress: () => router.push('/dashboard'),
        },
        {
          title: 'Boost Listings',
          subtitle: 'Boost your listings and unlock tools',
          icon: <Zap size={20} color={theme.colors.warning} />,
          onPress: () => router.push('/feature-marketplace'),
        },
        {
          title: 'Verification',
          subtitle: getVerificationSubtitle(),
          icon: <Shield size={20} color={getVerificationColor()} />,
          badge: getVerificationBadge(),
          onPress: () => router.push('/verification'),
        },
      ],
    },
    {
      title: 'My Activity',
      items: [
        {
          title: 'My Listings',
          subtitle: 'Manage your active, sold, and draft listings',
          icon: <Package size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/my-listings'),
        },
        {
          title: 'My Orders',
          subtitle: 'Track your buy and sell orders',
          icon: <ShoppingCart size={20} color={theme.colors.primary} />,
          onPress: () => router.push('/my-orders'),
        },
        {
          title: 'Reviews & Ratings',
          subtitle: 'View your reviews and rating history',
          icon: <Star size={20} color={theme.colors.warning} />,
          onPress: () => router.push('/reviews'),
        },
        {
          title: 'Transaction History',
          subtitle: 'View all your transactions',
          icon: <CreditCard size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/transactions'),
        },
      ],
    },
    {
      title: 'App & Support',
      items: [
        {
          title: 'Settings',
          subtitle: 'App preferences, privacy, and notifications',
          icon: <Settings size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/(tabs)/more/settings'),
        },
        /* {
          title: 'Notifications',
          subtitle: 'Manage your notification preferences',
          icon: <Bell size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/notifications'),
        }, */
        {
          title: 'Help & Support',
          subtitle: 'FAQ, contact support, and app guides',
          icon: <HelpCircle size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/help'),
        },
        {
          title: 'Invite Friends',
          subtitle: 'Share Sellar and earn rewards',
          icon: <UserPlus2 size={20} color={theme.colors.primary} />,
          onPress: () => router.push('/invite'),
        },
      ],
    },
  ], [profile?.total_reviews, profile?.rating, transactionCount, theme.colors, getVerificationSubtitle, getVerificationColor, getVerificationBadge]);

  // Render loading state
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ScrollView 
            contentContainerStyle={{ 
              paddingTop: theme.spacing.md,
              padding: theme.spacing.sm,
              flexGrow: 1 
            }}
            style={{ backgroundColor: theme.colors.background }}
          >
            <LoadingSkeleton width="100%" height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.xl }} />
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} width="100%" height={200} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
            ))}
          </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: contentBottomPadding, paddingTop: theme.spacing.md }}
        style={{ backgroundColor: theme.colors.background }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Container>
          {/* User Profile Header */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.sm,
              marginBottom: theme.spacing.xl,
              ...theme.shadows.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.lg }}>
              <Avatar
                source={user?.user_metadata?.avatar_url || profile?.avatar_url}
                name={fullName}
                size="lg"
                style={{ marginRight: theme.spacing.lg }}
              />
              <View style={{ flex: 1 }}>
                {/* Name - First line (with business name if configured) */}
                <View style={{ marginBottom: 4 }}>
                  <UserDisplayName
                    profile={profile}
                    variant="full"
                    showBadge={false}
                    textVariant="h3"
                    style={{ fontWeight: '600' }}
                  />
                </View>
                
                {/* Badges row - Below name, aligned to start */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs, flexWrap: 'wrap' }}>
                  <CompactUserBadges
                    isSellarPro={profile?.is_sellar_pro}
                    isBusinessUser={profile?.is_business_user}
                    isVerified={profile?.is_verified}
                    isBusinessVerified={profile?.is_business_verified}
                  />
                </View>
                
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                  {user?.email}
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                    <Zap size={16} color={theme.colors.primary} />
                    <Text variant="h4" style={{ fontWeight: '600', color: theme.colors.primary }}>
                      {(balance || 0).toLocaleString()} Credits
                    </Text>
                  </View>
                  {profile?.rating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                      <Star size={14} color={theme.colors.warning} fill={theme.colors.warning} />
                      <Text variant="bodySmall" color="secondary">
                        {profile.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                paddingTop: theme.spacing.lg,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Text variant="h4" style={{ fontWeight: '700' }}>
                  {profile?.total_sales || 0}
                </Text>
                <Text variant="caption" color="muted">
                  Sales
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h4" style={{ fontWeight: '700' }}>
                  {profile?.total_reviews || 0}
                </Text>
                <Text variant="caption" color="muted">
                  Reviews
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="h4" style={{ fontWeight: '700' }}>
                  {transactionCount}
                </Text>
                <Text variant="caption" color="muted">
                  Transactions
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <View key={section.title} style={{ marginBottom: theme.spacing.xl }}>
              <Text
                variant="h4"
                color="secondary"
                style={{
                  marginBottom: theme.spacing.md,
                  textTransform: 'uppercase',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                {section.title}
              </Text>

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
                {section.items.map((item, index) => (
                  <ListItem
                    key={item.title}
                    title={item.title}
                    description={item.subtitle}
                    rightIcon={item.icon}
                    badge={item.badge}
                    showChevron
                    onPress={item.onPress}
                    style={{
                      borderBottomWidth: index < section.items.length - 1 ? 1 : 0,
                      paddingVertical: theme.spacing.lg,
                    }}
                  />
                ))}
              </View>
            </View>
          ))}

          {/* App Info */}
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <Smartphone size={16} color={theme.colors.text.muted} />
              <Text variant="caption" color="muted">
                Sellar v1.0.0
              </Text>
            </View>
            <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
              Ghana&apos;s premier marketplace for buying and selling
            </Text>
          </View>

          {/* Sign Out Button */}
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Button
              variant="tertiary"
              onPress={handleSignOut}
              fullWidth
              icon={<LogOut size={18} color={theme.colors.error} />}
              style={{
                borderColor: theme.colors.error,
                paddingVertical: theme.spacing.lg,
              }}
            >
              Sign Out
            </Button>
          </View>
        </Container>
      </ScrollView>

        {/* Toast */}
        <Toast
          visible={showToast}
          message={toastMessage}
          variant="success"
          onHide={() => setShowToast(false)}
        />

        {/* Sign Out Confirmation Modal */}
        <AppModal
          visible={showSignOutModal}
          onClose={() => setShowSignOutModal(false)}
          title="Sign Out"
          position="center"
          size="md"
        >
          <View style={{ padding: theme.spacing.md }}>
            <Text variant="body" style={{ marginBottom: theme.spacing.xl, textAlign: 'center' }}>
              Are you sure you want to sign out?
            </Text>
            
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                variant="primary"
                onPress={confirmSignOut}
                fullWidth
              >
                Sign Out
              </Button>
              <Button
                variant="outline"
                onPress={() => setShowSignOutModal(false)}
                fullWidth
              >
                Cancel
              </Button>
            </View>
          </View>
        </AppModal>
    </View>
  );
}
