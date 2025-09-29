import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
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
} from '@/components';
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
  const transactions = useMonetizationStore(state => state.transactions);
  const refreshCredits = useMonetizationStore(state => state.refreshCredits);
  const refreshSubscription = useMonetizationStore(state => state.refreshSubscription);
  const hasBusinessPlan = useMonetizationStore(state => state.hasBusinessPlan);

  // Debug: Track what's changing
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  
  React.useEffect(() => {
    console.log(`MoreScreen render #${renderCount.current}`, {
      balance,
      currentPlan: currentPlan?.id,
      themeColors: theme.colors.primary,
      userId: user?.id,
    });
  });

  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserData();
      // Refresh credits if balance is 0 (likely not loaded yet)
      if (balance === 0) {
        refreshCredits();
      }
      refreshSubscription();
    }
  }, [user, balance, refreshCredits, refreshSubscription]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchUserData();
        refreshCredits(); // This will update the transaction count
      }
    }, [user, refreshCredits])
  );

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await dbHelpers.getProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserData(),
      refreshCredits(),
      refreshSubscription()
    ]);
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              
              // Navigate to auth screen immediately
              router.replace('/(auth)/onboarding');
            } catch (error) {
              console.error('Sign out error:', error);
              // Still navigate even if sign out fails
              router.replace('/(auth)/onboarding');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.xl }} />
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} width="100%" height={200} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  const firstName = user?.user_metadata?.first_name || profile?.first_name || 'User';
  const lastName = user?.user_metadata?.last_name || profile?.last_name || '';
  const fullName = `${firstName || 'User'} ${lastName || ''}`.trim() || 'User';
  const walletBalance = profile?.wallet_balance || 0;
  const creditBalance = balance; // Use monetization store balance

  const menuSections = [
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
       /*  {
          title: 'Business Plans',
          subtitle: currentPlan ? `${currentPlan.subscription_plans?.name} Plan` : 'Unlock business features',
          icon: <Building size={20} color={theme.colors.primary} />,
          badge: currentPlan ? { text: 'Active', variant: 'success' as const } : undefined,
          onPress: () => router.push('/subscription-plans'),
        },
        {
          title: 'Dashboard',
          subtitle: hasBusinessPlan() ? 'Business analytics and management' : 'Unlock with business plan',
          icon: <BarChart3 size={20} color={theme.colors.primary} />,
          badge: hasBusinessPlan() ? { text: 'Business', variant: 'success' as const } : undefined,
          onPress: () => router.push('/(tabs)/more/dashboard'),
        }, */
        {
          title: 'Feature Marketplace',
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
          title: 'Reviews & Ratings',
          subtitle: `${profile?.total_reviews || 0} reviews • ${(profile?.rating || 0).toFixed(1)} rating`,
          icon: <Star size={20} color={theme.colors.warning} />,
          onPress: () => router.push('/reviews'),
        },
        {
          title: 'Transaction History',
          subtitle: `${transactions.length} recent transactions`,
          icon: <CreditCard size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/transactions'),
        },
      ],
    },
    {
      title: 'App & Support',
      items: [
       /*  {
          title: 'Settings',
          subtitle: 'App preferences, privacy, and notifications',
          icon: <Settings size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/(tabs)/more/settings'),
        }, */
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
          badge: { text: 'Earn GHS 10', variant: 'success' as const },
          onPress: () => router.push('/invite'),
        },
      ],
    },
  ];

  function getVerificationSubtitle() {
    switch (profile?.verification_status) {
      case 'verified': return 'Account verified ✓';
      case 'pending': return 'Verification in progress...';
      case 'rejected': return 'Verification failed - retry available';
      default: return 'Verify your account for more features';
    }
  }

  function getVerificationColor() {
    switch (profile?.verification_status) {
      case 'verified': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.text.muted;
    }
  }

  function getVerificationBadge() {
    switch (profile?.verification_status) {
      case 'verified': return { text: 'Verified', variant: 'success' as const };
      case 'pending': return { text: 'Pending', variant: 'warning' as const };
      case 'rejected': return { text: 'Failed', variant: 'error' as const };
      default: return undefined;
    }
  }

  return (
    <SafeAreaWrapper>

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: contentBottomPadding }}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs, flexWrap: 'wrap' }}>
                  <Text variant="h3" style={{ fontWeight: '600' }}>
                    {fullName}
                  </Text>
                  <CompactUserBadges
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
                  {transactions.length}
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
    </SafeAreaWrapper>
  );
}
