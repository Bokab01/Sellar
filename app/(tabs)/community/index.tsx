import React, { useState, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Pressable, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { useAppResume } from '@/hooks/useAppResume';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useFollowState } from '@/hooks/useFollowState';
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
  CommunityFilters,
} from '@/components';
import { Plus, Users, ChevronUp } from 'lucide-react-native';

export default function CommunityScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Scroll-to-top FAB state
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  const scrollToTopScale = useRef(new Animated.Value(0.8)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [filters, setFilters] = useState<{ postType: string | null; location: string | null }>({
    postType: null,
    location: null,
  });
  const { posts, loading, error, refreshing, refresh, updatePost, deletePost } = useCommunityPosts(filters);
  const { followingStates, followUser, unfollowUser, isFollowing, refreshAllFollowStates } = useFollowState();

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Handle scroll for FAB visibility
  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    
    // Show/hide scroll-to-top FAB
    if (currentScrollY > 300) {
      if (!showScrollToTop) {
        setShowScrollToTop(true);
        Animated.parallel([
          Animated.timing(scrollToTopOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scrollToTopScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
      }
    } else {
      if (showScrollToTop) {
        setShowScrollToTop(false);
        Animated.parallel([
          Animated.timing(scrollToTopOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scrollToTopScale, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // Get unique locations from posts for filter options
  const availableLocations = React.useMemo(() => {
    const locations = new Set<string>();
    posts.forEach(post => {
      if (post.location && post.location.trim()) {
        locations.add(post.location.trim());
      }
    });
    return Array.from(locations).sort();
  }, [posts]);

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
      refreshAllFollowStates(); // Refresh follow states when screen comes into focus
    }, [refresh, refreshAllFollowStates])
  );

  // Handle follow/unfollow functionality
  const handleFollow = async (userId: string) => {
    const success = await followUser(userId);
    if (!success) {
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    }
  };

  const handleUnfollow = async (userId: string) => {
    const success = await unfollowUser(userId);
    if (!success) {
      Alert.alert('Error', 'Failed to unfollow user. Please try again.');
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
      likes_count: Number(post.likes_count) || 0,
      comments_count: Number(post.comments_count) || 0,
      shares_count: Number(post.shares_count) || 0,
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
        {/* Community Filters */}
        <CommunityFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableLocations={availableLocations}
        />

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
            ref={scrollViewRef}
            contentContainerStyle={{
              padding: theme.spacing.sm,
              paddingBottom: theme.spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
                  isFollowing={isFollowing(post.author.id)}
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
            title={filters.postType || filters.location ? "No Posts Found" : "Welcome to the Community"}
            description={
              filters.postType || filters.location 
                ? `No posts found matching your current filters. Try adjusting your filters or create a new post.`
                : "Share your experiences, ask questions, and connect with other buyers and sellers."
            }
            action={{
              text: filters.postType || filters.location ? 'Clear Filters' : 'Create First Post',
              onPress: () => {
                if (filters.postType || filters.location) {
                  setFilters({ postType: null, location: null });
                } else {
                  router.push('/(tabs)/community/create-post');
                }
              },
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

      {/* Scroll to Top FAB */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: insets.bottom + theme.spacing.xl,
          right: theme.spacing.lg,
          zIndex: 1000,
          opacity: scrollToTopOpacity,
          transform: [{ scale: scrollToTopScale }],
        }}
      >
        <TouchableOpacity
          onPress={scrollToTop}
          style={{
            backgroundColor: theme.colors.primary,
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            ...theme.shadows.lg,
            elevation: 8,
          }}
          activeOpacity={0.8}
        >
          <ChevronUp size={24} color={theme.colors.primaryForeground} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaWrapper>
  );
}
