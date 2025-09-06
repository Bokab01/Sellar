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

  // Debounced search function
  const searchSuggestions = useCallback(async (query: string, currentRecentSearches: string[]) => {
    if (!query.trim()) {
      // Show recent searches and trending when no query
      const recent = currentRecentSearches.slice(0, 5).map((search, index) => ({
        id: `recent-${index}`,
        type: 'recent' as const,
        title: search,
      }));

      // Add some trending categories
      const trending = [
        { id: 'trending-1', type: 'trending' as const, title: 'Electronics', count: 45 },
        { id: 'trending-2', type: 'trending' as const, title: 'Fashion', count: 32 },
        { id: 'trending-3', type: 'trending' as const, title: 'Home & Garden', count: 28 },
      ];

      setSuggestions([...recent, ...trending]);
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

    // Navigate to search results
    router.push({
      pathname: '/search',
      params: { q: query }
    });
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
          <Input
            variant="search"
            placeholder="Search for anything..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={async () => {
              if (searchQuery.trim()) {
                await handleSuggestionPress({
                  id: 'manual-search',
                  type: 'listing',
                  title: searchQuery,
                });
              }
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
                    {searchQuery ? 'Suggestions' : 'Recent & Trending'}
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
