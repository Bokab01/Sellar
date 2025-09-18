import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useListings } from '@/hooks/useListings';
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
    selectedCategories,
    setSelectedCategories,
  } = useAppStore();

  const { 
    listings: products, 
    loading, 
    error, 
    refreshing, 
    refresh 
  } = useListings({
    search: categoryId ? undefined : searchQuery, // Only use search query if not filtering by category
    category: categoryId, // Add category filter
    location: filters.location,
    priceMin: filters.priceRange.min,
    priceMax: filters.priceRange.max,
    condition: filters.condition,
  });


  // Update search when query param changes
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Transform database listings to component format
  const transformedProducts = products.map((listing: any) => {
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
        name: seller ? `${seller.first_name || 'User'} ${seller.last_name || ''}`.trim() : 'Anonymous User',
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

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategories([]);
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={
          categoryName 
            ? `${categoryName} (${products.length})` 
            : searchQuery 
              ? `Results for "${searchQuery}"` 
              : 'Search Results'
        }
        showBackButton
        onBackPress={() => router.back()}
      />

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilter={() => setShowFilters(true)}
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
                  onPress={() => router.push(`/(tabs)/home/${product.id}`)}
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
        onApplyFilters={(newFilters) => {
          // TODO: Update filters in app store
          setShowFilters(false);
        }}
        onClearFilters={() => {
          // TODO: Clear filters in app store
          setShowFilters(false);
        }}
      />
    </SafeAreaWrapper>
  );
}