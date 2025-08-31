import { useState, useEffect } from 'react';
import { dbHelpers } from '@/lib/supabase';
import { useCommunityRealtime } from './useRealtime';
import { useAuthStore } from '@/store/useAuthStore';

export function useCommunityPosts(options: { following?: boolean; limit?: number; userId?: string } = {}) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async (isRefresh = false) => {
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
  };

  // Real-time updates
  useCommunityRealtime((newPost) => {
    setPosts(prev => {
      const exists = prev.find(item => item.id === newPost.id);
      if (exists) {
        return prev.map(item => item.id === newPost.id ? newPost : item);
      } else {
        return [newPost, ...prev];
      }
    });
  });

  useEffect(() => {
    fetchPosts();
  }, [options.following, options.userId]);

  const createPost = async (content: string, images: string[] = [], listingId?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await dbHelpers.createPost({
        user_id: user.id,
        content,
        images,
        listing_id: listingId,
      });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: 'Failed to create post' };
    }
  };

  const refresh = () => fetchPosts(true);

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

  return {
    posts,
    loading,
    error,
    refreshing,
    refresh,
    createPost,
    likePost,
    sharePost,
  };
}