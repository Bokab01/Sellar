import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
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
import { Users, UserPlus2, UserCheck } from 'lucide-react-native';

interface Follower {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  followed_at: string;
  is_following_back: boolean;
}

export default function FollowersScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  
  // Cache data to prevent unnecessary refetches
  const hasLoadedData = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cooldown

  const fetchFollowers = useCallback(async (forceRefresh = false) => {
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
        const { data, error: fetchError } = await supabase.rpc('get_user_followers', {
          target_user_id: user.id,
          page_limit: 50,
          page_offset: 0
        });

        if (fetchError && !fetchError.message.includes('Could not find the function')) {
          throw fetchError;
        }

        if (data) {
          const followersData = data || [];
          setFollowers(followersData);
          
          // Initialize following states
          const states: Record<string, boolean> = {};
          followersData.forEach((follower: Follower) => {
            states[follower.id] = follower.is_following_back;
          });
          setFollowingStates(states);
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
          follower_id,
          created_at,
          profiles:follower_id (
            id,
            first_name,
            last_name,
            avatar_url,
            is_verified,
            followers_count,
            following_count
          )
        `)
        .eq('following_id', user.id)
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
        is_following_back: false, // TODO: Check if following back when RPC is available
      }));

      setFollowers(transformedData);
      
      // Initialize following states
      const states: Record<string, boolean> = {};
      transformedData.forEach((follower: Follower) => {
        states[follower.id] = follower.is_following_back;
      });
      setFollowingStates(states);
      
      hasLoadedData.current = true;
      lastFetchTime.current = now;
    } catch (err: any) {
      console.error('Error fetching followers:', err);
      if (err.message.includes('relation "follows" does not exist')) {
        setError('Social features not yet enabled. Please apply the database migration.');
      } else {
        setError(err.message || 'Failed to load followers list');
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
    fetchFollowers();
  }, [fetchFollowers]);

  // Smart focus effect - only refresh if needed
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      if (!hasLoadedData.current || timeSinceLastFetch > FETCH_COOLDOWN) {
        fetchFollowers();
      } else {
      }
    }, [fetchFollowers])
  );

  const handleFollowToggle = async (userId: string) => {
    const isCurrentlyFollowing = followingStates[userId];
    
    try {
      // Try RPC function first
      try {
        const { data } = await supabase.rpc(
          isCurrentlyFollowing ? 'unfollow_user' : 'follow_user',
          { target_user_id: userId }
        );
        
        if (data?.success) {
          setFollowingStates(prev => ({
            ...prev,
            [userId]: !isCurrentlyFollowing
          }));
          return;
        }
      } catch (rpcError: any) {
        if (!rpcError.message.includes('Could not find the function')) {
          throw rpcError;
        }
      }

      // Fallback to direct database operations
      if (isCurrentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user?.id)
          .eq('following_id', userId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user?.id,
            following_id: userId
          });

        if (error) {
          if (error.code === '23505') {
            // Already following, just update state - this is not an error
          } else {
            throw error;
          }
        }
      }

      setFollowingStates(prev => ({
        ...prev,
        [userId]: !isCurrentlyFollowing
      }));
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      if (error.message.includes('relation "follows" does not exist')) {
        alert('Social features not yet enabled. Please apply the database migration.');
      }
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFollowers(true); // Force refresh
  }, [fetchFollowers]);

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Followers"
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
            onRetry={fetchFollowers}
          />
        ) : followers.length > 0 ? (
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
            {followers.map((follower) => (
              <View
                key={follower.id}
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
                  source={follower.avatar_url}
                  name={`${follower.first_name} ${follower.last_name}`}
                  size="md"
                />
                
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text variant="body" weight="semibold">
                      {follower.first_name} {follower.last_name}
                    </Text>
                    {follower.is_verified && (
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
                  </View>
                  <Text variant="caption" color="muted">
                    Followed you on {new Date(follower.followed_at).toLocaleDateString()}
                  </Text>
                </View>
                
                <Button
                  variant={followingStates[follower.id] ? "tertiary" : "primary"}
                  size="sm"
                  icon={
                    followingStates[follower.id] ? 
                      <UserCheck size={12} color={theme.colors.primary} /> :
                      <UserPlus2 size={12} color="#FFF" />
                  }
                  onPress={() => handleFollowToggle(follower.id)}
                  style={{ 
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                    minHeight: 28
                  }}
                >
                  {followingStates[follower.id] ? 'Following' : 'Follow Back'}
                </Button>
              </View>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<Users size={64} color={theme.colors.text.muted} />}
            title="No Followers Yet"
            description="Share interesting content and engage with the community to gain followers!"
            action={{
              text: 'Create a Post',
              onPress: () => router.push('/(tabs)/community/create-post'),
            }}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
