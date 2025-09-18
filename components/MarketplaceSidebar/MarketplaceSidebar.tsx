import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Animated, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  Avatar,
  Button,
  LoadingSkeleton,
  Badge,
  DarkThemeUserBadges,
} from '@/components';
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Star, 
  Heart,
  Award,
  Crown,
  Zap,
  Calendar,
  FileText,
  Coins,
  ChevronRight,
  Settings,
  Bell,
  LogOut,
  User,
  CreditCard,
  BarChart3,
  MessageSquare,
  Shield,
  HelpCircle,
  Store,
  Plus
} from 'lucide-react-native';

interface UserStats {
  listings_count: number;
  favorites_count: number;
  total_sales: number;
  total_purchases: number;
}

interface UserCredits {
  balance: number;
  lifetime_earned: number;
}

interface MarketplaceSidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(320, screenWidth * 0.85);

export function MarketplaceSidebar({ isVisible, onClose }: MarketplaceSidebarProps) {
  const { theme } = useTheme();
  const { user, signOut } = useAuthStore();
  const { profile } = useProfile();
  const { balance: creditBalance, lifetimeEarned, refreshCredits } = useMonetizationStore();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (isVisible) {
      fetchSidebarData();
      // Refresh credits when sidebar opens
      if (user && creditBalance === 0) {
        refreshCredits();
      }
      // Animate in
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate out
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, user, creditBalance, refreshCredits]);

  const fetchSidebarData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user marketplace stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('listings_count')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserStats({
          listings_count: profile.listings_count || 0,
          favorites_count: 0, // TODO: Implement favorites count
          total_sales: 0, // TODO: Implement sales count
          total_purchases: 0, // TODO: Implement purchases count
        });
      } else {
        // Set default stats if profile doesn't have marketplace columns yet
        setUserStats({
          listings_count: 0,
          favorites_count: 0,
          total_sales: 0,
          total_purchases: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
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
              onClose();
              router.replace('/(auth)/welcome');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: User,
      label: 'My Profile',
      count: null,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: Package,
      label: 'My Listings',
      count: userStats?.listings_count || 0,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: Heart,
      label: 'Favorites',
      count: userStats?.favorites_count || 0,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: ShoppingBag,
      label: 'My Orders',
      count: userStats?.total_purchases || 0,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: TrendingUp,
      label: 'Sales',
      count: userStats?.total_sales || 0,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      count: null,
      onPress: () => {
        onClose();
        router.push('/(tabs)/inbox');
      },
    },
    {
      icon: Bell,
      label: 'Notifications',
      count: null,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: CreditCard,
      label: 'Payments',
      count: null,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      count: null,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: Settings,
      label: 'Settings',
      count: null,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      count: null,
      onPress: () => {
        onClose();
        router.push('/(tabs)/more');
      },
    },
  ];

  if (!isVisible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: theme.colors.surface,
        zIndex: 1000,
        transform: [{ translateX: slideAnim }],
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        ...theme.shadows.lg,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View
          style={{
            backgroundColor: theme.colors.primary,
            paddingTop: theme.spacing.xl + 20, // Account for status bar
            paddingBottom: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
          }}
        >
          {/* Profile Info */}
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <Avatar
              source={profile?.avatar_url || user?.user_metadata?.avatar_url}
              name={profile?.full_name || `${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`}
              size="lg"
              style={{ marginBottom: theme.spacing.md }}
            />
            
            <Text
              variant="h3"
              style={{
                color: theme.colors.primaryForeground,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: theme.spacing.xs,
              }}
            >
              {profile?.full_name || `${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`.trim()}
            </Text>

            <View style={{ marginBottom: theme.spacing.sm, alignItems: 'center' }}>
              <DarkThemeUserBadges
                isBusinessUser={profile?.is_business_user}
                isVerified={profile?.is_verified}
                isBusinessVerified={profile?.is_business_verified}
              />
            </View>

            {/* Credits Display */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.primaryForeground + '20',
                borderRadius: theme.borderRadius.lg,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}
            >
              <Zap size={16} color={theme.colors.primaryForeground} />
              <Text
                variant="body"
                style={{
                  color: theme.colors.primaryForeground,
                  fontWeight: '600',
                  marginLeft: theme.spacing.xs,
                }}
              >
                {Math.floor(creditBalance)} Credits
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          {!loading && userStats && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                backgroundColor: theme.colors.primaryForeground + '10',
                borderRadius: theme.borderRadius.lg,
                paddingVertical: theme.spacing.md,
              }}
            >
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text variant="h4" color="primary" style={{ fontWeight: '700' }}>
                  {userStats.listings_count}
                </Text>
                <Text variant="caption" color="muted">Listings</Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text variant="h4" color="primary" style={{ fontWeight: '700' }}>
                  {userStats.total_sales}
                </Text>
                <Text variant="caption" color="muted">Sales</Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text variant="h4" color="primary" style={{ fontWeight: '700' }}>
                  {userStats.favorites_count}
                </Text>
                <Text variant="caption" color="muted">Favorites</Text>
              </View>
            </View>
          )}

          {loading && (
            <View style={{ alignItems: 'center' }}>
              <LoadingSkeleton
                width="100%"
                height={60}
                borderRadius={theme.borderRadius.lg}
              />
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={{ padding: theme.spacing.lg }}>
          <Text
            variant="h4"
            style={{
              fontWeight: '700',
              marginBottom: theme.spacing.md,
            }}
          >
            Quick Actions
          </Text>

          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                alignItems: 'center',
              }}
              onPress={() => {
                onClose();
                router.push('/(tabs)/create');
              }}
              activeOpacity={0.7}
            >
              <Plus size={20} color={theme.colors.primaryForeground} />
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.primaryForeground,
                  fontWeight: '600',
                  marginTop: theme.spacing.xs,
                }}
              >
                Sell Item
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: theme.colors.secondary,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.md,
                alignItems: 'center',
              }}
              onPress={() => {
                onClose();
                router.push('/(tabs)/home');
              }}
              activeOpacity={0.7}
            >
              <Store size={20} color={theme.colors.secondaryForeground} />
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.secondaryForeground,
                  fontWeight: '600',
                  marginTop: theme.spacing.xs,
                }}
              >
                Browse
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Text
            variant="h4"
            style={{
              fontWeight: '700',
              marginBottom: theme.spacing.md,
            }}
          >
            Marketplace
          </Text>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                marginBottom: theme.spacing.xs,
              }}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: theme.colors.primary + '10',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: theme.spacing.md,
                }}
              >
                <item.icon size={20} color={theme.colors.primary} />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '500' }}>
                  {item.label}
                </Text>
              </View>

              {item.count !== null && (
                <Badge
                  text={item.count.toString()}
                  variant="secondary"
                  style={{ marginRight: theme.spacing.sm }}
                />
              )}

              <ChevronRight size={16} color={theme.colors.text.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <View style={{ padding: theme.spacing.lg, marginTop: theme.spacing.lg }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.error + '10',
              borderRadius: theme.borderRadius.lg,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
            }}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={theme.colors.error} />
            <Text
              variant="body"
              style={{
                color: theme.colors.error,
                fontWeight: '600',
                marginLeft: theme.spacing.sm,
              }}
            >
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
