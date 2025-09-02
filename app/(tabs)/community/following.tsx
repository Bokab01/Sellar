import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
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

  useEffect(() => {
    fetchFollowing();
  }, [user]);

  const fetchFollowing = async () => {
    if (!user?.id) return;

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
        console.log('RPC function not available, using direct query');
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
  };

  const handleUnfollow = async (userId: string) => {
    try {
      // Try RPC function first
      try {
        const { data } = await supabase.rpc('unfollow_user', { target_user_id: userId });
        
        if (data?.success) {
          // Remove from local state
          setFollowing(prev => prev.filter(user => user.id !== userId));
          return;
        }
      } catch (rpcError: any) {
        if (!rpcError.message.includes('Could not find the function')) {
          throw rpcError;
        }
        console.log('RPC function not available, using direct delete');
      }

      // Fallback to direct delete if RPC doesn't exist
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user?.id)
        .eq('following_id', userId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setFollowing(prev => prev.filter(user => user.id !== userId));
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      if (error.message.includes('relation "follows" does not exist')) {
        alert('Social features not yet enabled. Please apply the database migration.');
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFollowing();
  };

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
              padding: theme.spacing.lg,
            }}
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
                <LoadingSkeleton width={80} height={32} borderRadius={16} />
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
              padding: theme.spacing.lg,
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
                    {followingUser.followers_count} followers • Following since {new Date(followingUser.followed_at).toLocaleDateString()}
                  </Text>
                </View>
                
                <Button
                  variant="outline"
                  size="sm"
                  icon={<UserMinus size={16} color={theme.colors.error} />}
                  onPress={() => handleUnfollow(followingUser.id)}
                  style={{ borderColor: theme.colors.error }}
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
