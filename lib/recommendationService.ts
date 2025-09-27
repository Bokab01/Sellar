import { supabase } from './supabase';

export interface InteractionMetadata {
  searchQuery?: string;
  timeSpent?: number;
  source?: string; // 'home', 'search', 'category', 'recommendation'
  deviceType?: string;
  location?: string;
}

export class RecommendationService {
  /**
   * Track user interaction with a listing
   */
  static async trackInteraction(
    userId: string,
    listingId: string,
    interactionType: 'view' | 'favorite' | 'offer' | 'purchase' | 'share' | 'contact',
    metadata: InteractionMetadata = {}
  ) {
    try {
      const { error } = await supabase.rpc('track_user_interaction', {
        p_user_id: userId,
        p_listing_id: listingId,
        p_interaction_type: interactionType,
        p_metadata: metadata
      });

      if (error) {
        console.error('Error tracking interaction:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking interaction:', error);
      return { success: false, error };
    }
  }

  /**
   * Track listing view with additional context
   */
  static async trackView(
    userId: string,
    listingId: string,
    metadata: InteractionMetadata = {}
  ) {
    return this.trackInteraction(userId, listingId, 'view', metadata);
  }

  /**
   * Track listing favorite
   */
  static async trackFavorite(
    userId: string,
    listingId: string,
    metadata: InteractionMetadata = {}
  ) {
    return this.trackInteraction(userId, listingId, 'favorite', metadata);
  }

  /**
   * Track offer made
   */
  static async trackOffer(
    userId: string,
    listingId: string,
    metadata: InteractionMetadata = {}
  ) {
    return this.trackInteraction(userId, listingId, 'offer', metadata);
  }

  /**
   * Track purchase
   */
  static async trackPurchase(
    userId: string,
    listingId: string,
    metadata: InteractionMetadata = {}
  ) {
    return this.trackInteraction(userId, listingId, 'purchase', metadata);
  }

  /**
   * Track share
   */
  static async trackShare(
    userId: string,
    listingId: string,
    metadata: InteractionMetadata = {}
  ) {
    return this.trackInteraction(userId, listingId, 'share', metadata);
  }

  /**
   * Track contact (message/call)
   */
  static async trackContact(
    userId: string,
    listingId: string,
    metadata: InteractionMetadata = {}
  ) {
    return this.trackInteraction(userId, listingId, 'contact', metadata);
  }

  /**
   * Record search history
   */
  static async recordSearch(
    userId: string,
    searchQuery: string,
    searchFilters: Record<string, any> = {},
    resultsCount: number = 0,
    clickedListings: string[] = []
  ) {
    try {
      const { error } = await supabase.rpc('record_search_history', {
        p_user_id: userId,
        p_search_query: searchQuery,
        p_search_filters: searchFilters,
        p_results_count: resultsCount,
        p_clicked_listings: clickedListings
      });

      if (error) {
        console.error('Error recording search history:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording search history:', error);
      return { success: false, error };
    }
  }

  /**
   * Get user's interaction history
   */
  static async getUserInteractions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          *,
          listings (
            id,
            title,
            price,
            currency,
            images,
            location,
            categories (name),
            subcategories (name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching user interactions:', error);
        return { success: false, error, data: null };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return { success: false, error, data: null };
    }
  }

  /**
   * Get user's preferences
   */
  static async getUserPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select(`
          *,
          categories (name),
          subcategories (name)
        `)
        .eq('user_id', userId)
        .order('preference_score', { ascending: false });

      if (error) {
        console.error('Error fetching user preferences:', error);
        return { success: false, error, data: null };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return { success: false, error, data: null };
    }
  }

  /**
   * Get listing popularity data
   */
  static async getListingPopularity(listingId: string) {
    try {
      const { data, error } = await supabase
        .from('listing_popularity')
        .select('*')
        .eq('listing_id', listingId)
        .single();

      if (error) {
        console.error('Error fetching listing popularity:', error);
        return { success: false, error, data: null };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching listing popularity:', error);
      return { success: false, error, data: null };
    }
  }

  /**
   * Get boosted listings for a specific type
   */
  static async getBoostedListings(
    boostType?: string,
    limit: number = 20,
    offset: number = 0
  ) {
    try {
      const { data, error } = await supabase.rpc('get_boosted_listings', {
        p_boost_type: boostType || null,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching boosted listings:', error);
        return { success: false, error, data: null };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching boosted listings:', error);
      return { success: false, error, data: null };
    }
  }

  /**
   * Clear user's recently viewed items
   */
  static async clearRecentlyViewed(userId: string) {
    try {
      const { error } = await supabase
        .from('recently_viewed')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing recently viewed:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
      return { success: false, error };
    }
  }

  /**
   * Clear user's search history
   */
  static async clearSearchHistory(userId: string) {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing search history:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error clearing search history:', error);
      return { success: false, error };
    }
  }

  /**
   * Get analytics for admin dashboard
   */
  static async getRecommendationAnalytics() {
    try {
      const [
        { data: totalInteractions },
        { data: totalSearches },
        { data: popularCategories },
        { data: trendingListings }
      ] = await Promise.all([
        supabase
          .from('user_interactions')
          .select('id', { count: 'exact' }),
        
        supabase
          .from('search_history')
          .select('id', { count: 'exact' }),
        
        supabase
          .from('user_preferences')
          .select(`
            preference_score,
            categories (name)
          `)
          .order('preference_score', { ascending: false })
          .limit(10),
        
        supabase
          .from('listing_popularity')
          .select(`
            popularity_score,
            trending_score,
            listings (title, price, currency)
          `)
          .order('trending_score', { ascending: false })
          .limit(10)
      ]);

      return {
        success: true,
        data: {
          totalInteractions: totalInteractions?.length || 0,
          totalSearches: totalSearches?.length || 0,
          popularCategories,
          trendingListings
        }
      };
    } catch (error) {
      console.error('Error fetching recommendation analytics:', error);
      return { success: false, error, data: null };
    }
  }

}
