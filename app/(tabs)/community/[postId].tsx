import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, RefreshControl, Alert, Platform, TouchableOpacity, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useBottomTabBarSpacing } from '@/hooks/useBottomTabBarSpacing';
import { supabase } from '@/lib/supabase';
import { useRealtime } from '@/hooks/useRealtime';
import { UserProfile } from '@/hooks/useProfile';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  PostCard,
  CommentCard,
  Input,
  Button,
  Avatar,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Toast,
  MessageInput,
} from '@/components';
import { MessageCircle, MoreVertical } from 'lucide-react-native';

export default function PostDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useAuthStore();
  const { contentBottomPadding } = useBottomTabBarSpacing();
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  
  // Edit state
  const [editingComment, setEditingComment] = useState<{ id: string; content: string } | null>(null);
  
  // Scroll ref for auto-scrolling to new comments
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const isScrollingRef = useRef(false);
  


  const fetchPost = useCallback(async () => {
    try {
      console.log('Fetching post with ID:', postId);
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            rating,
            location,
            is_verified,
            is_business,
            business_name,
            display_business_name,
            business_name_priority
          ),
          listings:listing_id (
            id,
            title,
            price,
            images
          )
        `)
        .eq('id', postId)
        .single();


      if (fetchError) {
        console.error('Post fetch error:', fetchError);
        setError(fetchError.message);
      } else {
        setPost(data);
      }
    } catch (err) {
      console.error('Post fetch exception:', err);
      setError('Failed to load post');
    }
  }, [postId]);

  // Keyboard visibility listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > 0 && !isKeyboardVisible && !isScrollingRef.current) {
      isScrollingRef.current = true;
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd(true);
          // Reset scrolling flag after animation completes
          setTimeout(() => {
            isScrollingRef.current = false;
          }, 300);
        }, 150); // Slightly longer delay to allow layout to settle
      });
    }
  }, [comments.length, isKeyboardVisible]);

  const fetchComments = async () => {
    try {
      console.log('Fetching comments for post ID:', postId);
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            is_verified,
            is_business,
            business_name,
            display_business_name,
            business_name_priority
          )
        `)
        .eq('post_id', postId)
        .is('parent_id', null) // Only top-level comments
        .order('created_at', { ascending: true });

      console.log('Comments fetch result:', { data, error: fetchError });

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
                profiles!comments_user_id_fkey (
                  id,
                  first_name,
                  last_name,
                  full_name,
                  avatar_url,
                  is_verified,
                  is_business,
                  business_name,
                  display_business_name,
                  business_name_priority
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
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPost(), fetchComments()]);
    setRefreshing(false);
  };

  // Real-time subscription for post updates (likes, comments count, etc.)
  const handlePostUpdate = useCallback((updatedPost: any) => {
    console.log('🔗 Post updated via real-time:', updatedPost);
    if (updatedPost.id === postId) {
      setPost((prev: any) => prev ? { ...prev, ...updatedPost } : updatedPost);
    }
  }, [postId]);

  // Real-time subscription for new comments
  const handleCommentUpdate = useCallback((newComment: any) => {
    console.log('🔗 Comment updated via real-time:', newComment);
    if (newComment.post_id === postId) {
      // Fetch the complete comment data with profile info
      const fetchCompleteComment = async () => {
        try {
          const { data, error } = await supabase
            .from('comments')
            .select(`
              *,
              profiles!comments_user_id_fkey (
                id,
                first_name,
                last_name,
                avatar_url,
                is_verified
              )
            `)
            .eq('id', newComment.id)
            .single();

          if (!error && data) {
            setComments(prev => {
              const exists = prev.find(comment => comment.id === data.id);
              if (exists) {
                return prev.map(comment => comment.id === data.id ? data : comment);
              } else {
                return [...prev, data].sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              }
            });
          }
        } catch (err) {
          console.error('Error fetching complete comment data:', err);
        }
      };

      fetchCompleteComment();
    }
  }, [postId]);

  // Set up real-time subscriptions
  useRealtime({
    table: 'posts',
    filter: `id=eq.${postId}`,
    onUpdate: handlePostUpdate,
  });

  useRealtime({
    table: 'comments',
    filter: `post_id=eq.${postId}`,
    onInsert: handleCommentUpdate,
    onUpdate: handleCommentUpdate,
  });

  // Real-time subscription for likes (to update like counts)
  useRealtime({
    table: 'likes',
    filter: `post_id=eq.${postId}`,
    onInsert: () => fetchPost(), // Refresh post when someone likes
    onDelete: () => fetchPost(), // Refresh post when someone unlikes
  });

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
    } catch {
      console.error('Failed to toggle like');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) {
      console.log('Cannot add comment: missing text or user', { 
        hasText: !!commentText.trim(), 
        hasUser: !!user,
        userId: user?.id 
      });
      return;
    }

    setSubmittingComment(true);
    try {
      if (editingComment) {
        // Edit existing comment
        console.log('Attempting to edit comment:', {
          commentId: editingComment.id,
          content: commentText.trim(),
        });

        const { error } = await supabase
          .from('comments')
          .update({
            content: commentText.trim(),
          })
          .eq('id', editingComment.id)
          .eq('user_id', user.id); // Ensure user can only edit their own comments

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.log('Comment edited successfully');
        setEditingComment(null);
        setCommentText('');
        
        // Refresh comments to get updated content
        await fetchComments();
      } else {
        // Add new comment or reply
        console.log('Attempting to add comment:', {
          postId,
          userId: user.id,
          content: commentText.trim(),
          parentId: replyingTo?.id || null,
          isReply: !!replyingTo
        });

        const { data, error } = await supabase
          .from('comments')
          .insert({
            post_id: postId!,
            user_id: user.id,
            content: commentText.trim(),
            parent_id: replyingTo?.id || null, // Add parent_id if replying
          })
          .select();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.log('Comment added successfully:', data);
        setCommentText('');
        setReplyingTo(null); // Clear reply state
        
        // Refresh comments and post data to get updated counts from database
        await fetchComments();
        await fetchPost();
      }
    } catch (error) {
      console.error('Failed to add/edit comment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const actionText = editingComment ? 'edit comment' : (replyingTo ? 'add reply' : 'add comment');
      Alert.alert('Error', `Failed to ${actionText}: ${errorMessage}`);
      setCommentText(commentText); // Restore comment text on error
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyToComment = (parentId: string, authorName: string) => {
    // Set reply state to focus the unified input
    setReplyingTo({ id: parentId, name: authorName });
    setCommentText(''); // Clear any existing text
    setEditingComment(null); // Clear any edit state
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

  const handleReportComment = async (commentId: string) => {
    if (!user) return;

    try {
      // Use the proper submit_report function
      const { data, error } = await supabase.rpc('submit_report', {
        p_reporter_id: user.id,
        p_target_type: 'comment',
        p_target_id: commentId,
        p_category: 'inappropriate',
        p_reason: 'Inappropriate content reported',
        p_description: null,
        p_evidence_urls: JSON.stringify([])
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        setToastMessage('Comment reported successfully');
        setToastVariant('success');
        setShowToast(true);
      } else {
        throw new Error(data?.[0]?.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
      setToastMessage('Failed to report comment');
      setToastVariant('error');
      setShowToast(true);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      // First, delete all replies to this comment
      const { error: repliesError } = await supabase
        .from('comments')
        .delete()
        .eq('parent_id', commentId);

      if (repliesError) {
        console.error('Error deleting replies:', repliesError);
        // Continue with main comment deletion even if replies fail
      }

      // Then delete the main comment
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Ensure user can only delete their own comments

      if (error) throw error;

      setToastMessage('Comment deleted successfully');
      setToastVariant('success');
      setShowToast(true);

      // Refresh comments and post data to get updated counts
      await fetchComments();
      await fetchPost();
    } catch (error) {
      console.error('Error deleting comment:', error);
      setToastMessage('Failed to delete comment');
      setToastVariant('error');
      setShowToast(true);
    }
  };

  const handleEditComment = (commentId: string, content: string) => {
    setEditingComment({ id: commentId, content });
    setCommentText(content);
    setReplyingTo(null); // Clear any reply state
  };

  // Fetch post and comments when component mounts or postId changes
  useEffect(() => {
    if (postId) {
      setLoading(true);
      setError(null);
      Promise.all([fetchPost(), fetchComments()]).finally(() => {
        setLoading(false);
      });
    }
  }, [postId, fetchPost]);

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Post"
          showBackButton
          onBackPress={() => router.back()}
        />
        <KeyboardAwareScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width="100%"
              height={80}
              style={{ marginBottom: theme.spacing.md }}
            />
          ))}
        </KeyboardAwareScrollView>
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


  // Count total comments including replies
  const totalCommentsCount = comments.reduce((total, comment) => {
    return total + 1 + (comment.replies?.length || 0);
  }, 0);

  const transformedPost = {
    id: post.id,
    type: post.type || 'general', // Add post type
    user_id: post.user_id, // Add user_id for ownership checks
    author: {
      id: post.profiles?.id || post.user_id,
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
      reviewCount: 0, // Set to 0 since we don't have this data
      isVerified: Boolean(post.profiles?.is_verified),
      location: post.profiles?.location || null,
      profile: post.profiles ? {
        ...post.profiles,
        full_name: post.profiles.full_name || (() => {
          const firstName = post.profiles.first_name || '';
          const lastName = post.profiles.last_name || '';
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
      } as UserProfile : null, // Add the full profile object for UserDisplayName
    },
    timestamp: new Date(post.created_at || new Date()).toLocaleString(),
    content: post.content || '',
    images: Array.isArray(post.images) ? post.images : [],
    likes_count: Number(post.likes_count) || 0,
    comments_count: totalCommentsCount, // Use total comments including replies
    shares_count: Number(post.shares_count) || 0,
    isLiked: false, // TODO: Check if current user liked this post
    location: post.location || null,
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
      name: `${comment.profiles?.first_name || 'User'} ${comment.profiles?.last_name || ''}`,
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
        name: `${reply.profiles?.first_name || 'User'} ${reply.profiles?.last_name || ''}`,
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
    <SafeAreaWrapper style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <AppHeader
          title="Post"
          showBackButton
          onBackPress={() => router.back()}
        />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              paddingBottom: isKeyboardVisible ? theme.spacing.xl : theme.spacing.sm, // Dynamic padding based on keyboard state
              flexGrow: 1, // Ensure content fills available space
            }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            keyboardOpeningTime={0}
            extraScrollHeight={Platform.OS === 'android' ? 0 : 0} // Reduced since we're using KeyboardAvoidingView
            extraHeight={Platform.OS === 'android' ? 0 : 0} // Reduced since we're using KeyboardAvoidingView
            showsVerticalScrollIndicator={false}
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
              key={`${transformedPost.id}-${transformedPost.comments_count}`}
              post={transformedPost}
              onLike={handleLikePost}
              onComment={() => {}}
              onShare={() => {}}
              onReport={() => {
                // The PostCard will handle the report modal internally
              }}
              hideViewPost={true}
            />
            
          </View>

          {/* Comments Section */}
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}> {/* Reduced from lg to md */}
              Comments ({totalCommentsCount})
            </Text>

            {/* Comments List */}
            {transformedComments.length > 0 ? (
              <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}> {/* Reduced gap and margin */}
                {transformedComments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onLike={() => handleLikeComment(comment.id)}
                    onReply={(commentId, authorName) => handleReplyToComment(commentId, authorName)}
                    onReport={() => handleReportComment(comment.id)}
                    onDelete={handleDeleteComment}
                    onEdit={handleEditComment}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon={<MessageCircle size={48} color={theme.colors.text.muted} />}
                title="No comments yet"
                description="Be the first to comment on this post"
                style={{ marginBottom: theme.spacing.xl }}
              />
            )}
          </View>
          </KeyboardAwareScrollView>
        </TouchableWithoutFeedback>

      {/* Reply indicator */}
      {replyingTo && (
        <View style={{
          position: 'absolute',
          bottom: isKeyboardVisible ? 80 : 60, // Adjust based on keyboard state
          left: theme.spacing.lg,
          right: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
          zIndex: 1000,
        }}>
          <Text variant="bodySmall" color="muted">
            Replying to {replyingTo.name}
          </Text>
          <TouchableOpacity
            onPress={() => setReplyingTo(null)}
            style={{ padding: theme.spacing.xs }}
          >
            <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit indicator */}
      {editingComment && (
        <View style={{
          position: 'absolute',
          bottom: isKeyboardVisible ? 80 : 60, // Adjust based on keyboard state
          left: theme.spacing.lg,
          right: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          borderWidth: 1,
          borderColor: theme.colors.primary + '30',
          ...theme.shadows.sm,
          zIndex: 1000,
        }}>
          <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
            Editing comment
          </Text>
          <TouchableOpacity
            onPress={() => {
              setEditingComment(null);
              setCommentText('');
            }}
            style={{ padding: theme.spacing.xs }}
          >
            <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Comment Input - Using MessageInput component */}
      <MessageInput
        value={commentText}
        onChangeText={setCommentText}
        onSend={handleAddComment}
        placeholder={
          editingComment 
            ? "Edit your comment..." 
            : replyingTo 
              ? `Reply to ${replyingTo.name}...` 
              : "Write a comment..."
        }
        disabled={submittingComment}
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      />

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant="success"
        onHide={() => setShowToast(false)}
      />
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}