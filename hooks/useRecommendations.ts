import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { listingCache } from '@/utils/AdvancedCache';

export interface RecommendationListing {
  listing_id: string;
  title: string;
  price: number;
  currency: string;
  images: string[];
  location: string;
  category_name: string;
  subcategory_name: string;
  user_id: string;
  seller_name: string;
  seller_avatar?: string;
  status?: string;
  recommendation_score?: number;
  recommendation_reason?: string;
  trending_score?: number;
  distance_km?: number;
  similarity_score?: number;
  co_interaction_score?: number;
  viewed_at?: string;
  boost_weight?: number;
  boost_type?: string;
  favorites_count?: number;
}

export interface RecommendationOptions {
  limit?: number;
  offset?: number;
  userLocation?: string;
  boostType?: string;
}

// Simple cache to prevent duplicate API calls
const recommendationCache = new Map<string, { data: RecommendationListing[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useRecommendations() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Track user interaction
  const trackInteraction = useCallback(async (
    listingId: string,
    interactionType: 'view' | 'favorite' | 'offer' | 'purchase' | 'share' | 'contact',
    metadata: Record<string, any> = {}
  ) => {
    if (!user) return;

    try {
      // First check if this is the user's own listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('user_id')
        .eq('id', listingId)
        .single();

      if (listingError) {
        // Handle specific error cases - if listing doesn't exist, don't track
        if (listingError.code === 'PGRST116' || listingError.message.includes('0 rows')) {
          console.log('Listing not found, skipping interaction tracking');
          return;
        }
        console.error('Error fetching listing:', listingError);
        return;
      }

      // Don't track interactions with user's own listings
      if (listing.user_id === user.id) {
        return;
      }

      const { error } = await supabase.rpc('track_user_interaction', {
        p_user_id: user.id,
        p_listing_id: listingId,
        p_interaction_type: interactionType,
        p_metadata: metadata
      });

      if (error) {
        console.error('Error tracking interaction:', error);
      }
    } catch (err) {
      console.error('Error tracking interaction:', err);
    }
  }, [user]);

  // Get personalized recommendations with caching
  const getPersonalizedRecommendations = useCallback(async (
    options: RecommendationOptions = {}
  ): Promise<RecommendationListing[]> => {
    if (!user) return [];

    const cacheKey = `personalized_${user.id}_${options.limit || 20}_${options.offset || 0}`;
    const cached = recommendationCache.get(cacheKey);
    
    // Return cached data if it's still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_personalized_recommendations', {
        p_user_id: user.id,
        p_limit: options.limit || 20,
        p_offset: options.offset || 0
      });

      if (error) throw error;

      const result = data || [];
      
      // Cache the result
      recommendationCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get personalized recommendations';
      setError(errorMessage);
      console.error('Error getting personalized recommendations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get trending listings near user
  const getTrendingNearUser = useCallback(async (
    options: RecommendationOptions = {}
  ): Promise<RecommendationListing[]> => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_trending_near_user', {
        p_user_id: user.id,
        p_user_location: options.userLocation || null,
        p_limit: options.limit || 20,
        p_offset: options.offset || 0
      });

      if (error) throw error;

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get trending listings';
      setError(errorMessage);
      console.error('Error getting trending listings:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get category-based recommendations
  const getCategoryRecommendations = useCallback(async (
    listingId: string,
    options: RecommendationOptions = {}
  ): Promise<RecommendationListing[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_category_recommendations', {
        p_listing_id: listingId,
        p_limit: options.limit || 10,
        p_offset: options.offset || 0
      });

      if (error) throw error;

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get category recommendations';
      setError(errorMessage);
      console.error('Error getting category recommendations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get recently viewed items
  const getRecentlyViewed = useCallback(async (
    options: RecommendationOptions = {}
  ): Promise<RecommendationListing[]> => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_recently_viewed', {
        p_user_id: user.id,
        p_limit: options.limit || 20,
        p_offset: options.offset || 0
      });

      if (error) throw error;

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get recently viewed';
      setError(errorMessage);
      console.error('Error getting recently viewed:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get collaborative filtering recommendations
  const getCollaborativeRecommendations = useCallback(async (
    listingId: string,
    options: RecommendationOptions = {}
  ): Promise<RecommendationListing[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_collaborative_recommendations', {
        p_listing_id: listingId,
        p_limit: options.limit || 10,
        p_offset: options.offset || 0
      });

      if (error) throw error;

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get collaborative recommendations';
      setError(errorMessage);
      console.error('Error getting collaborative recommendations:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get boosted listings
  const getBoostedListings = useCallback(async (
    options: RecommendationOptions = {}
  ): Promise<RecommendationListing[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_boosted_listings', {
        p_boost_type: options.boostType || null,
        p_limit: options.limit || 20,
        p_offset: options.offset || 0
      });

      if (error) throw error;

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get boosted listings';
      setError(errorMessage);
      console.error('Error getting boosted listings:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Record search history
  const recordSearchHistory = useCallback(async (
    searchQuery: string,
    searchFilters: Record<string, any> = {},
    resultsCount: number = 0,
    clickedListings: string[] = []
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('record_search_history', {
        p_user_id: user.id,
        p_search_query: searchQuery,
        p_search_filters: searchFilters,
        p_results_count: resultsCount,
        p_clicked_listings: clickedListings
      });

      if (error) {
        console.error('Error recording search history:', error);
      }
    } catch (err) {
      console.error('Error recording search history:', err);
    }
  }, [user]);

  // Get search suggestions
  const getSearchSuggestions = useCallback(async (
    query: string,
    limit: number = 10
  ): Promise<{ suggestion_id: string; suggestion_text: string; suggestion_type: string; relevance_score: number }[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_search_suggestions', {
        p_user_id: user.id,
        p_query: query,
        p_limit: limit
      });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error getting search suggestions:', err);
      return [];
    }
  }, [user]);

  // Refresh trigger function
  const refreshRecommendations = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    loading,
    error,
    refreshTrigger,
    trackInteraction,
    getPersonalizedRecommendations,
    getTrendingNearUser,
    getCategoryRecommendations,
    getRecentlyViewed,
    getCollaborativeRecommendations,
    getBoostedListings,
    recordSearchHistory,
    getSearchSuggestions,
    refreshRecommendations
  };
}
