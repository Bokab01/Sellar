import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,

  Avatar,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PostCard,
  CommunitySidebar,
  SidebarToggle,
} from '@/components';
import { Plus, Users } from 'lucide-react-native';

export default function CommunityScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const { posts, loading, error, refreshing, refresh } = useCommunityPosts();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  // Handle follow/unfollow functionality
  const handleFollow = async (userId: string) => {
    try {
      // TODO: Implement actual follow API call
      setFollowingStates(prev => ({ ...prev, [userId]: true }));
      console.log('Following user:', userId);
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      // TODO: Implement actual unfollow API call
      setFollowingStates(prev => ({ ...prev, [userId]: false }));
      console.log('Unfollowed user:', userId);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  // Transform database posts to component format with enhanced features
  const transformedPosts = posts.map((post: any) => ({
    id: post.id,
    type: post.type || (post.listings ? 'listing' : 'general'), // Determine post type
    author: {
      id: post.profiles?.id,
      name: `${post.profiles?.first_name || 'User'} ${post.profiles?.last_name || ''}`,
      avatar: post.profiles?.avatar_url,
      rating: post.profiles?.rating_average || 0, // Use actual rating_average from database
      reviewCount: post.profiles?.rating_count || post.profiles?.total_reviews || 0, // Use actual review count
      isVerified: post.profiles?.is_verified,
      location: post.profiles?.location, // Use actual location from database
      profile: post.profiles, // Add the full profile object for UserDisplayName
    },
    timestamp: new Date(post.created_at || new Date()).toLocaleString(),
    content: post.content,
    images: post.images || [],
    likes: post.likes_count || 0,
    comments: post.comments_count || 0,
    shares: post.shares_count || 0,
    isLiked: false, // TODO: Check if current user liked this post
    location: post.location,
    listing: post.listings ? {
      id: post.listings.id,
      title: post.listings.title,
      price: post.listings.price,
      image: post.listings.images?.[0],
    } : undefined,
  }));


  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Community"
        leftAction={
          <SidebarToggle
            isOpen={sidebarVisible}
            onToggle={() => setSidebarVisible(!sidebarVisible)}
          />
        }
      />

      <View style={{ flex: 1 }}>
        {loading ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.lg,
            }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width="100%"
                height={200}
                borderRadius={theme.borderRadius.lg}
                style={{ marginBottom: theme.spacing.lg }}
              />
            ))}
          </ScrollView>
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={refresh}
          />
        ) : transformedPosts.length > 0 ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.sm,
              paddingBottom: theme.spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          >
            {/* Create Post Prompt */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/community/create-post')}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                padding: theme.spacing.lg,
                marginBottom: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                ...theme.shadows.sm,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Avatar 
                  source={profile?.avatar_url || user?.user_metadata?.avatar_url}
                  name={profile?.full_name || `${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`}
                  size="sm" 
                />
                <Text variant="body" color="muted" style={{ flex: 1 }}>
                  What&apos;s on your mind?
                </Text>
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.borderRadius.full,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}
                >
                  <Plus size={16} color={theme.colors.primaryForeground} />
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.primaryForeground,
                      fontWeight: '600',
                    }}
                  >
                    Post
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Posts Feed */}
            {transformedPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post}
                isFollowing={followingStates[post.author.id] || false}
                onLike={() => {
                  console.log('Liked post:', post.id);
                  // TODO: Implement like functionality
                }}
                onComment={() => router.push(`/(tabs)/community/${post.id}`)}
                onShare={() => {
                  console.log('Shared post:', post.id);
                  // TODO: Implement share functionality
                }}
                onFollow={() => handleFollow(post.author.id)}
                onUnfollow={() => handleUnfollow(post.author.id)}
                onReport={() => {
                  console.log('Reported post:', post.id);
                  // TODO: Implement report functionality
                }}
              />
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<Users size={64} color={theme.colors.text.muted} />}
            title="Welcome to the Community"
            description="Share your experiences, ask questions, and connect with other buyers and sellers."
            action={{
              text: 'Create First Post',
              onPress: () => router.push('/(tabs)/community/create-post'),
            }}
          />
        )}
      </View>

      {/* Sidebar Overlay */}
      {sidebarVisible && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
          onPress={() => setSidebarVisible(false)}
        />
      )}

      {/* Community Sidebar */}
      <CommunitySidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </SafeAreaWrapper>
  );
}
