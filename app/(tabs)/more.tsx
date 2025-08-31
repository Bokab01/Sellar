import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useMonetizationStore } from '@/store/useMonetizationStore';
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
  UserPlus, 
  LogOut, 
  Shield,
  Bell,
  Heart,
  FileText,
  Award,
  Smartphone
} from 'lucide-react-native';

export default function MoreScreen() {
  const { theme } = useTheme();
  const { user, signOut } = useAuthStore();
  const { balance, currentPlan, refreshCredits, refreshSubscription } = useMonetizationStore();
  
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserData();
      refreshCredits();
      refreshSubscription();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await dbHelpers.getProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch recent transactions
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (transactionData) {
        setTransactions(transactionData);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
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
            await signOut();
            setToastMessage('Signed out successfully');
            setShowToast(true);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="More" />
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
  const fullName = `${firstName} ${lastName}`.trim();
  const walletBalance = profile?.wallet_balance || 0;
  const creditBalance = profile?.credit_balance || 0;
  const totalBalance = walletBalance + creditBalance;

  const menuSections = [
    {
      title: 'Account',
      items: [
        {
          title: 'My Profile',
          subtitle: 'View and edit your profile information',
          icon: <User size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push(`/(tabs)/profile/${user?.id}`),
        },
        {
          title: 'Wallet & Credit',
          subtitle: `${balance} credits • GHS ${totalBalance.toFixed(2)} wallet`,
          icon: <Wallet size={20} color={theme.colors.success} />,
          badge: balance > 0 ? { text: `${balance}`, variant: 'success' as const } : undefined,
          onPress: () => router.push('/(tabs)/wallet'),
        },
        {
          title: 'Buy Credits',
          subtitle: 'Purchase credits for premium features',
          icon: <ShoppingCart size={20} color={theme.colors.primary} />,
          onPress: () => router.push('/(tabs)/buy-credits'),
        },
        {
          title: 'Business Plans',
          subtitle: currentPlan ? `${currentPlan.subscription_plans?.name} Plan` : 'Unlock business features',
          icon: <Building size={20} color={theme.colors.primary} />,
          badge: currentPlan ? { text: 'Active', variant: 'success' as const } : undefined,
          onPress: () => router.push('/(tabs)/subscription-plans'),
        },
        {
          title: 'Feature Marketplace',
          subtitle: 'Boost your listings and unlock tools',
          icon: <Zap size={20} color={theme.colors.warning} />,
          onPress: () => router.push('/(tabs)/feature-marketplace'),
        },
        {
          title: 'Verification',
          subtitle: getVerificationSubtitle(),
          icon: <Shield size={20} color={getVerificationColor()} />,
          badge: getVerificationBadge(),
          onPress: () => router.push('/(tabs)/verification'),
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
          onPress: () => router.push('/(tabs)/my-listings'),
        },
        {
          title: 'Reviews & Ratings',
          subtitle: `${profile?.total_reviews || 0} reviews • ${(profile?.rating || 0).toFixed(1)} rating`,
          icon: <Star size={20} color={theme.colors.warning} />,
          onPress: () => router.push('/(tabs)/reviews'),
        },
        {
          title: 'Transaction History',
          subtitle: `${transactions.length} recent transactions`,
          icon: <CreditCard size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/(tabs)/transactions'),
        },
        {
          title: 'Favorites',
          subtitle: 'Your saved listings and searches',
          icon: <Heart size={20} color={theme.colors.error} />,
          onPress: () => router.push('/(tabs)/favorites'),
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
          onPress: () => router.push('/(tabs)/settings'),
        },
        {
          title: 'Notifications',
          subtitle: 'Manage your notification preferences',
          icon: <Bell size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/(tabs)/notifications'),
        },
        {
          title: 'Help & Support',
          subtitle: 'FAQ, contact support, and app guides',
          icon: <HelpCircle size={20} color={theme.colors.text.primary} />,
          onPress: () => router.push('/(tabs)/help'),
        },
        {
          title: 'Invite Friends',
          subtitle: 'Share Sellar and earn rewards',
          icon: <UserPlus size={20} color={theme.colors.primary} />,
          badge: { text: 'Earn GHS 10', variant: 'success' as const },
          onPress: () => router.push('/(tabs)/invite'),
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
      <AppHeader title="More" />

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Container>
          {/* User Profile Header */}
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
                  <Text variant="h3" style={{ fontWeight: '600' }}>
                    {fullName}
                  </Text>
                  {profile?.is_verified && (
                    <Badge text="Verified" variant="success" size="sm" />
                  )}
                </View>
                
                <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                  {user?.email}
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
                  <PriceDisplay
                    amount={totalBalance}
                    size="md"
                    currency="GHS"
                  />
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
              Ghana's premier marketplace for buying and selling
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
              <Text style={{ color: theme.colors.error, fontWeight: '600' }}>Sign Out</Text>
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