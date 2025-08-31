import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCommunityPosts } from '@/hooks/useCommunity';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  Avatar,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PostCard,
} from '@/components';
import { Plus, Heart, MessageCircle, Share, MoveHorizontal as MoreHorizontal, Users } from 'lucide-react-native';

export default function CommunityScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { posts, loading, error, refreshing, refresh } = useCommunityPosts();

  // Transform database posts to component format
  const transformedPosts = posts.map((post: any) => ({
    id: post.id,
    author: {
      id: post.profiles?.id,
      name: `${post.profiles?.first_name} ${post.profiles?.last_name}`,
      avatar: post.profiles?.avatar_url,
      rating: post.profiles?.rating || 0,
      isVerified: post.profiles?.is_verified,
    },
    timestamp: new Date(post.created_at).toLocaleString(),
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
        rightActions={[
          <Button
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
            onRetry={refresh}
          />
        ) : transformedPosts.length > 0 ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={theme.colors.primary}
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
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Avatar 
                  source={user?.user_metadata?.avatar_url}
                  name={`${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`}
                  size="sm" 
                />
                <Text variant="body" color="muted" style={{ flex: 1 }}>
                  What's on your mind?
                </Text>
                <Plus size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>

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
    </SafeAreaWrapper>
  );
}