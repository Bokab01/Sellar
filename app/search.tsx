import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
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
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // ✅ Default to list view
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

  const handleFilterPress = useCallback(() => {
    router.push('/filter-products');
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
        <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>
          {viewMode === 'grid' ? (
          <View style={{ paddingHorizontal: theme.spacing.lg }}>
            <Grid columns={2}>
                {Array.from({ length: isOtherCategory ? 8 : 6 }).map((_, index) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={280}
                  borderRadius={theme.borderRadius.lg}
                />
              ))}
            </Grid>
          </View>
          ) : (
            <View style={{ paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
              {Array.from({ length: isOtherCategory ? 8 : 6 }).map((_, index) => (
                <LoadingSkeleton
                  key={index}
                  width="100%"
                  height={100}
                  borderRadius={theme.borderRadius.lg}
                  style={{ marginBottom: theme.spacing.sm }}
                />
              ))}
            </View>
          )}
        </ScrollView>
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
          {/* Filter Pills - Inside ScrollView */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              gap: theme.spacing.sm,
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

        {/* Dynamic Attribute Filters (Brand, Model, Condition, etc.) */}
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

      {/* Results Grid/List */}
      {viewMode === 'grid' ? (
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
      ) : (
        <View style={{ paddingHorizontal: theme.spacing.sm }}>
          {transformedProducts.map((product) => {
            // ✅ Prepare badges for ListingListCard
            const listBadges: Array<{ text: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'secondary' }> = [];
            
            if (product.badge?.text && product.badge?.variant) {
              listBadges.push({ 
                text: String(product.badge.text), 
                variant: String(product.badge.variant) as any
              });
            }

            return (
              <ProductCard
                key={product.id}
                variant="list"
                shadowSize="sm"
                listingId={String(product.id)}
                image={Array.isArray(product.image) ? product.image[0] : String(product.image)}
                title={String(product.title)}
                price={product.price}
                currency="GHS"
                seller={product.seller}
                status="active"
                location={product.location}
                viewCount={viewCounts[product.id] || 0}
                favoritesCount={product.favorites || 0}
                isFavorited={hookFavorites[product.id] || false}
                badge={listBadges[0]}
                badges={listBadges}
                onPress={() => router.push(`/(tabs)/home/${product.id}`)}
                onFavoritePress={user?.id !== product.seller.id ? () => handleFavoritePress(product.id) : undefined}
                onViewPress={() => handleViewPress(product.id)}
              />
            );
          })}
        </View>
      )}
          </ScrollView>
        )}

    </SafeAreaWrapper>
  );
}