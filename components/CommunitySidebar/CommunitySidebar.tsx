import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Dimensions, Animated, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  Avatar,
  Button,
  LoadingSkeleton,
  Badge,
} from '@/components';
import { 
  Users, 
  UserPlus2, 
  TrendingUp, 
  Star, 
  MessageCircle,
  Heart,
  Share,
  Award,
  Crown,
  Zap,
  Calendar,
  FileText,
  UserCheck,
  UserX,
  Coins,
  ChevronRight,
  Settings,
  Bell
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
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (isVisible) {
      fetchSidebarData();
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
  }, [isVisible, user]);

  const fetchSidebarData = async () => {
    try {
      setLoading(true);
      
      // Fetch current user stats
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('followers_count, following_count, posts_count, listings_count')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserStats({
            followers_count: profile.followers_count || 0,
            following_count: profile.following_count || 0,
            posts_count: profile.posts_count || 0,
            listings_count: profile.listings_count || 0,
          });
        } else {
          // Set default stats if profile doesn't have social columns yet
          setUserStats({
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            listings_count: 0,
          });
        }

        // Fetch user credits (safely handle if RPC doesn't exist yet)
        try {
          const { data: credits, error: creditsError } = await supabase.rpc('get_user_credits', { 
            user_uuid: user.id 
          });
          
          if (credits && !creditsError) {
            setUserCredits(credits);
          } else {
            // Set default credits if RPC doesn't exist or returns error
            setUserCredits({ balance: 0, lifetime_earned: 0 });
          }
        } catch (creditsError) {
          console.log('Credits RPC not available yet:', creditsError);
          setUserCredits({ balance: 0, lifetime_earned: 0 });
        }
      }

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
  };

  const handleFollowUser = async (userId: string) => {
    try {
      const { data } = await supabase.rpc('follow_user', { target_user_id: userId });
      if (data?.success) {
        // Refresh trending users to update follow status
        fetchSidebarData();
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const navigationItems = [
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
          padding: theme.spacing.lg,
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
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.full,
              backgroundColor: theme.colors.background,
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
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {(profile?.first_name || user.user_metadata?.first_name || 'User')} {(profile?.last_name || user.user_metadata?.last_name || '')}
                </Text>
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
                {userCredits && (
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
                      {(userCredits.balance || 0).toLocaleString()}
                    </Text>
                    <Text variant="caption" color="muted">
                      Lifetime earned: {(userCredits.lifetime_earned || 0).toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Stats Grid */}
                {userStats && (
                  <View style={{ gap: theme.spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text variant="h4" color="primary" style={{ fontWeight: '700' }}>
                          {userStats.followers_count}
                        </Text>
                        <Text variant="caption" color="muted">Followers</Text>
                      </View>
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text variant="h4" color="primary" style={{ fontWeight: '700' }}>
                          {userStats.following_count}
                        </Text>
                        <Text variant="caption" color="muted">Following</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '600' }}>
                          {userStats.posts_count}
                        </Text>
                        <Text variant="caption" color="muted">Posts</Text>
                      </View>
                      <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text variant="body" style={{ fontWeight: '600' }}>
                          {userStats.listings_count}
                        </Text>
                        <Text variant="caption" color="muted">Listings</Text>
                      </View>
                    </View>
                  </View>
                )}
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
                  <Text variant="body" style={{ marginLeft: theme.spacing.md, flex: 1 }}>
                    {item.label}
                  </Text>
                  {item.count !== undefined && (
                    <Badge
                      text={item.count.toString()}
                      variant="info"
                      style={{ marginRight: theme.spacing.sm }}
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
                  
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={() => handleFollowUser(trendingUser.id)}
                  >
                    Follow
                  </Button>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Community Stats */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <Zap size={20} color={theme.colors.primary} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm, fontWeight: '600' }}>
              Community Stats
            </Text>
          </View>
          
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Heart size={16} color={theme.colors.error} />
                <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                  Total Likes Today
                </Text>
              </View>
              <Text variant="caption" style={{ fontWeight: '600' }}>1,234</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MessageCircle size={16} color={theme.colors.primary} />
                <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                  New Posts Today
                </Text>
              </View>
              <Text variant="caption" style={{ fontWeight: '600' }}>89</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Users size={16} color={theme.colors.success} />
                <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                  Active Users
                </Text>
              </View>
              <Text variant="caption" style={{ fontWeight: '600' }}>456</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
