import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useListings } from '@/hooks/useListings';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { getDisplayName } from '@/hooks/useDisplayName';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  ProductCard,
  Grid,
  EmptyState,
  LoadingSkeleton,
  SearchBar,
  FilterSheet,
} from '@/components';
import { useAppStore } from '@/store/useAppStore';

export default function SearchResultsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { q: initialQuery, category: categoryId, categoryName } = useLocalSearchParams<{ 
    q: string; 
    category?: string; 
    categoryName?: string; 
  }>();
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const { 
    filters,
    showFilters,
    setShowFilters,
    setFilters,
    selectedCategories,
    setSelectedCategories,
  } = useAppStore();

  // Combine search query with filter categories for better search
  const combinedSearchQuery = React.useMemo(() => {
    const searchTerms = [];
    
    // Add main search query if it exists
    if (searchQuery && searchQuery.trim()) {
      searchTerms.push(searchQuery.trim());
    }
    
    // Add filter categories as additional search terms
    if (filters.categories && filters.categories.length > 0) {
      searchTerms.push(...filters.categories);
    }
    
    // Return the combined search terms
    return searchTerms.length > 0 ? searchTerms.join(' ') : '';
  }, [searchQuery, filters.categories]);

  const { 
    listings: products, 
    loading, 
    error, 
    refreshing, 
    refresh 
  } = useListings({
    search: combinedSearchQuery, // Combined search query with filter categories
    category: categoryId, // Add category filter
    location: filters.location,
    priceMin: filters.priceRange.min,
    priceMax: filters.priceRange.max,
    condition: filters.condition,
  });

  // Get listing IDs for stats
  const listingIds = products.map(product => product.id).filter(Boolean);
  
  // Get favorites and view counts for all listings
  const { favorites: hookFavorites, viewCounts, refreshStats } = useMultipleListingStats({ 
    listingIds 
  });
  
  // Get favorites count for header
  const { incrementFavoritesCount, decrementFavoritesCount } = useFavoritesStore();

  const handleFavoritePress = useCallback(async (listingId: string) => {
    if (!user) return;
    
    try {
      // Import and use the favorites function
      const { toggleFavorite } = await import('@/lib/favoritesAndViews');
      const result = await toggleFavorite(listingId);
      
      if (!result.error) {
        // Update header favorites count
        const currentFavorite = hookFavorites[listingId] || false;
        if (currentFavorite) {
          decrementFavoritesCount();
        } else {
          incrementFavoritesCount();
        }
        
        // Refresh stats to get latest data
        refreshStats();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [user, hookFavorites, decrementFavoritesCount, incrementFavoritesCount, refreshStats]);

  const handleViewPress = useCallback((listingId: string) => {
    // Navigate to listing detail to see more details
    router.push(`/(tabs)/home/${listingId}`);
  }, []);

  // Update search when query param changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Transform database listings to component format - memoized for performance
  const transformedProducts = useMemo(() => {
    return products.map((listing: any) => {
      const seller = listing.profiles || null;
      
      // Determine the highest priority badge (only show ONE badge per listing)
      let primaryBadge = null;
      
      // Priority order: Urgent > Spotlight > Boosted > Business > Verified
      if (listing.urgent_until && new Date(listing.urgent_until) > new Date()) {
        primaryBadge = { text: 'Urgent Sale', variant: 'urgent' as const };
      } else if (listing.spotlight_until && new Date(listing.spotlight_until) > new Date()) {
        primaryBadge = { text: 'Spotlight', variant: 'spotlight' as const };
      } else if (listing.boost_until && new Date(listing.boost_until) > new Date()) {
        primaryBadge = { text: 'Boosted', variant: 'featured' as const };
      } else if (seller?.account_type === 'business') {
        primaryBadge = { text: 'Business', variant: 'info' as const };
      } else if (seller?.verification_status === 'verified') {
        primaryBadge = { text: 'Verified', variant: 'success' as const };
      }

      return {
        id: listing.id,
        image: listing.images || ['https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg'],
        title: listing.title,
        price: listing.price,
        seller: {
          id: seller?.id || listing.user_id,
          name: seller ? getDisplayName(seller, false).displayName : 'Anonymous User',
          avatar: seller?.avatar_url || null,
          rating: seller?.rating || 0,
          badges: seller?.account_type === 'business' ? ['business'] : [],
        },
        badge: primaryBadge || undefined, // Convert null to undefined
        location: listing.location,
        views: listing.views_count || 0,
        favorites: listing.favorites_count || 0,
        isBoosted: listing.boost_until && new Date(listing.boost_until) > new Date(),
      };
    });
  }, [products]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
  }, [setSelectedCategories]);

  // Memoize header title to prevent unnecessary re-renders
  const headerTitle = useMemo(() => {
    if (categoryName) {
      return `${categoryName} (${products.length})`;
    }
    if (searchQuery) {
      return `Results for "${searchQuery}"`;
    }
    return 'Search Results';
  }, [categoryName, searchQuery, products.length]);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const handleFilterPress = useCallback(() => {
    setShowFilters(true);
  }, [setShowFilters]);

  const handleApplyFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
    setShowFilters(false);
  }, [setFilters, setShowFilters]);

  const handleClearFilters = useCallback(() => {
    setFilters({
      priceRange: { min: undefined, max: undefined },
      condition: [],
      categories: [],
      location: '',
      sortBy: 'Newest First',
    });
    setShowFilters(false);
  }, [setFilters, setShowFilters]);

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={headerTitle}
        showBackButton
        onBackPress={handleBackPress}
      />

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilter={handleFilterPress}
        onClear={searchQuery ? handleClearSearch : undefined}
        placeholder="Search for anything..."
      />

      {/* Results Count */}
      {!loading && (
        <View style={{ 
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        }}>
          <Text variant="bodySmall" color="muted">
            {transformedProducts.length} {transformedProducts.length === 1 ? 'result' : 'results'}
            {searchQuery && ` for "${searchQuery}"`}
          </Text>
        </View>
      )}

      {/* Results */}
      <View style={{ flex: 1 }}>
        {error ? (
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <EmptyState
              title="Unable to load results"
              description="Please check your internet connection and try again."
              action={{
                text: 'Retry',
                onPress: refresh,
              }}
            />
          </View>
        ) : loading ? (
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <Grid columns={2}>
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={280}
                  borderRadius={theme.borderRadius.lg}
                />
              ))}
            </Grid>
          </View>
        ) : transformedProducts.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg }}>
            <EmptyState
              title="No results found"
              description={searchQuery 
                ? `No listings match "${searchQuery}". Try different keywords or adjust your filters.`
                : "Start typing to search for products, categories, or anything you need."
              }
              action={{
                text: searchQuery ? 'Clear Search' : 'Browse All',
                onPress: searchQuery 
                  ? handleClearSearch
                  : () => router.push('/(tabs)/home'),
              }}
            />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: theme.spacing.xl,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            // Performance optimizations for ScrollView
            removeClippedSubviews={true}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            <Grid columns={2} spacing={4}>
              {transformedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  image={product.image}
                  title={product.title}
                  price={product.price}
                  seller={product.seller}
                  badge={product.badge}
                  location={product.location}
                  layout="grid"
                  fullWidth={true}
                  listingId={product.id}
                  isFavorited={hookFavorites[product.id] || false}
                  viewCount={viewCounts[product.id] || 0}
                  favoritesCount={product.favorites || 0}
                  onPress={() => router.push(`/(tabs)/home/${product.id}`)}
                  onFavoritePress={user?.id !== product.seller.id ? () => handleFavoritePress(product.id) : undefined}
                  onViewPress={() => handleViewPress(product.id)}
                  currentUserId={user?.id || ""}
                />
              ))}
            </Grid>
          </ScrollView>
        )}
      </View>

      {/* Filter Sheet */}
      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        currentCategory={categoryName} // Pass current category for smart filtering
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
    </SafeAreaWrapper>
  );
}