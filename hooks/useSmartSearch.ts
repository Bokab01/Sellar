import { useState, useEffect, useCallback, useMemo } from 'react';
import { smartSearchService, SearchFilters, SearchResult, SearchSuggestion } from '@/lib/smartSearchService';
import { useAuthStore } from '@/store/useAuthStore';

export interface UseSmartSearchOptions {
  initialQuery?: string;
  initialFilters?: SearchFilters;
  autoSearch?: boolean;
  debounceMs?: number;
  enableCache?: boolean;
  trackAnalytics?: boolean;
}

export function useSmartSearch(options: UseSmartSearchOptions = {}) {
  const {
    initialQuery = '',
    initialFilters = {},
    autoSearch = true,
    debounceMs = 300,
    enableCache = true,
    trackAnalytics = true
  } = options;

  const { user } = useAuthStore();
  
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters, resetResults: boolean = true) => {
      if (!autoSearch && !searchQuery.trim()) return;

      try {
        setLoading(true);
        setError(null);

        const searchOffset = resetResults ? 0 : offset;
        const response = await smartSearchService.search(
          searchQuery,
          searchFilters,
          {
            limit: 20,
            offset: searchOffset,
            enableCache,
            trackAnalytics
          }
        );

        if (resetResults) {
          setResults(response.results);
          setOffset(20);
        } else {
          setResults(prev => [...prev, ...response.results]);
          setOffset(prev => prev + 20);
        }

        setTotalCount(response.total_count);
        setSearchTime(response.search_time_ms);
        setHasMore(response.results.length === 20);
        setSuggestions(response.suggestions || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, debounceMs),
    [autoSearch, enableCache, trackAnalytics, offset]
  );

  // Perform search
  const search = useCallback((newQuery?: string, newFilters?: SearchFilters, resetResults = true) => {
    const searchQuery = newQuery !== undefined ? newQuery : query;
    const searchFilters = newFilters !== undefined ? newFilters : filters;
    
    if (newQuery !== undefined) setQuery(newQuery);
    if (newFilters !== undefined) setFilters(newFilters);
    
    debouncedSearch(searchQuery, searchFilters, resetResults);
  }, [query, filters, debouncedSearch]);

  // Load more results
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      search(query, filters, false);
    }
  }, [loading, hasMore, query, filters, search]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotalCount(0);
    setOffset(0);
    setHasMore(false);
    setError(null);
  }, []);

  // Update query
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    if (autoSearch) {
      search(newQuery, filters);
    }
  }, [autoSearch, filters, search]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    search(query, updatedFilters);
  }, [query, filters, search]);

  // Track result click
  const trackClick = useCallback((result: SearchResult, position: number) => {
    smartSearchService.trackSearchClick(query, result.id, position);
  }, [query]);

  // Auto-search when query or filters change
  useEffect(() => {
    if (autoSearch && (query || Object.keys(filters).length > 0)) {
      search();
    }
  }, [query, filters, autoSearch, search]);

  return {
    // State
    query,
    filters,
    results,
    suggestions,
    loading,
    error,
    totalCount,
    searchTime,
    hasMore,
    
    // Actions
    search,
    updateQuery,
    updateFilters,
    loadMore,
    clearSearch,
    trackClick,
    
    // Computed
    isEmpty: results.length === 0 && !loading,
    hasResults: results.length > 0,
    isSearching: loading && results.length === 0,
  };
}

// Hook for search suggestions
export function useSearchSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        const suggestions = await smartSearchService.getSearchSuggestions(searchQuery);
        setSuggestions(suggestions);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200),
    []
  );

  useEffect(() => {
    getSuggestions(query);
  }, [query, getSuggestions]);

  return { suggestions, loading };
}

// Hook for trending searches
export function useTrendingSearches() {
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        const trendingSearches = await smartSearchService.getTrendingSearches(10);
        setTrending(trendingSearches);
      } catch (error) {
        console.error('Failed to fetch trending searches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return { trending, loading };
}

// Hook for search history
export function useSearchHistory() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const searchHistory = await smartSearchService.getSearchHistory(user.id, 10);
        setHistory(searchHistory);
      } catch (error) {
        console.error('Failed to fetch search history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  return { history, loading };
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
