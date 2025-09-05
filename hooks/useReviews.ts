import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  listing_id: string | null;
  rating: number;
  comment: string;
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
  reviewed_id: string;
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

  const { userId, listingId, reviewerId, limit = 20, offset = 0 } = options;

  const fetchReviews = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          reviewed:profiles!reviews_reviewed_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (userId) {
        query = query.eq('reviewed_id', userId);
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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Check if user has voted on each review (if logged in)
      let reviewsWithVotes = data || [];
      if (user && data) {
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

      // Fetch listing information separately if needed
      if (data && data.length > 0) {
        const listingIds = data.filter(r => r.listing_id).map(r => r.listing_id);
        if (listingIds.length > 0) {
          try {
            const { data: listings } = await supabase
              .from('listings')
              .select('id, title, images')
              .in('id', listingIds);

            if (listings) {
              const listingsMap = new Map(listings.map(l => [l.id, l]));
              reviewsWithVotes = reviewsWithVotes.map(review => ({
                ...review,
                listing: review.listing_id ? listingsMap.get(review.listing_id) : null
              }));
            }
          } catch (listingError) {
            console.warn('Could not fetch listing information:', listingError);
            // Continue without listing info - this is not critical
          }
        }
      }

      if (reset) {
        setReviews(reviewsWithVotes);
      } else {
        setReviews(prev => [...prev, ...reviewsWithVotes]);
      }

      setHasMore(data?.length === limit);
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
    fetchReviews(true);
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get all reviews for the user
        const { data: reviews, error: fetchError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewed_id', userId);

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

    if (userId) {
      fetchStats();
    }
  }, [userId]);

  return { stats, loading, error };
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

      const { data, error: createError } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          ...reviewData
        })
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          reviewed:profiles!reviews_reviewed_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          )
        `)
        .single();

      if (createError) throw createError;

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
          reviewer:profiles!reviews_reviewer_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          reviewed:profiles!reviews_reviewed_id_fkey(
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

// Hook to delete a review
export function useDeleteReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const deleteReview = useCallback(async (reviewId: string) => {
    if (!user) {
      throw new Error('Must be logged in to delete a review');
    }

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', user.id); // Ensure user can only delete their own reviews

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      console.error('Error deleting review:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { deleteReview, loading, error };
}

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

      if (currentlyVoted) {
        // Remove vote
        const { error: deleteError } = await supabase
          .from('review_helpful_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Decrement helpful count
        const { error: updateError } = await supabase
          .from('reviews')
          .update({ helpful_count: (supabase as any).raw('helpful_count - 1') })
          .eq('id', reviewId);

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

        // Increment helpful count
        const { error: updateError } = await supabase
          .from('reviews')
          .update({ helpful_count: (supabase as any).raw('helpful_count + 1') })
          .eq('id', reviewId);

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
