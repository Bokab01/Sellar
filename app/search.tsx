import React, { useState, useEffect } from 'react';
import { View, Keyboard } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { SafeAreaWrapper } from '@/components/Layout';
import { SmartSearchBar } from '@/components/SmartSearchBar/SmartSearchBar';
import { SmartSearchFilters } from '@/components/SearchFilters/SearchFilters';
import { SearchResults } from '@/components/SearchResults/SearchResults';
import { useSmartSearch } from '@/hooks/useSmartSearch';
import { router, useLocalSearchParams } from 'expo-router';
import { SearchFilters as SearchFiltersType } from '@/lib/smartSearchService';

export default function SearchScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  
  // Get initial query from navigation params
  const initialQuery = typeof params.q === 'string' ? params.q : '';
  const initialCategory = typeof params.category === 'string' ? params.category : undefined;
  
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    query,
    filters,
    results,
    suggestions,
    loading,
    error,
    totalCount,
    searchTime,
    hasMore,
    search,
    updateQuery,
    updateFilters,
    loadMore,
    clearSearch,
    trackClick,
    isEmpty,
    hasResults,
    isSearching,
  } = useSmartSearch({
    initialQuery,
    initialFilters: { category: initialCategory },
    autoSearch: true,
    debounceMs: 300,
    enableCache: true,
    trackAnalytics: true,
  });

  const handleSearchSubmit = (searchQuery: string) => {
    search(searchQuery, filters);
    Keyboard.dismiss();
  };

  const handleFiltersApply = () => {
    search(query, filters);
  };

  const handleFiltersClear = () => {
    const clearedFilters: SearchFiltersType = {};
    updateFilters(clearedFilters);
  };

  const handleResultPress = (result: any, index: number) => {
    trackClick(result, index);
    router.push(`/listing/${result.id}`);
  };

  const handleRefresh = () => {
    search(query, filters);
  };

  return (
    <SafeAreaWrapper>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Search Header */}
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <SmartSearchBar
            value={query}
            onChangeText={updateQuery}
            onSubmit={handleSearchSubmit}
            onFilterPress={() => setShowFilters(true)}
            placeholder="Search for anything..."
            showFilters={true}
            autoFocus={!initialQuery}
          />
        </View>

        {/* Search Results */}
        <SearchResults
          results={results}
          loading={isSearching}
          refreshing={loading && hasResults}
          hasMore={hasMore}
          totalCount={totalCount}
          searchTime={searchTime}
          query={query}
          onRefresh={handleRefresh}
          onLoadMore={loadMore}
          onResultPress={handleResultPress}
          style={{ flex: 1 }}
        />

        {/* Search Filters Modal */}
        <SmartSearchFilters
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onFiltersChange={updateFilters}
          onApply={handleFiltersApply}
          onClear={handleFiltersClear}
        />
      </View>
    </SafeAreaWrapper>
  );
}
