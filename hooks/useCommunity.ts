import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { dbHelpers, supabase } from '@/lib/supabase';
import { useOptimizedCommunityRealtime } from './useOptimizedRealtime';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { addProfileRefreshListener } from './useProfile';
import { useRealtimeConnection } from './useRealtimeConnection';
import { contentModerationService } from '@/lib/contentModerationService';

export function useCommunityPosts(options: { 
  following?: boolean; 
  limit?: number; 
  userId?: string;
  postType?: string | null;
  location?: string | null;
} = {}) {
  const { user } = useAuthStore();
  const { currentLocation } = useAppStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialDataRef = useRef(false);
  const forceReconnectRef = useRef<(() => void) | null>(null);

  // Monitor real-time connection
  const { isConnected, isReconnecting, forceReconnect } = useRealtimeConnection({
    onConnectionLost: () => {
    },
    onConnectionRestored: () => {
      // If we don't have initial data yet, try to fetch
      if (!hasInitialDataRef.current && posts.length === 0) {
        fetchPosts();
      }
    },
  });

  // Store forceReconnect in ref to avoid dependency issues
  useEffect(() => {
    forceReconnectRef.current = forceReconnect;
  }, [forceReconnect]);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);


      // Set a timeout for the fetch operation
      const fetchPromise = dbHelpers.getPosts({
        ...options,
        limit: options.limit || 20,
      });

      const timeoutPromise = new Promise((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error('Request timeout - please check your connection'));
        }, 15000); // 15 second timeout
      });

      const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      // Clear timeout on success
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setPosts(data || []);
        hasInitialDataRef.current = true;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      setError(errorMessage);
      
      // If it's a timeout or connection error, try to reconnect real-time
      if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
        forceReconnectRef.current?.();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [options.following, options.userId, options.limit, options.postType, options.location]);

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

  const { postsSubscription, commentsSubscription, likesSubscription } = useOptimizedCommunityRealtime(handleRealtimeUpdate);

  useEffect(() => {
    // Reset the initial data flag when options change
    hasInitialDataRef.current = false;
    fetchPosts();
  }, [fetchPosts]);

  // Listen for profile refresh events to update posts with new profile data
  useEffect(() => {
    const removeListener = addProfileRefreshListener(() => {
      // Refresh posts to get updated profile data
      fetchPosts(true);
    });

    return () => removeListener();
  }, [fetchPosts]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  const createPost = async (content: string, images: string[] = [], listingId?: string, type?: string, location?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      // Moderate content before creating post
      const moderationResult = await contentModerationService.moderateContent({
        id: 'temp-post-id', // Temporary ID, will be replaced with actual post ID
        type: 'post',
        userId: user.id,
        content: content,
        images: images,
      });

      // Check if content is approved
      if (!moderationResult.isApproved) {
        // Log moderation details for debugging

        // Extract specific violations with user-friendly messages
        const flagReasons = moderationResult.flags
          .map(flag => {
            if (flag.type === 'profanity') {
              return 'Inappropriate language detected';
            } else if (flag.type === 'personal_info') {
              return 'Too much personal information (multiple phone numbers/emails)';
            } else if (flag.type === 'spam') {
              return 'Spam-like content detected';
            } else if (flag.type === 'inappropriate') {
              return 'Inappropriate content detected';
            } else if (flag.type === 'suspicious_links') {
              return 'Suspicious or shortened links detected';
            }
            return flag.details;
          })
          .join('\n• ');
        
        return { 
          error: `Your post cannot be published:\n\n• ${flagReasons}\n\nPlease review and modify your content, then try again.` 
        };
      }

      const finalLocation = location || currentLocation || null;
      
      const postData = {
        user_id: user.id,
        content,
        images,
        listing_id: listingId,
        location: finalLocation, // Use current location as default
        type: type || 'general', // Default to 'general' if no type provided
        status: moderationResult.requiresManualReview ? 'hidden' : 'active', // Hide if requires review
      };
      
      const { data, error } = await dbHelpers.createPost(postData);

      if (error) {
        return { error: error.message };
      }

      // Log moderation result with actual post ID
      if (data && data.id) {
        try {
          await contentModerationService.moderateContent({
            id: data.id,
            type: 'post',
            userId: user.id,
            content: content,
            images: images,
          });
        } catch (logError) {
          console.error('Failed to log moderation result:', logError);
          // Don't fail post creation if logging fails
        }
      }

      return { data };
    } catch (err) {
      console.error('Error creating post:', err);
      return { error: 'Failed to create post. Please try again.' };
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
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, comments_count: (post.comments_count || 0) + 1 }
        : post
    ));
  }, []);

  const updatePost = async (postId: string, updates: { content?: string; images?: string[]; type?: string; location?: string }) => {
    
    if (!user) return { error: 'Not authenticated' };
    if (!postId) return { error: 'Post ID is required' };

    try {
      const { data, error } = await dbHelpers.updatePost(postId, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

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
    
    if (!user) return { error: 'Not authenticated' };
    if (!postId) return { error: 'Post ID is required' };

    try {
      const { data, error } = await dbHelpers.deletePost(postId);

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
    // Real-time connection status
    isRealtimeConnected: isConnected,
    isRealtimeReconnecting: isReconnecting,
    forceReconnect,
  };
}