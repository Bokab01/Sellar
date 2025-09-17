import React, { useState, useEffect, useCallback } from 'react';
import { dbHelpers, supabase } from '@/lib/supabase';
import { useCommunityRealtime } from './useRealtime';
import { useAuthStore } from '@/store/useAuthStore';
import { addProfileRefreshListener } from './useProfile';

export function useCommunityPosts(options: { following?: boolean; limit?: number; userId?: string } = {}) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);

      const { data, error: fetchError } = await dbHelpers.getPosts({
        ...options,
        limit: options.limit || 20,
      });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPosts(data || []);
      }
    } catch (err) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [options.following, options.userId, options.limit]);

  // Real-time updates
  const handleRealtimeUpdate = useCallback((newPost: any) => {
    React.startTransition(() => {
      setPosts(prev => {
        // Handle deleted posts
        if (newPost._deleted) {
          return prev.filter(item => item.id !== newPost.id);
        }
        
        const exists = prev.find(item => item.id === newPost.id);
        if (exists) {
          return prev.map(item => item.id === newPost.id ? newPost : item);
        } else {
          return [newPost, ...prev];
        }
      });
    });
  }, []);

  const { postsSubscription, commentsSubscription, likesSubscription } = useCommunityRealtime(handleRealtimeUpdate);

  useEffect(() => {
    fetchPosts();
  }, [options.following, options.userId]);

  // Listen for profile refresh events to update posts with new profile data
  useEffect(() => {
    const removeListener = addProfileRefreshListener(() => {
      // Refresh posts to get updated profile data
      fetchPosts(true);
    });

    return () => removeListener();
  }, [fetchPosts]);

  const createPost = async (content: string, images: string[] = [], listingId?: string, type?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const postData = {
        user_id: user.id,
        content,
        images,
        listing_id: listingId,
        type: type || 'general', // Default to 'general' if no type provided
      };
      
      const { data, error } = await dbHelpers.createPost(postData);

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: 'Failed to create post' };
    }
  };

  const refresh = useCallback(() => fetchPosts(true), [fetchPosts]);

  const updatePostCounts = useCallback((postId: string, counts: { likes_count?: number; comments_count?: number; shares_count?: number }) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, ...counts }
        : post
    ));
  }, []);

  const incrementCommentCount = useCallback((postId: string) => {
    console.log('🔗 Manually incrementing comment count for post:', postId);
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, comments_count: (post.comments_count || 0) + 1 }
        : post
    ));
  }, []);

  const updatePost = async (postId: string, updates: { content?: string; images?: string[]; type?: string; location?: string }) => {
    console.log('updatePost hook called with:', postId, typeof postId, updates);
    
    if (!user) return { error: 'Not authenticated' };
    if (!postId) return { error: 'Post ID is required' };

    try {
      console.log('Calling dbHelpers.updatePost with:', postId, updates);
      const { data, error } = await dbHelpers.updatePost(postId, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      console.log('dbHelpers.updatePost result:', { data, error });

      if (error) {
        console.error('Database error in updatePost:', error);
        return { error: (error as any)?.message || error.toString() };
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, ...updates, updated_at: new Date().toISOString() }
          : post
      ));

      return { data };
    } catch (err) {
      console.error('Exception in updatePost:', err);
      return { error: 'Failed to update post' };
    }
  };

  const deletePost = async (postId: string) => {
    console.log('deletePost hook called with:', postId, typeof postId);
    
    if (!user) return { error: 'Not authenticated' };
    if (!postId) return { error: 'Post ID is required' };

    try {
      console.log('Calling dbHelpers.deletePost with:', postId);
      const { data, error } = await dbHelpers.deletePost(postId);
      console.log('dbHelpers.deletePost result:', { data, error });

      if (error) {
        console.error('Database error in deletePost:', error);
        return { error: (error as any)?.message || error.toString() };
      }

      // Remove from local state
      setPosts(prev => prev.filter(post => post.id !== postId));

      return { data };
    } catch (err) {
      console.error('Exception in deletePost:', err);
      return { error: 'Failed to delete post' };
    }
  };

  const likePost = async (postId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await dbHelpers.toggleLike(user.id, postId);
      
      if (error) {
        return { error: error.message };
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes_count: data?.action === 'liked' 
                ? (post.likes_count || 0) + 1 
                : Math.max(0, (post.likes_count || 0) - 1)
            }
          : post
      ));

      return { data };
    } catch (err) {
      return { error: 'Failed to toggle like' };
    }
  };

  const sharePost = async (postId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('shares')
        .insert({
          user_id: user.id,
          post_id: postId,
        })
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, shares_count: (post.shares_count || 0) + 1 }
          : post
      ));

      return { data };
    } catch (err) {
      return { error: 'Failed to share post' };
    }
  };

  const updateCommentCount = (postId: string, increment: number = 1) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, comments_count: Math.max(0, (post.comments_count || 0) + increment) }
        : post
    ));
  };

  return {
    posts,
    loading,
    error,
    refreshing,
    refresh,
    createPost,
    updatePostCounts,
    incrementCommentCount,
    updatePost,
    deletePost,
    likePost,
    sharePost,
    updateCommentCount,
  };
}