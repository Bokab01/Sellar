import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase-client';

export interface TransactionBasedReview {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  transaction_id: string;
  listing_id: string;
  rating: number;
  comment: string;
  review_type: 'buyer_to_seller' | 'seller_to_buyer';
  is_transaction_confirmed: boolean;
  verification_level: 'unconfirmed' | 'single_confirmed' | 'mutual_confirmed';
  reviewer_verification_score: number;
  transaction_value: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  reviewer: {
    id: string;
    full_name: string;
    avatar_url?: string;
    username?: string;
  };
  transaction?: {
    id: string;
    agreed_price: number;
    status: string;
    listing: {
      title: string;
    };
  };
}

export interface CreateTransactionReviewData {
  reviewed_user_id: string;
  meetup_transaction_id: string;
  listing_id: string;
  rating: number;
  comment: string;
  review_type: 'buyer_to_seller' | 'seller_to_buyer';
}

// Hook to get transaction-based reviews
export function useTransactionBasedReviews(options: {
  userId?: string;
  transactionId?: string;
  verificationLevel?: 'all' | 'verified_only';
  limit?: number;
  offset?: number;
} = {}) {
  const [reviews, setReviews] = useState<TransactionBasedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

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
          transaction:meetup_transactions!reviews_meetup_transaction_id_fkey(
            id,
            agreed_price,
            status,
            listing:listings(title)
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      // Apply filters
      if (options.userId) {
        query = query.eq('reviewed_user_id', options.userId);
      }

      if (options.transactionId) {
        query = query.eq('meetup_transaction_id', options.transactionId);
      }

      if (options.verificationLevel === 'verified_only') {
        query = query.eq('is_transaction_confirmed', true);
      }

      // Pagination
      const limit = options.limit || 20;
      const offset = reset ? 0 : (options.offset || 0);
      query = query.range(offset, offset + limit - 1);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const newReviews = data || [];
      
      if (reset) {
        setReviews(newReviews);
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }

      setHasMore(newReviews.length === limit);
    } catch (err) {
      console.error('Error fetching transaction-based reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.transactionId, options.verificationLevel, options.limit, options.offset]);

  useEffect(() => {
    fetchReviews(true);
  }, [fetchReviews]);

  const refresh = useCallback(() => {
    return fetchReviews(true);
  }, [fetchReviews]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      return fetchReviews(false);
    }
  }, [loading, hasMore, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
  };
}

// Hook to create transaction-based reviews
export function useCreateTransactionBasedReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const createReview = useCallback(async (reviewData: CreateTransactionReviewData) => {
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
          ...reviewData,
        })
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(
            id,
            full_name,
            avatar_url,
            username
          ),
          transaction:meetup_transactions!reviews_meetup_transaction_id_fkey(
            id,
            agreed_price,
            status,
            listing:listings(title)
          )
        `)
        .single();

      if (createError) throw createError;

      return data;
    } catch (err) {
      console.error('Error creating transaction-based review:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { createReview, loading, error };
}

// Hook to get user's transaction-based review stats
export function useTransactionBasedReviewStats(userId: string) {
  const [stats, setStats] = useState<{
    total_reviews: number;
    confirmed_reviews: number;
    average_rating: number;
    confirmed_rating: number;
    verification_breakdown: {
      mutual_confirmed: number;
      single_confirmed: number;
      unconfirmed: number;
    };
  } | null>(null);
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
          .select('rating, verification_level, is_transaction_confirmed')
          .eq('reviewed_user_id', userId)
          .eq('status', 'published');

        if (fetchError) throw fetchError;

        if (!reviews || reviews.length === 0) {
          setStats({
            total_reviews: 0,
            confirmed_reviews: 0,
            average_rating: 0,
            confirmed_rating: 0,
            verification_breakdown: {
              mutual_confirmed: 0,
              single_confirmed: 0,
              unconfirmed: 0,
            },
          });
          return;
        }

        // Calculate statistics
        const total_reviews = reviews.length;
        const confirmed_reviews = reviews.filter(r => r.is_transaction_confirmed).length;
        const average_rating = reviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews;
        const confirmed_rating = confirmed_reviews > 0 
          ? reviews.filter(r => r.is_transaction_confirmed).reduce((sum, r) => sum + r.rating, 0) / confirmed_reviews
          : 0;

        const verification_breakdown = reviews.reduce((acc, r) => {
          acc[r.verification_level as keyof typeof acc]++;
          return acc;
        }, {
          mutual_confirmed: 0,
          single_confirmed: 0,
          unconfirmed: 0,
        });

        setStats({
          total_reviews,
          confirmed_reviews,
          average_rating: Math.round(average_rating * 10) / 10,
          confirmed_rating: Math.round(confirmed_rating * 10) / 10,
          verification_breakdown,
        });
      } catch (err) {
        console.error('Error fetching transaction-based review stats:', err);
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

// Hook to get available transactions for review
export function useAvailableTransactionsForReview(userId: string) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get transactions where user participated but hasn't reviewed yet
        const { data, error: fetchError } = await supabase
          .from('meetup_transactions')
          .select(`
            *,
            listing:listings(id, title),
            buyer:profiles!meetup_transactions_buyer_id_fkey(id, full_name),
            seller:profiles!meetup_transactions_seller_id_fkey(id, full_name)
          `)
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .eq('status', 'confirmed')
          .not('id', 'in', `(
            SELECT meetup_transaction_id 
            FROM reviews 
            WHERE reviewer_id = '${userId}'
          )`);

        if (fetchError) throw fetchError;

        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching available transactions for review:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  return { transactions, loading, error };
}

// Hook to get trust metrics
export function useTrustMetrics(userId: string) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_user_trust_metrics', { p_user_id: userId });

      if (fetchError) throw fetchError;

      setMetrics(data);
    } catch (err) {
      console.error('Error fetching trust metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trust metrics');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchMetrics();
    }
  }, [userId, fetchMetrics]);

  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refresh };
}

// Hook for helpful votes on reviews
export function useReviewHelpfulVote() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const toggleHelpfulVote = useCallback(async (reviewId: string, isHelpful: boolean) => {
    if (!user) {
      throw new Error('Must be logged in to vote');
    }

    try {
      setLoading(true);

      // Check if user already voted
      const { data: existingVote, error: checkError } = await supabase
        .from('review_helpful_votes')
        .select('*')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingVote) {
        // Update existing vote
        const { error: updateError } = await supabase
          .from('review_helpful_votes')
          .update({ is_helpful: isHelpful })
          .eq('id', existingVote.id);

        if (updateError) throw updateError;
      } else {
        // Create new vote
        const { error: insertError } = await supabase
          .from('review_helpful_votes')
          .insert({
            review_id: reviewId,
            user_id: user.id,
            is_helpful: isHelpful,
          });

        if (insertError) throw insertError;
      }

      return true;
    } catch (err) {
      console.error('Error voting on review:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { toggleHelpfulVote, loading };
}
