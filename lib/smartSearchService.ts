import { supabase } from './supabase';

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  userId?: string;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'popularity';
  radius?: number; // km radius for location search
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  condition: string;
  location: string;
  images: string[];
  user_id: string;
  category_id: string;
  created_at: string;
  views: number;
  featured: boolean;
  boost_level: number;
  
  // Joined data
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    is_business: boolean;
    business_name?: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  };
  
  // Search metadata
  relevance_score?: number;
  search_rank?: number;
  match_type?: 'title' | 'description' | 'category' | 'location' | 'user';
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'category' | 'location' | 'user';
  count?: number;
  icon?: string;
}

export interface SearchAnalytics {
  query: string;
  results_count: number;
  user_id?: string;
  filters?: SearchFilters;
  clicked_result_id?: string;
  search_duration_ms: number;
  created_at: string;
}

class SmartSearchService {
  private searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Main search function that combines multiple search strategies
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    options: {
      limit?: number;
      offset?: number;
      enableCache?: boolean;
      trackAnalytics?: boolean;
    } = {}
  ): Promise<{
    results: SearchResult[];
    total_count: number;
    search_time_ms: number;
    suggestions?: SearchSuggestion[];
  }> {
    const startTime = Date.now();
    const { limit = 20, offset = 0, enableCache = true, trackAnalytics = true } = options;
    
    // Check cache first
    const cacheKey = this.getCacheKey(query, filters, limit, offset);
    if (enableCache && this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return {
          results: cached.results,
          total_count: cached.results.length,
          search_time_ms: Date.now() - startTime,
        };
      }
    }

    try {
      let results: SearchResult[] = [];
      let totalCount = 0;

      if (query.trim()) {
        // Perform semantic search with full-text search
        const searchResults = await this.performSemanticSearch(query, filters, limit, offset);
        results = searchResults.results;
        totalCount = searchResults.total_count;
      } else {
        // No query - return filtered browsing results
        const browseResults = await this.performBrowseSearch(filters, limit, offset);
        results = browseResults.results;
        totalCount = browseResults.total_count;
      }

      // Apply ranking and boost featured/boosted listings
      results = this.applyRankingBoosts(results, query);

      // Cache results
      if (enableCache) {
        this.searchCache.set(cacheKey, {
          results,
          timestamp: Date.now()
        });
      }

      const searchTime = Date.now() - startTime;

      // Track analytics
      if (trackAnalytics) {
        this.trackSearchAnalytics(query, filters, results.length, searchTime);
      }

      // Get suggestions for empty or low-result queries
      let suggestions: SearchSuggestion[] | undefined;
      if (query.trim() && results.length < 3) {
        suggestions = await this.getSearchSuggestions(query);
      }

      return {
        results,
        total_count: totalCount,
        search_time_ms: searchTime,
        suggestions
      };

    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Search failed. Please try again.');
    }
  }

  /**
   * Semantic search using PostgreSQL full-text search
   */
  private async performSemanticSearch(
    query: string,
    filters: SearchFilters,
    limit: number,
    offset: number
  ): Promise<{ results: SearchResult[]; total_count: number }> {
    let searchQuery = supabase
      .from('listings')
      .select(`
        *,
        user:profiles!listings_user_id_fkey(
          id,
          full_name,
          avatar_url,
          is_business,
          business_name
        ),
        category:categories(
          id,
          name,
          slug,
          icon
        )
      `, { count: 'exact' })
      .eq('status', 'active');

    // Full-text search on title and description
    const searchTerms = query.trim().split(/\s+/).join(' | ');
    searchQuery = searchQuery.or(
      `title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`
    );

    // Apply filters
    searchQuery = this.applyFilters(searchQuery, filters);

    // Apply sorting
    searchQuery = this.applySorting(searchQuery, filters.sortBy || 'relevance', query);

    // Apply pagination
    searchQuery = searchQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await searchQuery;

    if (error) throw error;

    return {
      results: (data || []) as SearchResult[],
      total_count: count || 0
    };
  }

  /**
   * Browse search for when no query is provided
   */
  private async performBrowseSearch(
    filters: SearchFilters,
    limit: number,
    offset: number
  ): Promise<{ results: SearchResult[]; total_count: number }> {
    let browseQuery = supabase
      .from('listings')
      .select(`
        *,
        user:profiles!listings_user_id_fkey(
          id,
          full_name,
          avatar_url,
          is_business,
          business_name
        ),
        category:categories(
          id,
          name,
          slug,
          icon
        )
      `, { count: 'exact' })
      .eq('status', 'active');

    // Apply filters
    browseQuery = this.applyFilters(browseQuery, filters);

    // Default sorting for browse (featured first, then recent)
    browseQuery = browseQuery
      .order('featured', { ascending: false })
      .order('boost_level', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply pagination
    browseQuery = browseQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await browseQuery;

    if (error) throw error;

    return {
      results: (data || []) as SearchResult[],
      total_count: count || 0
    };
  }

  /**
   * Apply search filters to query
   */
  private applyFilters(query: any, filters: SearchFilters) {
    if (filters.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.condition) {
      query = query.eq('condition', filters.condition);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    return query;
  }

  /**
   * Apply sorting to search results
   */
  private applySorting(query: any, sortBy: string, searchQuery?: string) {
    switch (sortBy) {
      case 'price_asc':
        return query.order('price', { ascending: true });
      case 'price_desc':
        return query.order('price', { ascending: false });
      case 'date_asc':
        return query.order('created_at', { ascending: true });
      case 'date_desc':
        return query.order('created_at', { ascending: false });
      case 'popularity':
        return query.order('views', { ascending: false });
      case 'relevance':
      default:
        // For relevance, prioritize featured, boost level, then recency
        return query
          .order('featured', { ascending: false })
          .order('boost_level', { ascending: false })
          .order('created_at', { ascending: false });
    }
  }

  /**
   * Apply ranking boosts to search results
   */
  private applyRankingBoosts(results: SearchResult[], query: string): SearchResult[] {
    return results.map((result, index) => {
      let relevanceScore = 100 - index; // Base relevance by position

      // Boost for exact title matches
      if (result.title.toLowerCase().includes(query.toLowerCase())) {
        relevanceScore += 50;
      }

      // Boost for featured listings
      if (result.featured) {
        relevanceScore += 30;
      }

      // Boost for boost level
      relevanceScore += result.boost_level * 10;

      // Boost for business accounts
      if (result.user?.is_business) {
        relevanceScore += 15;
      }

      // Boost for recent listings (within 7 days)
      const daysSinceCreated = (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated <= 7) {
        relevanceScore += 20;
      }

      return {
        ...result,
        relevance_score: relevanceScore,
        search_rank: index + 1
      };
    }).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    try {
      // Category suggestions
      const { data: categories } = await supabase
        .from('categories')
        .select('name, slug, icon')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(3);

      if (categories) {
        suggestions.push(...categories.map(cat => ({
          text: cat.name,
          type: 'category' as const,
          icon: cat.icon
        })));
      }

      // Popular search terms (from analytics)
      const { data: popularSearches } = await supabase
        .from('search_analytics')
        .select('query, count(*)')
        .ilike('query', `%${query}%`)
        .not('query', 'eq', query)
        .order('count', { ascending: false })
        .limit(5);

      if (popularSearches) {
        suggestions.push(...popularSearches.map(search => ({
          text: (search as any).query,
          type: 'query' as const,
          count: (search as any).count
        })));
      }

      // Location suggestions
      const { data: locations } = await supabase
        .from('listings')
        .select('location, count(*)')
        .ilike('location', `%${query}%`)
        .eq('status', 'active')
        .order('count', { ascending: false })
        .limit(3);

      if (locations) {
        suggestions.push(...locations.map(loc => ({
          text: (loc as any).location,
          type: 'location' as const,
          count: (loc as any).count
        })));
      }

    } catch (error) {
      console.warn('Failed to get search suggestions:', error);
    }

    return suggestions.slice(0, 8); // Limit total suggestions
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const { data } = await supabase
        .from('search_analytics')
        .select('query, count(*) as search_count')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('search_count', { ascending: false })
        .limit(limit);

      return (data || []).map(item => ({
        text: (item as any).query,
        type: 'query' as const,
        count: (item as any).search_count
      }));
    } catch (error) {
      console.warn('Failed to get trending searches:', error);
      return [];
    }
  }

  /**
   * Track search analytics
   */
  private async trackSearchAnalytics(
    query: string,
    filters: SearchFilters,
    resultsCount: number,
    searchDuration: number
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('search_analytics')
        .insert({
          query: query.trim(),
          results_count: resultsCount,
          user_id: user?.id,
          filters: filters,
          search_duration_ms: searchDuration,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to track search analytics:', error);
    }
  }

  /**
   * Track search result clicks
   */
  async trackSearchClick(query: string, resultId: string, position: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('search_analytics')
        .insert({
          query: query.trim(),
          clicked_result_id: resultId,
          click_position: position,
          user_id: user?.id,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to track search click:', error);
    }
  }

  /**
   * Generate cache key for search results
   */
  private getCacheKey(query: string, filters: SearchFilters, limit: number, offset: number): string {
    return `search:${query}:${JSON.stringify(filters)}:${limit}:${offset}`;
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * Get search history for user
   */
  async getSearchHistory(userId: string, limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      const { data } = await supabase
        .from('search_analytics')
        .select('query, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      const uniqueQueries = Array.from(new Set((data || []).map(item => item.query)));
      
      return uniqueQueries.map(query => ({
        text: query,
        type: 'query' as const
      }));
    } catch (error) {
      console.warn('Failed to get search history:', error);
      return [];
    }
  }
}

export const smartSearchService = new SmartSearchService();
