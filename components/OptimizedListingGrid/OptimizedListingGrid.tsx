import React, { useMemo, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { FlatList } from 'react-native';
import { ProductCard } from '@/components/Card/Card';
import { LazyComponent } from '@/components/LazyComponent/LazyComponent';
import { LoadingSkeleton, ProductCardSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Text } from '@/components/Typography/Text';
import { useMemoryManager } from '@/utils/memoryManager';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface Listing {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images?: string[];
  image_urls?: string[];
  user_id: string;
  location?: string;
  created_at: string;
  seller?: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
}

interface OptimizedListingGridProps {
  listings: Listing[];
  loading?: boolean;
  error?: string | null;
  isFromCache?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onListingPress?: (listing: Listing) => void;
  refreshing?: boolean;
  hasMore?: boolean;
  numColumns?: number;
  layout?: 'grid' | 'list';
}

const { width: screenWidth } = Dimensions.get('window');

export function OptimizedListingGrid({
  listings,
  loading = false,
  error = null,
  isFromCache = false,
  onRefresh,
  onLoadMore,
  onListingPress,
  refreshing = false,
  hasMore = true,
  numColumns = 2,
  layout = 'grid',
}: OptimizedListingGridProps) {
  const { theme } = useTheme();
  const { shouldLoadHeavyComponent, memoryUsage } = useMemoryManager();
  const { startRender, endRender } = usePerformanceMonitor('optimized_listing_grid');
  const { isOnline } = useOfflineSync();
  
  // Mock pending changes count - in real app this would come from state
  const pendingChanges = 0;

  // Calculate optimal item dimensions
  const itemDimensions = useMemo(() => {
    const padding = theme.spacing.md;
    const gap = theme.spacing.md;
    const availableWidth = screenWidth - (padding * 2);
    const itemWidth = layout === 'grid' 
      ? (availableWidth - (gap * (numColumns - 1))) / numColumns
      : availableWidth;
    
    return {
      width: itemWidth,
      height: layout === 'grid' ? 320 : 200,
    };
  }, [screenWidth, numColumns, layout, theme.spacing.md]);

  // Memoized render item function
  const renderListingItem = useCallback(({ item, index }: { item: Listing; index: number }) => {
    const timerKey = `listing_render_${item.id}`;
    startRender();

    const handlePress = () => {
      endRender();
      onListingPress?.(item);
    };

    // Get the first image URL
    const imageUrl = item.images?.[0] || item.image_urls?.[0];
    const imagePath = imageUrl ? imageUrl.split('/').pop() : undefined;

    return (
      <View style={{ 
        width: itemDimensions.width,
        marginBottom: theme.spacing.md,
      }}>
        <LazyComponent
          fallback={<ProductCardSkeleton />}
          height={itemDimensions.height}
        >
          <ProductCard
            image={{ uri: imageUrl }}
            imagePath={imagePath}
            title={item.title}
            price={item.price}
            currency={item.currency || 'GHS'}
            seller={{
              id: item.seller?.id || item.user_id,
              name: item.seller?.name || 'Unknown Seller',
              avatar: item.seller?.avatar,
              rating: item.seller?.rating,
            }}
            location={item.location}
            layout={layout}
            onPress={handlePress}
          />
        </LazyComponent>
      </View>
    );
  }, [
    itemDimensions,
    layout,
    theme.spacing.md,
    startRender,
    endRender,
    onListingPress,
  ]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: Listing) => item.id, []);

  // Handle end reached with performance monitoring
  const handleEndReached = useCallback(() => {
    if (hasMore && !loading && shouldLoadHeavyComponent()) {
      const timerKey = 'load_more_listings';
      startRender();
      onLoadMore?.();
      endRender();
    }
  }, [hasMore, loading, shouldLoadHeavyComponent, onLoadMore, startRender, endRender]);

  // Handle refresh with performance monitoring
  const handleRefresh = useCallback(() => {
    const timerKey = 'refresh_listings';
    startRender();
    onRefresh?.();
    endRender();
  }, [onRefresh, startRender, endRender]);

  // Loading state
  if (loading && listings.length === 0) {
    return (
      <View style={{ padding: theme.spacing.md }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={{ 
            width: itemDimensions.width,
            marginBottom: theme.spacing.md,
          }}>
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    );
  }

  // Error state
  if (error && listings.length === 0) {
    return (
      <EmptyState
        title="Failed to load listings"
        message={error}
        actionText="Try Again"
        onActionPress={handleRefresh}
      />
    );
  }

  // Empty state
  if (listings.length === 0) {
    return (
      <EmptyState
        title="No listings found"
        message="Be the first to post something in your area!"
        actionText="Create Listing"
        onActionPress={() => {
          // Navigate to create listing
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Offline/Cache indicator */}
      {(isFromCache || !isOnline) && (
        <View
          style={{
            backgroundColor: isOnline ? theme.colors.warning + '20' : theme.colors.error + '20',
            padding: theme.spacing.sm,
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text variant="caption" style={{ 
            color: isOnline ? theme.colors.warning : theme.colors.error,
            flex: 1,
          }}>
            {!isOnline 
              ? '📡 Offline - Showing cached listings'
              : '💾 Showing cached data'
            }
          </Text>
          {!isOnline && (
            <Text variant="caption" style={{ 
              color: theme.colors.error,
              fontWeight: '600',
            }}>
              {pendingChanges > 0 ? `${pendingChanges} pending` : ''}
            </Text>
          )}
        </View>
      )}

      {/* Memory usage indicator (development only) */}
      {__DEV__ && memoryUsage && memoryUsage.percentage > 0.7 && (
        <View
          style={{
            backgroundColor: theme.colors.warning + '20',
            padding: theme.spacing.sm,
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
          }}
        >
          <Text variant="caption" style={{ color: theme.colors.warning }}>
            ⚠️ High memory usage: {(memoryUsage.percentage * 100).toFixed(1)}%
          </Text>
        </View>
      )}

      <FlatList
        data={listings}
        renderItem={renderListingItem}
        keyExtractor={keyExtractor}
        numColumns={layout === 'grid' ? numColumns : 1}
        onEndReached={handleEndReached}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        contentContainerStyle={{
          padding: theme.spacing.md,
        }}
        // Performance optimizations
        windowSize={10}
        maxToRenderPerBatch={layout === 'grid' ? 4 : 6}
        initialNumToRender={layout === 'grid' ? 6 : 8}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
      />
    </View>
  );
}

// Hook for managing listing grid state
export function useOptimizedListingGrid(initialListings: Listing[] = []) {
  const listings = initialListings;
  const loading = false;
  const refreshing = false;
  const error = null;
  const hasMore = false;
  const loadMore = () => {};
  const refresh = () => {};
  const reset = () => {};

  const loadMoreListings = useCallback(async () => {
    // Implement your load more logic here
    // This would typically call your API to fetch more listings
    console.log('Loading more listings...');
  }, []);

  const refreshListings = useCallback(async () => {
    // Implement your refresh logic here
    // This would typically call your API to refresh listings
    console.log('Refreshing listings...');
  }, []);

  return {
    listings,
    loading,
    refreshing,
    error,
    hasMore,
    loadMore: (loadMore as any)(loadMoreListings),
    refresh: (refresh as any)(refreshListings),
    reset,
  };
}
