import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { useMonetizationStore } from '@/store/useMonetizationStore';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Text } from '@/components/Typography/Text';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Badge } from '@/components/Badge/Badge';
import { CompactUserBadges } from '@/components/UserBadgeSystem';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import { 
  Users, 
  UserPlus2, 
  TrendingUp, 
  Star, 
  MessageCircle,
  Share,
  Award,
  Crown,
  Calendar,
  FileText,
  UserCheck,
  UserX,
  Coins,
  ChevronRight,
  Settings,
  Bell,
  ShieldCheck
} from 'lucide-react-native';


interface UserStats {
  followers_count: number;
  following_count: number;
  posts_count: number;
  listings_count: number;
}

interface UserCredits {
  balance: number;
  lifetime_earned: number;
}

interface TrendingUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_verified: boolean;
  followers_count: number;
  posts_count: number;
  rating?: number;
}

interface CommunitySidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(320, screenWidth * 0.85);

export function CommunitySidebar({ isVisible, onClose }: CommunitySidebarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const { balance: creditBalance, lifetimeEarned, refreshCredits } = useMonetizationStore();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  
  // Cache data to prevent unnecessary refetches
  const hasLoadedData = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 60000; // 1 minute cooldown

  // Reset cache when user changes
  useEffect(() => {
    hasLoadedData.current = false;
    lastFetchTime.current = 0;
  }, [user?.id]);

  useEffect(() => {
    if (isVisible) {
      // Smart data fetching - only fetch if needed
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      if (!hasLoadedData.current || timeSinceLastFetch > FETCH_COOLDOWN) {
        console.log('🔄 Sidebar: Fetching data', { hasLoadedData: hasLoadedData.current, timeSinceLastFetch });
        fetchSidebarData();
        lastFetchTime.current = now;
        hasLoadedData.current = true;
      } else {
        console.log('⏭️ Sidebar: Using cached data');
        setLoading(false);
      }
      
      // Refresh credits when sidebar opens (lightweight operation)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, user, creditBalance, refreshCredits]);

  const fetchSidebarData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch current user stats for counts
      if (user?.id) {
        // Calculate counts dynamically from related tables
        const [followersResult, followingResult, postsResult, listingsResult] = await Promise.allSettled([
          // Count followers
          supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', user.id),
          
          // Count following
          supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', user.id),
          
          // Count posts
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          
          // Count listings
          supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ]);

        const stats = {
          followers_count: followersResult.status === 'fulfilled' ? (followersResult.value.count || 0) : 0,
          following_count: followingResult.status === 'fulfilled' ? (followingResult.value.count || 0) : 0,
          posts_count: postsResult.status === 'fulfilled' ? (postsResult.value.count || 0) : 0,
          listings_count: listingsResult.status === 'fulfilled' ? (listingsResult.value.count || 0) : 0,
        };

        // Log any errors
        if (followersResult.status === 'rejected') console.error('Followers count error:', followersResult.reason);
        if (followingResult.status === 'rejected') console.error('Following count error:', followingResult.reason);
        if (postsResult.status === 'rejected') console.error('Posts count error:', postsResult.reason);
        if (listingsResult.status === 'rejected') console.error('Listings count error:', listingsResult.reason);

        console.log('Community sidebar stats:', stats);
        setUserStats(stats);
      }

      // Credits are now handled by the monetization store

      // Fetch trending users (most followers in last 30 days)
      const { data: trending } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          avatar_url,
          is_verified,
          followers_count,
          posts_count,
          rating
        `)
        .order('followers_count', { ascending: false })
        .limit(5);

      if (trending) {
        setTrendingUsers(trending);
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);


  const navigationItems = useMemo(() => [
    {
      icon: UserCheck,
      label: 'Following',
      count: userStats?.following_count || 0,
      onPress: () => {
        router.push('/(tabs)/community/following');
        onClose();
      }
    },
    {
      icon: Users,
      label: 'Followers',
      count: userStats?.followers_count || 0,
      onPress: () => {
        router.push('/(tabs)/community/followers');
        onClose();
      }
    },
    {
      icon: FileText,
      label: 'My Posts',
      count: userStats?.posts_count || 0,
      onPress: () => {
        router.push('/(tabs)/community/my-posts');
        onClose();
      }
    },
    {
      icon: Calendar,
      label: 'Community Events',
      onPress: () => {
        router.push('/(tabs)/community/events');
        onClose();
      }
    },
    {
      icon: TrendingUp,
      label: 'Trending Topics',
      onPress: () => {
        router.push('/(tabs)/community/trending');
        onClose();
      }
    },
    {
      icon: ShieldCheck,
      label: 'Community Guidelines',
      onPress: () => {
        router.push('/(tabs)/community/guidelines');
        onClose();
      }
    },
    {
      icon: Bell,
      label: 'Notifications',
      onPress: () => {
        try {
          router.push('/notifications');
          onClose();
        } catch (error) {
          Alert.alert('Coming Soon!', 'Notifications screen will be available in the next update.');
          onClose();
        }
      }
    },
    {
      icon: Settings,
      label: 'Settings',
      onPress: () => {
        try {
          router.push('/(tabs)/more/settings');
          onClose();
        } catch (error) {
          Alert.alert('Coming Soon!', 'Settings screen will be available in the next update.');
          onClose();
        }
      }
    }
  ], [userStats, onClose]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: theme.colors.background,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        zIndex: 1000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        transform: [{ translateX: slideAnim }],
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="h3" style={{ fontWeight: '600' }}>Community</Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.background,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text variant="body" color="muted">✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Stats Section */}
        {user && (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Avatar
                source={profile?.avatar_url || user.user_metadata?.avatar_url}
                name={`${profile?.first_name || user.user_metadata?.first_name || 'User'} ${profile?.last_name || user.user_metadata?.last_name || ''}`}
                size="md"
              />
              <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                {/* Name - First line (with business name if configured) */}
                <View style={{ marginBottom: 2 }}>
                  <UserDisplayName
                    profile={profile}
                    variant="full"
                    showBadge={false}
                    textVariant="body"
                    style={{ fontWeight: '600' }}
                  />
                </View>
                
                {/* Badges row - Below name, aligned to start */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs, flexWrap: 'wrap' }}>
                  <CompactUserBadges
                    isSellarPro={(profile as any)?.is_sellar_pro}
                    isBusinessUser={profile?.is_business}
                    isVerified={profile?.is_verified}
                    isBusinessVerified={false}
                  />
                </View>
                
                <Text variant="caption" color="muted">Your Profile</Text>
              </View>
            </View>

            {loading ? (
              <View style={{ gap: theme.spacing.sm }}>
                <LoadingSkeleton width="100%" height={20} />
                <LoadingSkeleton width="80%" height={20} />
                <LoadingSkeleton width="60%" height={16} />
              </View>
            ) : (
              <View style={{ gap: theme.spacing.md }}>
                {/* Credits Section */}
                <View
                  style={{
                    backgroundColor: theme.colors.primary + '10',
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: theme.colors.primary + '20',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                    <Coins size={16} color={theme.colors.primary} />
                    <Text variant="caption" style={{ marginLeft: theme.spacing.xs, fontWeight: '600' }}>
                      Available Credits
                    </Text>
                  </View>
                  <Text variant="h3" color="primary" style={{ fontWeight: '700' }}>
                    {(creditBalance || 0).toLocaleString()}
                  </Text>
                  <Text variant="caption" color="muted">
                    Lifetime earned: {(lifetimeEarned || 0).toLocaleString()}
                  </Text>
                </View>

              </View>
            )}
          </View>
        )}

        {/* Navigation Menu */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="body" style={{ marginBottom: theme.spacing.md, fontWeight: '600' }}>
            Community
          </Text>
          <View style={{ gap: theme.spacing.xs }}>
            {navigationItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={item.onPress}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.background,
                  }}
                  activeOpacity={0.7}
                >
                  <IconComponent size={20} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                    {item.label}
                  </Text>
                  {item.count !== undefined && (
                    <Badge
                      text={item.count.toString()}
                      variant="info"
                      style={{ marginRight: theme.spacing.sm, borderRadius: theme.borderRadius.full, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
                    />
                  )}
                  <ChevronRight size={16} color={theme.colors.text.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Trending Users */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <TrendingUp size={20} color={theme.colors.primary} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
              Trending Users
            </Text>
          </View>

          {loading ? (
            <View style={{ gap: theme.spacing.md }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <LoadingSkeleton width={40} height={40} borderRadius={20} />
                  <View style={{ flex: 1, gap: theme.spacing.xs }}>
                    <LoadingSkeleton width="70%" height={16} />
                    <LoadingSkeleton width="50%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {trendingUsers.map((trendingUser, index) => (
                <View
                  key={trendingUser.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: theme.spacing.md,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.background,
                  }}
                >
                  <View style={{ position: 'relative' }}>
                    <Avatar
                      source={trendingUser.avatar_url}
                      name={`${trendingUser.first_name} ${trendingUser.last_name}`}
                      size="sm"
                    />
                    {index < 3 && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                          borderRadius: theme.borderRadius.full,
                          width: 16,
                          height: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Crown size={10} color="#FFF" />
                      </View>
                    )}
                  </View>
                  
                  <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="caption" style={{ fontWeight: '600' }}>
                        {trendingUser.first_name} {trendingUser.last_name}
                      </Text>
                      {trendingUser.is_verified && (
                        <Badge
                          text="✓"
                          variant="success"
                          style={{ marginLeft: theme.spacing.xs }}
                        />
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                      <Users size={12} color={theme.colors.text.muted} />
                      <Text variant="caption" color="muted">
                        {trendingUser.followers_count} followers
                      </Text>
                      <Text variant="caption" color="muted">•</Text>
                      <MessageCircle size={12} color={theme.colors.text.muted} />
                      <Text variant="caption" color="muted">
                        {trendingUser.posts_count} posts
                      </Text>
                    </View>
                  </View>
                  
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </Animated.View>
  );
}
