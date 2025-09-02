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
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyPosts();
  }, [user]);

  const fetchMyPosts = async () => {
    if (!user?.id) return;

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
    } catch (err: any) {
      console.error('Error fetching my posts:', err);
      setError(err.message || 'Failed to load your posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMyPosts();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id); // Ensure user can only delete their own posts

      if (error) throw error;

      // Remove from local state
      setPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // Transform posts to PostCard format
  const transformedPosts = posts.map((post) => ({
    id: post.id,
    author: {
      id: user?.id || '',
      name: `${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`,
      avatar: user?.user_metadata?.avatar_url,
      rating: 0,
      isVerified: false,
    },
    timestamp: new Date(post.created_at).toLocaleString(),
    content: post.content,
    images: post.images || [],
    likes: post.likes_count || 0,
    comments: post.comments_count || 0,
    shares: post.shares_count || 0,
    isLiked: false,
    location: post.location,
    listing: post.listing ? {
      id: post.listing.id,
      title: post.listing.title,
      price: post.listing.price,
      image: post.listing.images?.[0],
    } : undefined,
  }));

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
            onRetry={fetchMyPosts}
          />
        ) : posts.length > 0 ? (
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
                    {posts.length}
                  </Text>
                  <Text variant="caption" color="muted">Total Posts</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" weight="bold" color="primary">
                    {posts.reduce((sum, post) => sum + (post.likes_count || 0), 0)}
                  </Text>
                  <Text variant="caption" color="muted">Total Likes</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" weight="bold" color="primary">
                    {posts.reduce((sum, post) => sum + (post.comments_count || 0), 0)}
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
