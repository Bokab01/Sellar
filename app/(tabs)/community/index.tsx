import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Pressable, Alert, Animated, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { useAppResume } from '@/hooks/useAppResume';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useFollowState } from '@/hooks/useFollowState';
import { getDisplayName } from '@/hooks/useDisplayName';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Avatar,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PostCardSkeleton,
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
  const { contentBottomPadding } = useBottomTabBarSpacing();
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
  
  // Debug logging for filters
  const { followingStates, followUser, unfollowUser, isFollowing, refreshAllFollowStates } = useFollowState();

  // Enhanced scroll to top function with smooth UX
  const scrollToTop = useCallback(() => {
    if (scrollViewRef.current) {
      // Smooth scroll to top with easing
      scrollViewRef.current.scrollTo({ 
        y: 0, 
        animated: true 
      });
      
      // Hide FAB immediately for better UX
      setShowScrollToTop(false);
      Animated.parallel([
        Animated.timing(scrollToTopOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scrollToTopScale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [scrollToTopOpacity, scrollToTopScale]);

  // Handle scroll for FAB visibility
  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    
    // Show/hide scroll-to-top FAB with professional animations
    if (currentScrollY > 300) {
      if (!showScrollToTop) {
        setShowScrollToTop(true);
        Animated.parallel([
          Animated.timing(scrollToTopOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(scrollToTopScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 120,
            friction: 7,
            overshootClamping: true,
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
      await refresh();
      lastRefreshTime.current = Date.now(); // Update refresh time
    },
    debug: true,
  });

  // Smart refresh strategy - only refresh when needed
  const hasInitialData = React.useRef(false);
  const lastRefreshTime = React.useRef(0);
  const REFRESH_COOLDOWN = 30000; // 30 seconds cooldown

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime.current;
      
      // Only refresh if:
      // 1. We don't have initial data yet
      // 2. It's been more than 30 seconds since last refresh
      // 3. We have no posts (likely an error state)
      if (!hasInitialData.current || timeSinceLastRefresh > REFRESH_COOLDOWN || posts.length === 0) {
        refresh();
        lastRefreshTime.current = now;
        hasInitialData.current = true;
      } else {
      }
      
      // Always refresh follow states (lightweight operation)
      refreshAllFollowStates();
    }, [refresh, refreshAllFollowStates, posts.length])
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
    
    if (!postId || postId === 'unknown' || postId === 'undefined') {
      // Handle error silently
      Alert.alert('Error', 'Cannot edit post: Invalid post ID');
      return;
    }
    
    router.push(`/(tabs)/community/edit-post/${postId}`);
  };

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    
    if (!postId || postId === 'unknown' || postId === 'undefined') {
      // Handle error silently
      Alert.alert('Error', 'Cannot delete post: Invalid post ID');
      return;
    }
    
    try {
      const { error } = await deletePost(postId);
      if (error) {
        // Handle error silently
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
  const transformedPosts = useMemo(() => {
    return posts.map((post: any) => {
      // Safety check for post data
      if (!post || typeof post !== 'object') {
        // Handle error silently
        return null;
      }

      const transformedPost = {
        id: post.id || 'unknown',
        type: post.type || (post.listings ? 'listing' : 'general'),
        user_id: post.user_id, // Preserve the original user_id for ownership checks
        author: {
          id: post.profiles?.id || 'unknown',
          name: getDisplayName(post.profiles, false).displayName,
          avatar: post.profiles?.avatar_url || null,
          rating: Number(post.profiles?.rating) || 0,
          reviewCount: Number(post.profiles?.rating_count || post.profiles?.total_reviews) || 0,
          isVerified: Boolean(post.profiles?.is_verified),
          location: post.profiles?.location || null,
          profile: post.profiles || null,
          is_sellar_pro: Boolean(post.author_is_sellar_pro), // ✅ Sellar Pro status
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


      return transformedPost;
    }).filter(Boolean); // Remove any null entries
  }, [posts]);

  // Memoized PostCard component to prevent unnecessary re-renders
  const MemoizedPostCard = useCallback(({ post }: { post: any }) => {
    if (!post) return null;
    
    return (
      <PostCard 
        key={post.id} 
        post={post}
        isFollowing={isFollowing(post.author.id)}
        onLike={() => {
          // TODO: Implement like functionality
        }}
        onComment={() => router.push(`/(tabs)/community/${post.id}`)}
        onShare={() => {
          // TODO: Implement share functionality
        }}
        onEdit={() => handleEditPost(post.id)}
        onDelete={() => handleDeletePost(post.id)}
        onFollow={() => handleFollow(post.author.id)}
        onUnfollow={() => handleUnfollow(post.author.id)}
        onReport={() => {
          // TODO: Implement report functionality
        }}
      />
    );
  }, [isFollowing, handleEditPost, handleDeletePost, handleFollow, handleUnfollow]);

  // Memoized Create Post Prompt
  const CreatePostPrompt = useMemo(() => (
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
  ), [theme, profile, user]);

  // Memoized ListHeader for FlatList
  const ListHeader = useMemo(() => (
    <View>
      {CreatePostPrompt}
    </View>
  ), [CreatePostPrompt]);

  // Optimized renderItem for FlatList
  const renderPost = useCallback(({ item: post }: { item: any }) => (
    <MemoizedPostCard post={post} />
  ), [MemoizedPostCard]);

  // Optimized keyExtractor
  const keyExtractor = useCallback((item: any) => item.id, []);


  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Sellar Connect"
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
          <FlatList
            data={Array.from({ length: 3 })}
            keyExtractor={(_, index) => `skeleton-${index}`}
            renderItem={({ index }) => (
              <PostCardSkeleton key={index} showImage={index % 2 === 0} />
            )}
            contentContainerStyle={{
              padding: theme.spacing.sm,
            }}
            // ✅ Performance optimizations for skeleton loading
            removeClippedSubviews={true}
            maxToRenderPerBatch={3}
            windowSize={2}
            initialNumToRender={3}
          />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={refresh}
          />
        ) : transformedPosts.length > 0 ? (
          <FlatList
            ref={scrollViewRef as any}
            data={transformedPosts}
            keyExtractor={keyExtractor}
            renderItem={renderPost}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{
              padding: theme.spacing.sm,
              paddingBottom: contentBottomPadding,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  refresh();
                  lastRefreshTime.current = Date.now(); // Update refresh time
                }}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            // ✅ Performance optimizations for smooth scrolling
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
            decelerationRate="fast"
          />
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
          bottom: insets.bottom + theme.spacing.xl + contentBottomPadding,
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
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            ...theme.shadows.lg,
            elevation: 8,
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            borderWidth: 2,
            borderColor: theme.colors.primaryForeground,
          }}
          activeOpacity={0.7}
          accessibilityLabel="Scroll to top"
          accessibilityHint="Double tap to scroll to the top of the page"
          accessibilityRole="button"
        >
          <ChevronUp 
            size={24} 
            color={theme.colors.primaryForeground} 
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaWrapper>
  );
}
