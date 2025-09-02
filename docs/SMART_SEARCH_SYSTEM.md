# Smart Search System

A comprehensive search system for the Sellar mobile app that provides intelligent search capabilities, filtering, suggestions, and analytics.

## Features

### 🔍 Smart Search Service
- **Semantic Search**: Full-text search using PostgreSQL capabilities
- **Multi-strategy Search**: Combines title, description, location, and category matching
- **Intelligent Ranking**: Boosts featured, boosted, and business listings
- **Caching**: Built-in result caching for improved performance
- **Analytics**: Comprehensive search tracking and analytics

### 🎯 Search Suggestions
- **Autocomplete**: Real-time search suggestions as you type
- **Trending Searches**: Popular searches from the last 7 days
- **Search History**: Personalized search history for logged-in users
- **Category Suggestions**: Smart category matching
- **Location Suggestions**: Location-based search hints

### 🔧 Advanced Filtering
- **Price Range**: Min/max price filtering
- **Categories**: Filter by product categories
- **Condition**: Filter by item condition (new, used, etc.)
- **Location**: Geographic location filtering
- **Sort Options**: Multiple sorting strategies (relevance, price, date, popularity)

### 📊 Search Analytics
- **Search Tracking**: Track all search queries and results
- **Click Analytics**: Monitor which results users click
- **Performance Metrics**: Search duration and result counts
- **Trending Analysis**: Identify popular search terms
- **User Behavior**: Personalized search insights

## Components

### SmartSearchBar
```tsx
import { SmartSearchBar } from '@/components';

<SmartSearchBar
  value={query}
  onChangeText={setQuery}
  onSubmit={handleSearch}
  onFilterPress={() => setShowFilters(true)}
  placeholder="Search for anything..."
  showFilters={true}
  autoFocus={false}
/>
```

### SmartSearchFilters
```tsx
import { SmartSearchFilters } from '@/components';

<SmartSearchFilters
  visible={showFilters}
  onClose={() => setShowFilters(false)}
  filters={filters}
  onFiltersChange={setFilters}
  onApply={handleApply}
  onClear={handleClear}
/>
```

### SearchResults
```tsx
import { SearchResults } from '@/components';

<SearchResults
  results={results}
  loading={loading}
  hasMore={hasMore}
  totalCount={totalCount}
  searchTime={searchTime}
  query={query}
  onRefresh={handleRefresh}
  onLoadMore={loadMore}
  onResultPress={handleResultPress}
/>
```

### QuickSearch
```tsx
import { QuickSearch } from '@/components';

<QuickSearch style={{ margin: 16 }} />
```

## Hooks

### useSmartSearch
Main hook for search functionality:

```tsx
import { useSmartSearch } from '@/hooks/useSmartSearch';

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
  initialQuery: '',
  initialFilters: {},
  autoSearch: true,
  debounceMs: 300,
  enableCache: true,
  trackAnalytics: true,
});
```

### useSearchSuggestions
Get search suggestions for autocomplete:

```tsx
import { useSearchSuggestions } from '@/hooks/useSmartSearch';

const { suggestions, loading } = useSearchSuggestions(query);
```

### useTrendingSearches
Get trending search terms:

```tsx
import { useTrendingSearches } from '@/hooks/useSmartSearch';

const { trending, loading } = useTrendingSearches();
```

### useSearchHistory
Get user's search history:

```tsx
import { useSearchHistory } from '@/hooks/useSmartSearch';

const { history, loading } = useSearchHistory();
```

## Service API

### SmartSearchService
Direct service usage:

```tsx
import { smartSearchService } from '@/lib/smartSearchService';

// Perform search
const results = await smartSearchService.search(
  'iPhone 13',
  { category: 'electronics', minPrice: 1000 },
  { limit: 20, offset: 0 }
);

// Get suggestions
const suggestions = await smartSearchService.getSearchSuggestions('iph');

// Get trending searches
const trending = await smartSearchService.getTrendingSearches(10);

// Track search click
await smartSearchService.trackSearchClick('iPhone 13', 'listing-id', 1);
```

## Database Schema

### search_analytics
Tracks all search queries and user interactions:
- `query`: The search term
- `user_id`: User who performed the search
- `results_count`: Number of results returned
- `clicked_result_id`: Which result was clicked
- `click_position`: Position of clicked result
- `filters`: Applied search filters
- `search_duration_ms`: How long the search took

### search_suggestions
Stores popular search terms and suggestions:
- `text`: The suggestion text
- `type`: Type of suggestion (query, category, location, brand)
- `search_count`: How many times it's been searched
- `is_trending`: Whether it's currently trending

### user_search_history
Personal search history for each user:
- `user_id`: The user
- `query`: Search term
- `filters`: Applied filters
- `results_found`: Number of results
- `clicked_result`: Whether user clicked any result

## Performance Features

### Caching
- **Result Caching**: Search results cached for 5 minutes
- **Suggestion Caching**: Autocomplete suggestions cached
- **Smart Invalidation**: Cache cleared when needed

### Optimization
- **Debounced Search**: Prevents excessive API calls
- **Pagination**: Load more results as needed
- **Lazy Loading**: Components load efficiently
- **Background Analytics**: Non-blocking analytics tracking

### Database Optimization
- **Full-text Indexes**: PostgreSQL GIN indexes for fast text search
- **Composite Indexes**: Multi-column indexes for filtered searches
- **Query Optimization**: Efficient SQL queries with proper joins

## Usage Examples

### Basic Search Screen
```tsx
import React from 'react';
import { View } from 'react-native';
import { SmartSearchBar, SearchResults } from '@/components';
import { useSmartSearch } from '@/hooks/useSmartSearch';

export default function SearchScreen() {
  const {
    query,
    results,
    loading,
    updateQuery,
    search,
    loadMore,
    trackClick,
  } = useSmartSearch();

  return (
    <View style={{ flex: 1 }}>
      <SmartSearchBar
        value={query}
        onChangeText={updateQuery}
        onSubmit={search}
      />
      <SearchResults
        results={results}
        loading={loading}
        onLoadMore={loadMore}
        onResultPress={(result, index) => {
          trackClick(result, index);
          // Navigate to result
        }}
      />
    </View>
  );
}
```

### Home Screen Integration
```tsx
import { QuickSearch } from '@/components';

// In your home screen component
<QuickSearch style={{ margin: 16 }} />
```

## Configuration

### Search Parameters
- `debounceMs`: Delay before search execution (default: 300ms)
- `cacheEnabled`: Enable result caching (default: true)
- `trackAnalytics`: Track search analytics (default: true)
- `limit`: Results per page (default: 20)

### Ranking Factors
- **Exact Title Match**: +50 points
- **Featured Listing**: +30 points
- **Boost Level**: +10 points per level
- **Business Account**: +15 points
- **Recent Listing**: +20 points (within 7 days)
- **Base Relevance**: 100 - position

## Analytics Dashboard

The system provides comprehensive analytics:
- **Search Volume**: Daily search counts
- **Popular Terms**: Most searched queries
- **Click-through Rates**: Search to click conversion
- **User Engagement**: Search behavior patterns
- **Performance Metrics**: Search speed and accuracy

## Future Enhancements

- **AI-Powered Search**: Machine learning for better relevance
- **Voice Search**: Speech-to-text search capability
- **Visual Search**: Image-based product search
- **Personalization**: User-specific result ranking
- **Geo-location**: Location-aware search results
- **Synonyms**: Intelligent query expansion
