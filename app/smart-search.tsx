import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { supabase } from '@/lib/supabase';
import { Search, Clock, TrendingUp, X, ArrowUpRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useRecommendations } from '@/hooks/useRecommendations';
import { EnhancedSearchBar } from '@/components/Search/EnhancedSearchBar';

interface SearchSuggestion {
  id: string;
  type: 'listing' | 'category' | 'recent' | 'trending';
  title: string;
  subtitle?: string;
  count?: number;
}

// AsyncStorage keys
const RECENT_SEARCHES_KEY = '@sellar_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export default function SmartSearchScreen() {
  const { theme } = useTheme();
  const { recordSearchHistory } = useRecommendations();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // AsyncStorage helper functions
  const loadRecentSearches = useCallback(async (): Promise<string[]> => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load recent searches:', error);
      return [];
    }
  }, []);

  const saveRecentSearches = useCallback(async (searches: string[]) => {
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch (error) {
      console.error('Failed to save recent searches:', error);
    }
  }, []);

  const addToRecentSearches = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    const current = await loadRecentSearches();
    const filtered = current.filter(search => search.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    
    setRecentSearches(updated);
    await saveRecentSearches(updated);
  }, [loadRecentSearches, saveRecentSearches]);

  const clearRecentSearches = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }, []);

  // Fetch trending categories based on actual listing counts
  const fetchTrendingCategories = useCallback(async () => {
    try {
      // Get categories with their listing counts
      const { data: categoryStats } = await supabase
        .rpc('get_category_listing_counts');

      if (categoryStats && categoryStats.length > 0) {
        return categoryStats.slice(0, 3).map((stat: any) => ({
          id: `category-${stat.category_id}`, // Use category- prefix for proper handling
          type: 'category' as const, // Change to category type for proper navigation
          title: stat.category_name,
          count: stat.listing_count,
        }));
      }

      // Fallback: get categories and count listings manually
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .limit(10);

      if (categories) {
        const categoriesWithCounts = await Promise.all(
          categories.map(async (category) => {
            const { count } = await supabase
              .from('listings')
              .select('*', { count: 'exact', head: true })
              .eq('category_id', category.id)
              .eq('status', 'active');
            
            return {
              id: `category-${category.id}`, // Use category- prefix for proper handling
              type: 'category' as const, // Change to category type for proper navigation
              title: category.name,
              count: count || 0,
            };
          })
        );

        // Sort by count and return top 3
        return categoriesWithCounts
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
      }

      return [];
    } catch (error) {
      console.error('Error fetching trending categories:', error);
      return [];
    }
  }, []);

  // Debounced search function
  const searchSuggestions = useCallback(async (query: string, currentRecentSearches: string[]) => {
    if (!query.trim()) {
      // Show recent searches and trending when no query
      const recent = currentRecentSearches.slice(0, 5).map((search, index) => ({
        id: `recent-${index}`,
        type: 'recent' as const,
        title: search,
      }));

      // Fetch real trending categories
      const trending = await fetchTrendingCategories();

      // Only show trending if we have categories with listings
      const validTrending = trending.filter((t: any) => t.count > 0);
      
      setSuggestions([...recent, ...validTrending]);
      return;
    }

    setLoading(true);
    try {
      // Search listings
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, category_id')
        .eq('status', 'active')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      // Search categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .limit(3);

      const newSuggestions: SearchSuggestion[] = [];

      // Add listing suggestions
      if (listings) {
        listings.forEach(listing => {
          newSuggestions.push({
            id: `listing-${listing.id}`,
            type: 'listing',
            title: listing.title,
            subtitle: 'Product',
          });
        });
      }

      // Add category suggestions
      if (categories) {
        categories.forEach(category => {
          newSuggestions.push({
            id: `category-${category.id}`,
            type: 'category',
            title: category.name,
            subtitle: 'Category',
          });
        });
      }

      // Add search query as an option
      if (query.length > 2) {
        newSuggestions.unshift({
          id: `search-${query}`,
          type: 'listing',
          title: `Search for "${query}"`,
          subtitle: 'See all results',
        });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Search suggestions error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchSuggestions(searchQuery, recentSearches);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, recentSearches]);

  // Load recent searches on mount
  useEffect(() => {
    const initializeRecentSearches = async () => {
      const stored = await loadRecentSearches();
      setRecentSearches(stored);
      searchSuggestions('', stored);
    };
    
    initializeRecentSearches();
  }, [loadRecentSearches, searchSuggestions]);

  const handleSuggestionPress = async (suggestion: SearchSuggestion) => {
    const query = suggestion.title.replace('Search for "', '').replace('"', '');
    
    // Add to recent searches with AsyncStorage persistence
    await addToRecentSearches(query);

    // Record search history in recommendation system
    await recordSearchHistory(query, {
      suggestionType: suggestion.type,
      suggestionId: suggestion.id
    });

    // Navigate to search results with different parameters based on suggestion type
    if (suggestion.type === 'category') {
      // For category suggestions, pass the category ID and name (NO search query)
      const categoryId = suggestion.id.replace('category-', '');
      router.push({
        pathname: '/search',
        params: { 
          category: categoryId,
          categoryName: suggestion.title
        }
      });
    } else {
      // For other suggestions, use regular text search
      router.push({
        pathname: '/search',
        params: { q: query }
      });
    }
  };

  const handleClearRecent = async () => {
    await clearRecentSearches();
    setSuggestions([]);
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'recent':
          return <Clock size={16} color={theme.colors.text.secondary} />;
        case 'trending':
          return <TrendingUp size={16} color={theme.colors.primary} />;
        case 'category':
          return <Search size={16} color={theme.colors.text.secondary} />;
        default:
          return <Search size={16} color={theme.colors.text.secondary} />;
      }
    };

    return (
      <TouchableOpacity
        onPress={() => handleSuggestionPress(item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
        activeOpacity={0.7}
      >
        <View style={{ marginRight: theme.spacing.md }}>
          {getIcon()}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text variant="body" numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text variant="caption" color="muted">
              {item.subtitle}
            </Text>
          )}
        </View>

        {item.count && (
          <Text variant="caption" color="muted">
            {item.count}
          </Text>
        )}

        <ArrowUpRight size={16} color={theme.colors.text.secondary} style={{ marginLeft: theme.spacing.sm }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Search"
        showBackButton
        onBackPress={() => router.back()}
      />

      <View style={{ flex: 1 }}>
        {/* Search Input */}
        <View style={{ 
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }}>
          <EnhancedSearchBar
            placeholder="Search for anything..."
            onSearch={async (query, filters) => {
              if (query.trim()) {
                // Record search history
                await recordSearchHistory(query, filters);
                
                // Navigate to search results
                router.push({
                  pathname: '/search',
                  params: { q: query }
                });
              }
            }}
            onSuggestionPress={(suggestion) => {
              handleSuggestionPress({
                id: 'search-suggestion',
                type: 'listing',
                title: suggestion
              });
            }}
          />
        </View>

        {/* Suggestions List */}
        <View style={{ flex: 1 }}>
          {loading && searchQuery ? (
            <View style={{ 
              padding: theme.spacing.xl,
              alignItems: 'center',
            }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="body" color="muted" style={{ marginTop: theme.spacing.md }}>
                Searching...
              </Text>
            </View>
          ) : (
            <>
              {/* Header */}
              {suggestions.length > 0 && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.md,
                  backgroundColor: theme.colors.surface,
                }}>
                  <Text variant="bodySmall" color="muted">
                    {searchQuery ? 'Suggestions' : 
                     (suggestions.some(s => s.type === 'category') ? 'Recent & Trending' : 'Recent Searches')}
                  </Text>
                  {!searchQuery && recentSearches.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={handleClearRecent}
                    >
                      Clear
                    </Button>
                  )}
                </View>
              )}

              {/* Suggestions */}
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                ListEmptyComponent={() => (
                  <View style={{ 
                    padding: theme.spacing.xl,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                  }}>
                    <Search size={48} color={theme.colors.text.secondary} />
                    <Text variant="h4" style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.md }}>
                      {searchQuery ? 'No suggestions found' : 'Start typing to search'}
                    </Text>
                    <Text variant="body" color="muted" style={{ textAlign: 'center' }}>
                      {searchQuery 
                        ? 'Try different keywords or check your spelling'
                        : 'Search for products, categories, or anything you need'
                      }
                    </Text>
                  </View>
                )}
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
}
