import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Pressable, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { useAppResume } from '@/hooks/useAppResume';
import { router, useFocusEffect } from 'expo-router';
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
  const { posts, loading, error, refreshing, refresh, updatePost, deletePost } = useCommunityPosts();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  // App resume handling - refresh posts when app comes back from background
  const { isRefreshing, isReconnecting } = useAppResume({
    onResume: async () => {
      console.log('📱 Community screen: App resumed, refreshing posts...');
      await refresh();
    },
    debug: true,
  });

  // Refresh posts when screen comes into focus (e.g., after navigating back from post detail)
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

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

  // Handle edit post
  const handleEditPost = (postId: string) => {
    console.log('Attempting to edit post with ID:', postId, typeof postId);
    
    if (!postId || postId === 'unknown' || postId === 'undefined') {
      console.error('Invalid post ID for editing:', postId);
      Alert.alert('Error', 'Cannot edit post: Invalid post ID');
      return;
    }
    
    router.push(`/(tabs)/community/edit-post/${postId}`);
  };

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    console.log('Attempting to delete post with ID:', postId, typeof postId);
    
    if (!postId || postId === 'unknown' || postId === 'undefined') {
      console.error('Invalid post ID for deletion:', postId);
      Alert.alert('Error', 'Cannot delete post: Invalid post ID');
      return;
    }
    
    try {
      const { error } = await deletePost(postId);
      if (error) {
        console.error('Error deleting post:', error);
        Alert.alert('Error', `Failed to delete post: ${error}`);
      } else {
        Alert.alert('Success', 'Post deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  // Transform database posts to component format with enhanced features
  const transformedPosts = posts.map((post: any) => {
    // Safety check for post data
    if (!post || typeof post !== 'object') {
      console.warn('Invalid post data:', post);
      return null;
    }

    const transformedPost = {
      id: post.id || 'unknown',
      type: post.type || (post.listings ? 'listing' : 'general'),
      user_id: post.user_id, // Preserve the original user_id for ownership checks
      author: {
        id: post.profiles?.id || 'unknown',
        name: (() => {
          const firstName = post.profiles?.first_name || '';
          const lastName = post.profiles?.last_name || '';
          if (firstName && lastName) {
            return `${firstName} ${lastName}`.trim();
          } else if (firstName) {
            return firstName.trim();
          } else if (lastName) {
            return lastName.trim();
          } else {
            return 'User';
          }
        })(),
        avatar: post.profiles?.avatar_url || null,
        rating: Number(post.profiles?.rating) || 0,
        reviewCount: Number(post.profiles?.rating_count || post.profiles?.total_reviews) || 0,
        isVerified: Boolean(post.profiles?.is_verified),
        location: post.profiles?.location || null,
        profile: post.profiles || null,
      },
      timestamp: new Date(post.created_at || new Date()).toLocaleString(),
      content: post.content || '',
      images: Array.isArray(post.images) ? post.images : [],
      likes: Number(post.likes_count) || 0,
      comments: Number(post.comments_count) || 0,
      shares: Number(post.shares_count) || 0,
      isLiked: false,
      location: post.location || null,
      listing: post.listings ? {
        id: post.listings.id || 'unknown',
        title: post.listings.title || 'Untitled',
        price: Number(post.listings.price) || 0,
        image: post.listings.images?.[0] || null,
      } : undefined,
    };

    // Debug log for posts with invalid IDs
    if (!post.id || post.id === 'unknown') {
      console.warn('Post with invalid ID detected:', { 
        originalId: post.id, 
        transformedId: transformedPost.id,
        postData: post 
      });
    }

    return transformedPost;
  }).filter(Boolean); // Remove any null entries


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
            {transformedPosts.map((post) => {
              if (!post) return null;
              return (
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
                  onEdit={() => handleEditPost(post.id)}
                  onDelete={() => handleDeletePost(post.id)}
                  onFollow={() => handleFollow(post.author.id)}
                  onUnfollow={() => handleUnfollow(post.author.id)}
                  onReport={() => {
                    console.log('Reported post:', post.id);
                    // TODO: Implement report functionality
                  }}
                />
              );
            })}
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
