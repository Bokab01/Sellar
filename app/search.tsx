import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useListings } from '@/hooks/useListings';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { getDisplayName } from '@/hooks/useDisplayName';
import * as Haptics from 'expo-haptics';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  ProductCard,
  Grid,
  EmptyState,
  LoadingSkeleton,
  SearchBar,
  Chip,
  Button,
} from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { SlidersHorizontal, ArrowUpDown, Check, MapPin, LayoutGrid, List, ArrowLeft } from 'lucide-react-native';

type ViewMode = 'grid' | 'list';

export default function SearchResultsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { q: initialQuery, category: categoryId, categoryName } = useLocalSearchParams<{ 
    q: string; 
    category?: string; 
    categoryName?: string; 
  }>();
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [viewMode, setViewMode] = useState<ViewMode>('grid'); // ✅ Default to grid view
  const { 
    filters,
    setFilters,
    selectedCategories,
    setSelectedCategories,
    setSearchQuery: setGlobalSearchQuery,
  } = useAppStore();

  // Memoize useListings parameters to prevent unnecessary re-fetches
  const listingsParams = useMemo(() => ({
    search: searchQuery?.trim() || '', // Use original search query only
    categories: filters.categories, // Category filter handled separately
    location: filters.location,
    priceMin: filters.priceRange.min,
    priceMax: filters.priceRange.max,
    attributeFilters: filters.attributeFilters, // Use new dynamic attribute filters
    sortBy: filters.sortBy || 'newest', // Add sorting
    // Add performance optimizations for "Other" category
    limit: categoryId === '00000000-0000-4000-8000-000000000000' ? 50 : undefined, // Limit results for "Other" category
  }), [searchQuery, filters.categories, filters.location, filters.priceRange.min, filters.priceRange.max, filters.attributeFilters, filters.sortBy, categoryId]);

  const { 
    listings: products, 
    loading, 
    error, 
    refreshing, 
    refresh 
  } = useListings(listingsParams);

  // Track previous filters to detect changes
  const prevFiltersRef = useRef<string>('');

  // Refresh listings when screen comes into focus and filters have changed
  useFocusEffect(
    useCallback(() => {
      const currentFilters = JSON.stringify(filters);
      if (prevFiltersRef.current !== currentFilters) {
        prevFiltersRef.current = currentFilters;
        // Trigger refresh if filters changed
        if (prevFiltersRef.current !== '{}') {
          refresh();
        }
      }
    }, [filters, refresh])
  );

  // Clear filters and search query when leaving the search screen to prevent them from affecting home screen
  useEffect(() => {
    return () => {
      // Cleanup: Reset filters and search query when unmounting
      setFilters({
        categories: [],
        priceRange: { min: undefined, max: undefined },
        condition: [],
        location: '',
        sortBy: 'newest',
        attributeFilters: {},
      });
      setGlobalSearchQuery(''); // Clear search query from global store
    };
  }, [setFilters, setGlobalSearchQuery]);

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
    if (initialQuery && initialQuery !== searchQuery) {
      setSearchQuery(initialQuery);
      // Sync to global store immediately when URL param changes
      setGlobalSearchQuery(initialQuery);
    }
  }, [initialQuery, setGlobalSearchQuery]);

  // Sync local search query to global store when user types (but not on initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    // Skip on initial mount - the previous effect already handled initialQuery
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only sync when user actively changes the search query
    setGlobalSearchQuery(searchQuery);
  }, [searchQuery, setGlobalSearchQuery]);

  // Transform database listings to component format - memoized for performance
  const transformedProducts = useMemo(() => {
    return products.map((listing: any) => {
      // For "Other" category, we might not have joined profile data, so handle gracefully
      const seller = listing.profiles || null;
      
      // ✅ Use pre-computed is_sellar_pro flag from database view (optimal performance)
      const isSellarPro = listing.is_sellar_pro === true;
      
      // Determine the highest priority badge (only show ONE badge per listing)
      let primaryBadge = null;
      
      // Priority order: Urgent > Spotlight > Boosted > PRO > Business > Verified
      if (listing.urgent_until && new Date(listing.urgent_until) > new Date()) {
        primaryBadge = { text: 'Urgent Sale', variant: 'urgent' as const };
      } else if (listing.spotlight_until && new Date(listing.spotlight_until) > new Date()) {
        primaryBadge = { text: 'Spotlight', variant: 'spotlight' as const };
      } else if (listing.boost_until && new Date(listing.boost_until) > new Date()) {
        primaryBadge = { text: 'Boosted', variant: 'featured' as const };
      } else if (isSellarPro) {
        primaryBadge = { text: '⭐ PRO', variant: 'primary' as const };
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
      previous_price: listing.previous_price || null,
      price_changed_at: listing.price_changed_at || null,
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

  // ✅ Group items into pairs for grid view (same as my listings)
  const gridData = useMemo(() => {
    if (viewMode !== 'grid') return [];
    const pairs = [];
    for (let i = 0; i < transformedProducts.length; i += 2) {
      pairs.push([transformedProducts[i], transformedProducts[i + 1]]);
    }
    return pairs;
  }, [transformedProducts, viewMode]);

  const handleFilterPress = useCallback(() => {
    router.push('/filter-products');
  }, []);

  // ✅ List header component with pills and result counter
  const ListHeader = useCallback(() => (
    <View>
      {/* Filter Pills */}
      <View style={{ 
        paddingVertical: theme.spacing.sm,
      }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.sm,
            alignItems: 'center',
          }}
        >
          {/* Filter Button */}
          <TouchableOpacity
            onPress={handleFilterPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.full,
              borderWidth: 1,
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.surface,
              gap: theme.spacing.xs,
            }}
          >
            <SlidersHorizontal size={16} color={theme.colors.text.primary} />
            <Text variant="bodySmall" style={{ fontWeight: '500' }}>
              Filter
            </Text>
          </TouchableOpacity>

          {/* Sort By Button */}
          <TouchableOpacity
            onPress={() => router.push('/filter-sort')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.full,
              borderWidth: 1,
              borderColor: filters.sortBy !== 'newest' ? theme.colors.primary : theme.colors.border,
              backgroundColor: filters.sortBy !== 'newest' ? theme.colors.primary + '10' : theme.colors.surface,
              gap: theme.spacing.xs,
            }}
          >
            <ArrowUpDown 
              size={16} 
              color={filters.sortBy !== 'newest' ? theme.colors.primary : theme.colors.text.primary} 
            />
            {filters.sortBy !== 'newest' && (
              <Check size={14} color={theme.colors.primary} />
            )}
            <Text 
              variant="bodySmall" 
              style={{ 
                fontWeight: '500',
                color: filters.sortBy !== 'newest' ? theme.colors.primary : theme.colors.text.primary 
              }}
            >
              Sort by
            </Text>
          </TouchableOpacity>

          {/* Location Button */}
          <TouchableOpacity
            onPress={() => router.push('/filter-location')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.full,
              borderWidth: 1,
              borderColor: filters.location ? theme.colors.primary : theme.colors.border,
              backgroundColor: filters.location ? theme.colors.primary + '10' : theme.colors.surface,
              gap: theme.spacing.xs,
            }}
          >
            <MapPin 
              size={16} 
              color={filters.location ? theme.colors.primary : theme.colors.text.primary} 
            />
            {filters.location && (
              <Check size={14} color={theme.colors.primary} />
            )}
            <Text 
              variant="bodySmall" 
              style={{ 
                fontWeight: '500',
                color: filters.location ? theme.colors.primary : theme.colors.text.primary 
              }}
            >
              Location
            </Text>
          </TouchableOpacity>

          {/* Price Button */}
          <TouchableOpacity
            onPress={() => router.push('/filter-price')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.full,
              borderWidth: 1,
              borderColor: (filters.priceRange.min || filters.priceRange.max) ? theme.colors.primary : theme.colors.border,
              backgroundColor: (filters.priceRange.min || filters.priceRange.max) ? theme.colors.primary + '10' : theme.colors.surface,
              gap: theme.spacing.xs,
            }}
          >
            <Text 
              style={{ 
                fontSize: 16,
                fontWeight: '600',
                color: (filters.priceRange.min || filters.priceRange.max) ? theme.colors.primary : theme.colors.text.primary 
              }}
            >
              ₵
            </Text>
            {(filters.priceRange.min || filters.priceRange.max) && (
              <Check size={14} color={theme.colors.primary} />
            )}
            <Text 
              variant="bodySmall" 
              style={{ 
                fontWeight: '500',
                color: (filters.priceRange.min || filters.priceRange.max) ? theme.colors.primary : theme.colors.text.primary 
              }}
            >
              Price
            </Text>
          </TouchableOpacity>

          {/* Dynamic Attribute Filters */}
          {filters.attributeFilters && Object.keys(filters.attributeFilters).length > 0 && 
            Object.entries(filters.attributeFilters).map(([key, value]) => (
              <TouchableOpacity
                key={key}
                onPress={handleFilterPress}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.full,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.primary + '10',
                  gap: theme.spacing.xs,
                }}
              >
                <Check size={16} color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ fontWeight: '500', color: theme.colors.primary }}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </TouchableOpacity>
            ))
          }

          {/* Condition Filter */}
          {filters.condition && filters.condition.length > 0 && (
            <TouchableOpacity
              onPress={handleFilterPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.full,
                borderWidth: 1,
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.primary + '10',
                gap: theme.spacing.xs,
              }}
            >
              <Check size={16} color={theme.colors.primary} />
              <Text variant="bodySmall" style={{ fontWeight: '500', color: theme.colors.primary }}>
                Condition
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={{ 
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Text variant="body" style={{ fontWeight: '600' }}>
          {transformedProducts.length >= 500 ? '500+' : transformedProducts.length} {transformedProducts.length === 1 ? 'result' : 'results'}
        </Text>
        <Text variant="bodySmall" color="muted">
          Search results
        </Text>
      </View>
    </View>
  ), [filters, handleFilterPress, theme, transformedProducts.length]);

  // ✅ Render grid row (pairs of items)
  const renderGridRow = useCallback(({ item: pair }: { item: any[] }) => (
    <View style={{ 
      flexDirection: 'row', 
      paddingHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.sm 
    }}>
      <View style={{ flex: 1, marginRight: theme.spacing.xs }}>
        <ProductCard
          key={pair[0]?.id}
          image={pair[0]?.image}
          title={pair[0]?.title}
          price={pair[0]?.price}
          previousPrice={pair[0]?.previous_price}
          priceChangedAt={pair[0]?.price_changed_at}
          seller={pair[0]?.seller}
          badge={pair[0]?.badge}
          location={pair[0]?.location}
          layout="grid"
          fullWidth={true}
          listingId={pair[0]?.id}
          isFavorited={hookFavorites[pair[0]?.id] || false}
          viewCount={viewCounts[pair[0]?.id] || 0}
          favoritesCount={pair[0]?.favorites || 0}
          onPress={() => router.push(`/(tabs)/home/${pair[0]?.id}`)}
          onFavoritePress={user?.id !== pair[0]?.seller.id ? () => handleFavoritePress(pair[0]?.id) : undefined}
          onViewPress={() => handleViewPress(pair[0]?.id)}
          currentUserId={user?.id || ""}
        />
      </View>
      <View style={{ flex: 1, marginLeft: theme.spacing.xs }}>
        {pair[1] && (
          <ProductCard
            key={pair[1]?.id}
            image={pair[1]?.image}
            title={pair[1]?.title}
            price={pair[1]?.price}
            previousPrice={pair[1]?.previous_price}
            priceChangedAt={pair[1]?.price_changed_at}
            seller={pair[1]?.seller}
            badge={pair[1]?.badge}
            location={pair[1]?.location}
            layout="grid"
            fullWidth={true}
            listingId={pair[1]?.id}
            isFavorited={hookFavorites[pair[1]?.id] || false}
            viewCount={viewCounts[pair[1]?.id] || 0}
            favoritesCount={pair[1]?.favorites || 0}
            onPress={() => router.push(`/(tabs)/home/${pair[1]?.id}`)}
            onFavoritePress={user?.id !== pair[1]?.seller.id ? () => handleFavoritePress(pair[1]?.id) : undefined}
            onViewPress={() => handleViewPress(pair[1]?.id)}
            currentUserId={user?.id || ""}
          />
        )}
      </View>
    </View>
  ), [hookFavorites, viewCounts, user?.id, handleFavoritePress, handleViewPress, theme.spacing]);

  // Memoized grid item renderer (works for both grid and list modes)
  const renderGridItem = useCallback(({ item: product }: { item: any }) => (
    <View style={{ flex: 1, paddingHorizontal: 2 }}>
      <ProductCard
        key={product.id}
        image={product.image}
        title={product.title}
        price={product.price}
        previousPrice={product.previous_price}
        priceChangedAt={product.price_changed_at}
        seller={product.seller}
        badge={product.badge}
        location={product.location}
        layout="grid"
        borderRadius={theme.borderRadius.sm}
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
    </View>
  ), [hookFavorites, viewCounts, user?.id, handleFavoritePress, handleViewPress]);

  // Memoized list item renderer (same as grid but full width when in list mode)
  const renderListItem = useCallback(({ item: product }: { item: any }) => (
    <ProductCard
      key={product.id}
      image={product.image}
      title={product.title}
      price={product.price}
      previousPrice={product.previous_price}
      priceChangedAt={product.price_changed_at}
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
  ), [hookFavorites, viewCounts, user?.id, handleFavoritePress, handleViewPress]);

  // Optimized keyExtractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  const handleClearSearch = useCallback(() => {
    // Clear local search query
    setSearchQuery('');
    
    // Clear all filters (not just categories)
    setFilters({
      categories: [],
      priceRange: { min: undefined, max: undefined },
      condition: [],
      location: '',
      sortBy: 'newest',
      attributeFilters: {},
    });
    
    // Clear selected categories
    setSelectedCategories([]);
    
    // Clear global search query
    setGlobalSearchQuery('');
    
    // Stay on search results screen so user can search for something else
    // (Don't navigate back)
  }, [setSelectedCategories, setFilters, setGlobalSearchQuery]);

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

  // Check if this is the "Other" category for special handling
  const isOtherCategory = categoryId === '00000000-0000-4000-8000-000000000000';

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  return (
    <SafeAreaWrapper>
      {/* Header with Search Bar */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBackPress}
          style={{
            padding: theme.spacing.sm,
            marginLeft: -theme.spacing.sm,
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        {/* Search Bar - Compact */}
        <View style={{ flex: 1 }}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={searchQuery ? handleClearSearch : undefined}
        placeholder="Search for anything..."
            showFilter={false}
            style={{
              paddingVertical: 0, // Remove built-in vertical padding to match smart search
              paddingHorizontal: 0,
            }}
          />
        </View>

        {/* View Toggle Button */}
        <Button
          variant="icon"
          icon={viewMode === 'grid' ? 
            <List size={20} color={theme.colors.text.primary} /> : 
            <LayoutGrid size={20} color={theme.colors.text.primary} />
          }
          onPress={() => {
            setViewMode(viewMode === 'grid' ? 'list' : 'grid');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
      </View>

      {/* Results Area */}
        {error ? (
        <View style={{ flex: 1, paddingHorizontal: theme.spacing.lg }}>
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
          viewMode === 'grid' ? (
            <FlatList
              data={Array.from({ length: isOtherCategory ? 8 : 6 })}
              keyExtractor={(_, index) => `skeleton-grid-${index}`}
              renderItem={({ index }) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={280}
                  borderRadius={theme.borderRadius.lg}
                />
              )}
              numColumns={2}
              columnWrapperStyle={{ paddingHorizontal: theme.spacing.lg }}
              contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
              showsVerticalScrollIndicator={false}
              // ✅ Performance optimizations for skeleton loading
              removeClippedSubviews={true}
              maxToRenderPerBatch={6}
              windowSize={3}
              initialNumToRender={6}
            />
          ) : (
            <FlatList
              data={Array.from({ length: isOtherCategory ? 8 : 6 })}
              keyExtractor={(_, index) => `skeleton-list-${index}`}
              renderItem={({ index }) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={100}
                  borderRadius={theme.borderRadius.lg}
                  style={{ marginBottom: theme.spacing.sm }}
                />
              )}
              contentContainerStyle={{ 
                paddingHorizontal: theme.spacing.sm, 
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing.lg 
              }}
              showsVerticalScrollIndicator={false}
              // ✅ Performance optimizations for skeleton loading
              removeClippedSubviews={true}
              maxToRenderPerBatch={6}
              windowSize={3}
              initialNumToRender={6}
            />
          )
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
          <View style={{ flex: 1 }}>

      {/* Results Grid/List */}
      <FlatList
        key={viewMode} // Force re-render when view mode changes
        data={transformedProducts}
        renderItem={renderGridItem}
        keyExtractor={keyExtractor}
        numColumns={viewMode === 'grid' ? 2 : 1}
        ListHeaderComponent={ListHeader}
        columnWrapperStyle={viewMode === 'grid' ? { 
          marginBottom: 4 
        } : undefined}
        // ✅ Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={viewMode === 'grid' ? 5 : 10}
        windowSize={5}
        initialNumToRender={viewMode === 'grid' ? 5 : 10}
        updateCellsBatchingPeriod={50}
        contentContainerStyle={{
          paddingHorizontal: 2,
          paddingBottom: theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      />
          </View>
        )}

    </SafeAreaWrapper>
  );
}