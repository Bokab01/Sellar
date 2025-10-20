import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PostCard,
} from '@/components';
import { Plus, FileText } from 'lucide-react-native';

interface MyPost {
  id: string;
  content: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  location?: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    image?: string;
  };
}

export default function MyPostsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { profile } = useProfile();
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache data to prevent unnecessary refetches
  const hasLoadedData = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cooldown

  const fetchMyPosts = useCallback(async (forceRefresh = false) => {
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
      
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          images,
          likes_count,
          comments_count,
          shares_count,
          created_at,
          location,
          listings:listing_id (
            id,
            title,
            price,
            images
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setPosts(data || []);
      hasLoadedData.current = true;
      lastFetchTime.current = now;
    } catch (err: any) {
      console.error('Error fetching my posts:', err);
      setError(err.message || 'Failed to load your posts');
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
    fetchMyPosts();
  }, [fetchMyPosts]);

  // Smart focus effect - only refresh if needed
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      if (!hasLoadedData.current || timeSinceLastFetch > FETCH_COOLDOWN) {
        fetchMyPosts();
      } else {
      }
    }, [fetchMyPosts])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyPosts(true); // Force refresh
  }, [fetchMyPosts]);

  // const handleDeletePost = async (postId: string) => {
  //   try {
  //     const { error } = await supabase
  //       .from('posts')
  //       .delete()
  //       .eq('id', postId)
  //       .eq('user_id', user?.id); // Ensure user can only delete their own posts

  //     if (error) throw error;

  //       // Remove from local state
  //       setPosts(prev => prev.filter(post => post.id !== postId));
  //     } catch (error) {
  //       console.error('Error deleting post:', error);
  //     }
  //   };

  // Memoize expensive data transformation
  const transformedPosts = useMemo(() => {
    return posts.map((post) => ({
      id: post.id,
      type: (post as any).type || (post.listing ? 'listing' : 'general'), // Determine post type
      author: {
        id: user?.id || '',
        name: profile?.full_name || `${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`,
        avatar: profile?.avatar_url || user?.user_metadata?.avatar_url,
        rating: (profile as any)?.rating || 0, // Use actual rating from profile
        reviewCount: (profile as any)?.rating_count || (profile as any)?.total_reviews || 0, // Use actual review count
        isVerified: profile?.is_verified || false,
        location: profile?.location, // Use actual location from profile
        profile: profile ? {
          id: profile.id,
          full_name: profile.full_name,
          is_business: profile.is_business || false,
          business_name: profile.business_name,
          display_business_name: profile.display_business_name,
          business_name_priority: profile.business_name_priority,
          verification_level: profile.verification_level,
        } : {
          id: user?.id || '',
          full_name: `${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`,
          is_business: false,
          business_name: null,
          display_business_name: false,
          business_name_priority: 'hidden',
          verification_level: 'none',
        },
      },
      timestamp: new Date(post.created_at || new Date()).toLocaleString(),
      content: post.content,
      images: post.images || [],
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0,
      isLiked: false,
      location: post.location,
      listing: post.listing ? {
        id: post.listing.id,
        title: post.listing.title,
        price: post.listing.price,
        image: post.listing.image,
      } : undefined,
    }));
  }, [posts, user, profile]);

  // Memoize expensive stats calculations
  const stats = useMemo(() => {
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
    
    return {
      totalPosts: posts.length,
      totalLikes,
      totalComments,
    };
  }, [posts]);

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="My Posts"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="create-post"
            variant="icon"
            icon={<Plus size={20} color={theme.colors.text.primary} />}
            onPress={() => router.push('/(tabs)/community/create-post')}
          />,
        ]}
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
            onRetry={fetchMyPosts}
          />
        ) : posts.length > 0 ? (
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
            {/* Stats Header */}
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
              <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing.sm }}>
                Your Posts
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" weight="bold" color="primary">
                    {stats.totalPosts}
                  </Text>
                  <Text variant="caption" color="muted">Total Posts</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" weight="bold" color="primary">
                    {stats.totalLikes}
                  </Text>
                  <Text variant="caption" color="muted">Total Likes</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" weight="bold" color="primary">
                    {stats.totalComments}
                  </Text>
                  <Text variant="caption" color="muted">Total Comments</Text>
                </View>
              </View>
            </View>

            {/* Posts Feed */}
            {transformedPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post}
                onLike={() => {}}
                onComment={() => router.push(`/(tabs)/community/${post.id}`)}
                onShare={() => {}}
              />
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<FileText size={64} color={theme.colors.text.muted} />}
            title="No Posts Yet"
            description="Share your thoughts, experiences, or showcase your listings with the community!"
            action={{
              text: 'Create Your First Post',
              onPress: () => router.push('/(tabs)/community/create-post'),
            }}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
