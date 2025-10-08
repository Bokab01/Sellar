import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { reputationService } from '@/lib/reputationService';
import { contentModerationService } from '@/lib/contentModerationService';

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  listing_id: string | null;
  rating: number;
  comment: string;
  review_type: 'buyer_to_seller' | 'seller_to_buyer' | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  reviewer?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  };
  reviewed?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  };
  listing?: {
    id: string;
    title: string;
    images: string[] | null;
  };
  user_helpful_vote?: boolean;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CreateReviewData {
  reviewed_user_id: string;
  listing_id?: string;
  rating: number;
  comment: string;
  is_verified_purchase?: boolean;
}

export interface UpdateReviewData {
  rating?: number;
  comment?: string;
}

// Hook to fetch reviews for a user or listing
export function useReviews(options: {
  userId?: string;
  listingId?: string;
  reviewerId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuthStore();

  // Cache data to prevent unnecessary refetches
  const hasLoadedData = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cooldown

  const { userId, listingId, reviewerId, limit = 20, offset = 0 } = options;

  const fetchReviews = useCallback(async (reset = false, forceRefresh = false) => {
    // Smart caching - only fetch if needed
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    if (!forceRefresh && !reset && hasLoadedData.current && timeSinceLastFetch < FETCH_COOLDOWN) {
      console.log('⏭️ Reviews: Using cached data');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Reviews: Fetching data', { forceRefresh, timeSinceLastFetch });

      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          reviewed:profiles!reviews_reviewed_user_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          listing:listings(id, title, images)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      // Apply filters
      if (userId) {
        query = query.eq('reviewed_user_id', userId);
      }
      if (listingId) {
        query = query.eq('listing_id', listingId);
      }
      if (reviewerId) {
        query = query.eq('reviewer_id', reviewerId);
      }

      // Apply pagination
      const startIndex = reset ? 0 : offset;
      query = query.range(startIndex, startIndex + limit - 1);

      // Fetch reviews and votes in parallel for better performance
      const [reviewsResult, votesResult] = await Promise.all([
        query,
        user ? supabase
          .from('review_helpful_votes')
          .select('review_id')
          .eq('user_id', user.id)
          .in('review_id', []) // Will be updated after getting review IDs
        : Promise.resolve({ data: null, error: null })
      ]);

      const { data, error: fetchError } = reviewsResult;
      if (fetchError) throw fetchError;

      // If we have reviews and a user, fetch their votes
      let reviewsWithVotes = data || [];
      if (user && data && data.length > 0) {
        const reviewIds = data.map(r => r.id);
        const { data: votes } = await supabase
          .from('review_helpful_votes')
          .select('review_id')
          .eq('user_id', user.id)
          .in('review_id', reviewIds);

        const userVotes = new Set(votes?.map(v => v.review_id) || []);
        reviewsWithVotes = data.map(review => ({
          ...review,
          user_helpful_vote: userVotes.has(review.id)
        }));
      }

      if (reset) {
        setReviews(reviewsWithVotes);
      } else {
        setReviews(prev => [...prev, ...reviewsWithVotes]);
      }

      setHasMore(data?.length === limit);
      hasLoadedData.current = true;
      lastFetchTime.current = now;
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [userId, listingId, reviewerId, limit, offset, user]);

  useEffect(() => {
    fetchReviews(true);
  }, [fetchReviews]);

  const refresh = useCallback(() => {
    fetchReviews(true, true); // Force refresh
  }, [fetchReviews]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchReviews(false);
    }
  }, [loading, hasMore, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    hasMore,
    refresh,
    loadMore
  };
}

// Hook to get review statistics
export function useReviewStats(userId: string) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all published reviews for the user
      const { data: reviews, error: fetchError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_user_id', userId)
        .eq('status', 'published');

      if (fetchError) throw fetchError;

      if (!reviews || reviews.length === 0) {
        setStats({
          total_reviews: 0,
          average_rating: 0,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
        return;
      }

      // Calculate statistics
      const total_reviews = reviews.length;
      const average_rating = reviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews;
      
      const rating_distribution = reviews.reduce((dist, r) => {
        dist[r.rating as keyof typeof dist]++;
        return dist;
      }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

      setStats({
        total_reviews,
        average_rating: Math.round(average_rating * 10) / 10, // Round to 1 decimal
        rating_distribution
      });
    } catch (err) {
      console.error('Error fetching review stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch review stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

  // Set up real-time subscription for review changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`review-stats-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `reviewed_user_id=eq.${userId}`
        },
        () => {
          // Refresh stats when reviews change
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Return refresh function so components can manually refresh stats
  return { stats, loading, error, refresh: fetchStats };
}

// Hook to create a new review
export function useCreateReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const createReview = useCallback(async (reviewData: CreateReviewData) => {
    if (!user) {
      throw new Error('Must be logged in to create a review');
    }

    try {
      setLoading(true);
      setError(null);

      // Moderate review comment before creating
      const moderationResult = await contentModerationService.moderateContent({
        id: 'temp-review-id',
        type: 'comment', // Reviews are similar to comments
        userId: user.id,
        content: reviewData.comment,
      });

      // Check if content is approved
      if (!moderationResult.isApproved) {
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
        
        throw new Error(`Your review cannot be published:\n\n• ${flagReasons}\n\nPlease review and modify your content, then try again.`);
      }

      const { data, error: createError } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          ...reviewData,
          status: moderationResult.requiresManualReview ? 'hidden' : 'published',
        })
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          reviewed:profiles!reviews_reviewed_user_fkey(
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .single();

      if (createError) throw createError;

      // Log moderation result with actual review ID
      if (data?.id) {
        try {
          await contentModerationService.moderateContent({
            id: data.id,
            type: 'comment',
            userId: user.id,
            content: reviewData.comment,
          });
        } catch (logError) {
          console.error('Failed to log moderation result:', logError);
        }
      }

      // Award reputation points to the reviewed user
      if (data) {
        try {
          await reputationService.updateReviewStats(
            reviewData.reviewed_user_id,
            data.rating >= 4 // 4+ stars is positive
          );
          console.log('Reputation updated for reviewed user');
        } catch (repError) {
          console.error('Failed to update reputation:', repError);
          // Don't fail review creation if reputation update fails
        }
      }

      return data;
    } catch (err) {
      console.error('Error creating review:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { createReview, loading, error };
}

// Hook to update a review
export function useUpdateReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const updateReview = useCallback(async (reviewId: string, updateData: UpdateReviewData) => {
    if (!user) {
      throw new Error('Must be logged in to update a review');
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', reviewId)
        .eq('reviewer_id', user.id) // Ensure user can only update their own reviews
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          reviewed:profiles!reviews_reviewed_user_fkey(
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .single();

      if (updateError) throw updateError;

      return data;
    } catch (err) {
      console.error('Error updating review:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { updateReview, loading, error };
}

// Note: Review deletion is disabled for data integrity
// Users can only edit their reviews, not delete them

// Hook to toggle helpful vote on a review
export function useReviewHelpfulVote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const toggleHelpfulVote = useCallback(async (reviewId: string, currentlyVoted: boolean) => {
    if (!user) {
      throw new Error('Must be logged in to vote on reviews');
    }

    try {
      setLoading(true);
      setError(null);

      // First check if the user is the reviewer (prevent self-voting)
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .select('reviewer_id')
        .eq('id', reviewId)
        .single();

      if (reviewError) throw reviewError;

      if (review.reviewer_id === user.id) {
        throw new Error('You cannot vote on your own review');
      }

      if (currentlyVoted) {
        // Remove vote
        const { error: deleteError } = await supabase
          .from('review_helpful_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Decrement helpful count using RPC function
        const { error: updateError } = await supabase
          .rpc('decrement_review_helpful_count', { review_id: reviewId });

        if (updateError) throw updateError;

        return false; // No longer voted
      } else {
        // Add vote
        const { error: insertError } = await supabase
          .from('review_helpful_votes')
          .insert({
            review_id: reviewId,
            user_id: user.id
          });

        if (insertError) throw insertError;

        // Increment helpful count using RPC function
        const { error: updateError } = await supabase
          .rpc('increment_review_helpful_count', { review_id: reviewId });

        if (updateError) throw updateError;

        return true; // Now voted
      }
    } catch (err) {
      console.error('Error toggling helpful vote:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update vote';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { toggleHelpfulVote, loading, error };
}
