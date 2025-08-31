import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  PostCard,
  CommentCard,
  Input,
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Toast,
} from '@/components';
import { MessageCircle } from 'lucide-react-native';

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useAuthStore();
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url,
            rating,
            is_verified
          ),
          listings (
            id,
            title,
            price,
            images
          )
        `)
        .eq('id', postId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPost(data);
      }
    } catch (err) {
      setError('Failed to load post');
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('post_id', postId)
        .is('parent_id', null) // Only top-level comments
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch comments:', fetchError);
      } else {
        // Fetch replies for each comment
        const commentsWithReplies = await Promise.all(
          (data || []).map(async (comment) => {
            const { data: replies } = await supabase
              .from('comments')
              .select(`
                *,
                profiles:user_id (
                  id,
                  first_name,
                  last_name,
                  avatar_url,
                  is_verified
                )
              `)
              .eq('parent_id', comment.id)
              .order('created_at', { ascending: true });

            return {
              ...comment,
              replies: replies || [],
            };
          })
        );

        setComments(commentsWithReplies);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPost(), fetchComments()]);
    setRefreshing(false);
  };

  const handleLikePost = async () => {
    if (!user) return;

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            post_id: postId!,
          });
      }

      // Refresh post to get updated counts
      await fetchPost();
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId!,
          user_id: user.id,
          content: commentText.trim(),
        });

      if (error) throw error;

      setCommentText('');
      setToastMessage('Comment added successfully!');
      setShowToast(true);
      await fetchComments();
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyToComment = async (parentId: string, content: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId!,
          user_id: user.id,
          content,
          parent_id: parentId,
        });

      if (error) throw error;

      setToastMessage('Reply added successfully!');
      setShowToast(true);
      await fetchComments();
    } catch (err) {
      Alert.alert('Error', 'Failed to add reply');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            comment_id: commentId,
          });
      }

      // Refresh comments to get updated counts
      await fetchComments();
    } catch (err) {
      console.error('Failed to toggle comment like:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Post"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width="100%"
              height={80}
              style={{ marginBottom: theme.spacing.md }}
            />
          ))}
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Post"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error || 'Post not found'}
          onRetry={fetchPost}
        />
      </SafeAreaWrapper>
    );
  }

  // Transform post data
  const transformedPost = {
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
  };

  // Transform comments data
  const transformedComments = comments.map((comment) => ({
    id: comment.id,
    author: {
      id: comment.profiles?.id,
      name: `${comment.profiles?.first_name} ${comment.profiles?.last_name}`,
      avatar: comment.profiles?.avatar_url,
      isVerified: comment.profiles?.is_verified,
    },
    content: comment.content,
    timestamp: new Date(comment.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    likes: comment.likes_count || 0,
    isLiked: false, // TODO: Check if current user liked this comment
    replies: comment.replies?.map((reply: any) => ({
      id: reply.id,
      author: {
        id: reply.profiles?.id,
        name: `${reply.profiles?.first_name} ${reply.profiles?.last_name}`,
        avatar: reply.profiles?.avatar_url,
        isVerified: reply.profiles?.is_verified,
      },
      content: reply.content,
      timestamp: new Date(reply.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      likes: reply.likes_count || 0,
      isLiked: false,
      depth: 1,
    })) || [],
    depth: 0,
  }));

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Post"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Post */}
        <View style={{ marginBottom: theme.spacing.lg }}>
          <PostCard
            post={transformedPost}
            onLike={handleLikePost}
            onComment={() => {}}
            onShare={() => {}}
          />
        </View>

        {/* Comments Section */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.lg }}>
            Comments ({comments.length})
          </Text>

          {/* Add Comment */}
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
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
              <Avatar
                source={user?.user_metadata?.avatar_url}
                name={`${user?.user_metadata?.first_name || 'User'} ${user?.user_metadata?.last_name || ''}`}
                size="sm"
              />
              <View style={{ flex: 1 }}>
                <Input
                  variant="multiline"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  style={{ minHeight: 60 }}
                />
                <Button
                  variant="primary"
                  onPress={handleAddComment}
                  loading={submittingComment}
                  disabled={!commentText.trim() || submittingComment}
                  size="sm"
                  style={{ marginTop: theme.spacing.md, alignSelf: 'flex-end' }}
                >
                  Comment
                </Button>
              </View>
            </View>
          </View>

          {/* Comments List */}
          {transformedComments.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              {transformedComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onLike={() => handleLikeComment(comment.id)}
                  onReply={(content) => handleReplyToComment(comment.id, content)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<MessageCircle size={48} color={theme.colors.text.muted} />}
              title="No comments yet"
              description="Be the first to comment on this post"
            />
          )}
        </View>
      </ScrollView>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}