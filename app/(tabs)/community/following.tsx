import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useFollowState } from '@/hooks/useFollowState';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '@/components';
import { Users, UserMinus } from 'lucide-react-native';

interface FollowingUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  followed_at: string;
  is_mutual: boolean;
}

export default function FollowingScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { unfollowUser } = useFollowState();
  
  // Cache data to prevent unnecessary refetches
  const hasLoadedData = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cooldown

  const fetchFollowing = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    // Smart caching - only fetch if needed
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    if (!forceRefresh && hasLoadedData.current && timeSinceLastFetch < FETCH_COOLDOWN) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      
      // Try to use RPC function first
      try {
        const { data, error: fetchError } = await supabase.rpc('get_user_following', {
          target_user_id: user.id,
          page_limit: 50,
          page_offset: 0
        });

        if (fetchError && !fetchError.message.includes('Could not find the function')) {
          throw fetchError;
        }

        if (data) {
          setFollowing(data);
          return;
        }
      } catch (rpcError: any) {
        if (!rpcError.message.includes('Could not find the function')) {
          throw rpcError;
        }
      }

      // Fallback to direct query if RPC doesn't exist
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select(`
          following_id,
          created_at,
          profiles:following_id (
            id,
            first_name,
            last_name,
            avatar_url,
            is_verified,
            followers_count,
            following_count
          )
        `)
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (followsError) {
        throw followsError;
      }

      // Transform data to match expected format
      const transformedData = (followsData || []).map((follow: any) => ({
        id: follow.profiles.id,
        first_name: follow.profiles.first_name,
        last_name: follow.profiles.last_name,
        avatar_url: follow.profiles.avatar_url,
        is_verified: follow.profiles.is_verified || false,
        followers_count: follow.profiles.followers_count || 0,
        following_count: follow.profiles.following_count || 0,
        followed_at: follow.created_at,
        is_mutual: false, // TODO: Check if mutual when RPC is available
      }));

      setFollowing(transformedData);
      hasLoadedData.current = true;
      lastFetchTime.current = now;
    } catch (err: any) {
      console.error('Error fetching following:', err);
      if (err.message.includes('relation "follows" does not exist')) {
        setError('Social features not yet enabled. Please apply the database migration.');
      } else {
        setError(err.message || 'Failed to load following list');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Reset cache when user changes
  useEffect(() => {
    hasLoadedData.current = false;
    lastFetchTime.current = 0;
  }, [user?.id]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  // Smart focus effect - only refresh if needed
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      if (!hasLoadedData.current || timeSinceLastFetch > FETCH_COOLDOWN) {
        fetchFollowing();
      } else {
      }
    }, [fetchFollowing])
  );

  const handleUnfollow = async (userId: string) => {
    const success = await unfollowUser(userId);
    if (success) {
      // Remove from local state only if the global unfollow was successful
      setFollowing(prev => prev.filter(user => user.id !== userId));
    } else {
      alert('Failed to unfollow user. Please try again.');
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFollowing(true); // Force refresh
  }, [fetchFollowing]);

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Following"
        showBackButton
        onBackPress={() => router.back()}
      />

      <View style={{ flex: 1 }}>
        {loading ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.sm,
            }}
            removeClippedSubviews={true}
            scrollEventThrottle={32}
            decelerationRate="fast"
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: theme.spacing.lg,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  marginBottom: theme.spacing.md,
                  gap: theme.spacing.md,
                }}
              >
                <LoadingSkeleton width={50} height={50} borderRadius={25} />
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <LoadingSkeleton width="70%" height={16} />
                  <LoadingSkeleton width="50%" height={12} />
                </View>
                <LoadingSkeleton width={70} height={28} borderRadius={14} />
              </View>
            ))}
          </ScrollView>
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={fetchFollowing}
          />
        ) : following.length > 0 ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.sm,
              paddingBottom: theme.spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            removeClippedSubviews={true}
            scrollEventThrottle={32}
            decelerationRate="fast"
          >
            {following.map((followingUser) => (
              <View
                key={followingUser.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: theme.spacing.lg,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  marginBottom: theme.spacing.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Avatar
                  source={followingUser.avatar_url}
                  name={`${followingUser.first_name} ${followingUser.last_name}`}
                  size="md"
                />
                
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text variant="body" weight="semibold">
                      {followingUser.first_name} {followingUser.last_name}
                    </Text>
                    {followingUser.is_verified && (
                      <View
                        style={{
                          marginLeft: theme.spacing.xs,
                          backgroundColor: theme.colors.success,
                          borderRadius: theme.borderRadius.full,
                          width: 16,
                          height: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text variant="caption" style={{ color: '#FFF', fontSize: 10 }}>
                          ✓
                        </Text>
                      </View>
                    )}
                    {followingUser.is_mutual && (
                      <View
                        style={{
                          marginLeft: theme.spacing.xs,
                          backgroundColor: theme.colors.primary + '20',
                          borderRadius: theme.borderRadius.sm,
                          paddingHorizontal: theme.spacing.xs,
                          paddingVertical: 2,
                        }}
                      >
                        <Text variant="caption" color="primary" style={{ fontSize: 10 }}>
                          Mutual
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text variant="caption" color="muted">
                    Following since {new Date(followingUser.followed_at).toLocaleDateString()}
                  </Text>
                </View>
                
                <Button
                  variant="tertiary"
                  size="sm"
                  icon={<UserMinus size={12} color={theme.colors.error} />}
                  onPress={() => handleUnfollow(followingUser.id)}
                  style={{ 
                    borderColor: theme.colors.error,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    minHeight: 28
                  }}
                >
                  <Text style={{ color: theme.colors.error }}>Unfollow</Text>
                </Button>
              </View>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<Users size={64} color={theme.colors.text.muted} />}
            title="No Following Yet"
            description="Start following other users to see them here. Discover interesting people in the community!"
            action={{
              text: 'Explore Community',
              onPress: () => router.push('/(tabs)/community'),
            }}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
