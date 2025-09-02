import React, { useMemo, useCallback, useState, useRef } from 'react';
import { 
  FlatList, 
  VirtualizedList as RNVirtualizedList,
  ViewToken,
  ListRenderItem,
  RefreshControl,
  View,
  Dimensions
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { LoadingSkeleton, ProductCardSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Text } from '@/components/Typography/Text';

interface VirtualizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  numColumns?: number;
  horizontal?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  contentContainerStyle?: any;
  style?: any;
  estimatedItemSize?: number;
  windowSize?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  initialNumToRender?: number;
  removeClippedSubviews?: boolean;
  getItemLayout?: (data: T[] | null | undefined, index: number) => {
    length: number;
    offset: number;
    index: number;
  };
  onViewableItemsChanged?: (info: {
    viewableItems: ViewToken[];
    changed: ViewToken[];
  }) => void;
  viewabilityConfig?: any;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  ItemSeparatorComponent?: React.ComponentType<any> | null;
}

export function VirtualizedList<T>({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.1,
  refreshing = false,
  onRefresh,
  loading = false,
  error = null,
  emptyMessage = 'No items found',
  numColumns = 1,
  horizontal = false,
  showsVerticalScrollIndicator = true,
  showsHorizontalScrollIndicator = false,
  contentContainerStyle,
  style,
  estimatedItemSize = 200,
  windowSize = 10,
  maxToRenderPerBatch = 10,
  updateCellsBatchingPeriod = 50,
  initialNumToRender = 10,
  removeClippedSubviews = true,
  getItemLayout,
  onViewableItemsChanged,
  viewabilityConfig,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  ItemSeparatorComponent,
}: VirtualizedListProps<T>) {
  const { theme } = useTheme();
  const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);
  const flatListRef = useRef<FlatList<T>>(null);

  // Optimize viewability config for better performance
  const optimizedViewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
    waitForInteraction: true,
    ...viewabilityConfig,
  }), [viewabilityConfig]);

  // Memoized render item with viewability optimization
  const memoizedRenderItem = useCallback<ListRenderItem<T>>(({ item, index }) => {
    const isVisible = viewableItems.some(viewableItem => 
      viewableItem.index === index && viewableItem.isViewable
    );

    // For better performance, we can conditionally render complex items
    return renderItem({ item, index, separators: {} as any });
  }, [renderItem, viewableItems]);

  // Handle viewable items change
  const handleViewableItemsChanged = useCallback((info: {
    viewableItems: ViewToken[];
    changed: ViewToken[];
  }) => {
    setViewableItems(info.viewableItems);
    onViewableItemsChanged?.(info);
  }, [onViewableItemsChanged]);

  // Optimized get item layout for better scrolling performance
  const optimizedGetItemLayout = useCallback((data: T[] | null | undefined, index: number) => {
    if (getItemLayout) {
      return getItemLayout(data, index);
    }
    
    // Default layout calculation
    return {
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    };
  }, [getItemLayout, estimatedItemSize]);

  // Loading state
  if (loading && data.length === 0) {
    return (
      <View style={[{ flex: 1 }, style]}>
        {ListHeaderComponent}
        <View style={contentContainerStyle}>
          {Array.from({ length: initialNumToRender }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[
        { 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: theme.spacing.xl,
        }, 
        style
      ]}>
        <View
          style={{
            backgroundColor: theme.colors.errorContainer,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            alignItems: 'center',
            maxWidth: 300,
          }}
        >
          <Text variant="h4" style={{ 
            color: theme.colors.onErrorContainer,
            marginBottom: theme.spacing.md,
            textAlign: 'center',
          }}>
            Something went wrong
          </Text>
          <Text variant="body" style={{ 
            color: theme.colors.onErrorContainer,
            textAlign: 'center',
            opacity: 0.8,
          }}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  // Empty state
  const EmptyComponent = ListEmptyComponent || (() => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
      minHeight: 200,
    }}>
      <View
        style={{
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: theme.borderRadius.full,
          width: 80,
          height: 80,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: theme.spacing.lg,
        }}
      >
        <Text variant="h2" style={{ opacity: 0.5 }}>
          📭
        </Text>
      </View>
      <Text variant="h4" style={{ 
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
      }}>
        No items found
      </Text>
      <Text variant="body" color="secondary" style={{ 
        textAlign: 'center',
        maxWidth: 250,
      }}>
        {emptyMessage}
      </Text>
    </View>
  ));

  // Footer component with loading indicator
  const FooterComponent = useCallback(() => {
    if (ListFooterComponent) {
      return <>{ListFooterComponent}</>;
    }
    
    if (loading && data.length > 0) {
      return (
        <View style={{ 
          padding: theme.spacing.lg,
          alignItems: 'center',
        }}>
          <LoadingSkeleton width={200} height={20} />
          <Text variant="caption" color="muted" style={{ 
            marginTop: theme.spacing.sm 
          }}>
            Loading more items...
          </Text>
        </View>
      );
    }
    
    return null;
  }, [ListFooterComponent, loading, data.length, theme]);

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      contentContainerStyle={[
        data.length === 0 && { flex: 1 },
        contentContainerStyle,
      ]}
      style={style}
      
      // Performance optimizations
      windowSize={windowSize}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      initialNumToRender={initialNumToRender}
      removeClippedSubviews={removeClippedSubviews}
      getItemLayout={numColumns === 1 ? optimizedGetItemLayout : undefined}
      
      // Infinite scrolling
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      
      // Pull to refresh
      refreshControl={onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
          progressBackgroundColor={theme.colors.surface}
        />
      ) : undefined}
      
      // Viewability
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={optimizedViewabilityConfig}
      
      // Components
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={FooterComponent}
      ListEmptyComponent={data.length === 0 ? EmptyComponent : null}
      ItemSeparatorComponent={ItemSeparatorComponent}
      
      // Additional performance props
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

// Specialized components for common use cases
export function ProductVirtualizedList<T>({
  estimatedItemSize = 320,
  numColumns = 2,
  ...props
}: Omit<VirtualizedListProps<T>, 'estimatedItemSize' | 'numColumns'> & {
  estimatedItemSize?: number;
  numColumns?: number;
}) {
  const { theme } = useTheme();
  
  return (
    <VirtualizedList
      estimatedItemSize={estimatedItemSize}
      numColumns={numColumns}
      contentContainerStyle={{
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
      ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
      {...props}
    />
  );
}

export function ChatVirtualizedList<T>({
  estimatedItemSize = 80,
  ...props
}: Omit<VirtualizedListProps<T>, 'estimatedItemSize'> & {
  estimatedItemSize?: number;
}) {
  return (
    <VirtualizedList
      estimatedItemSize={estimatedItemSize}
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}

// Hook for managing virtualized list state
export function useVirtualizedList<T>(initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async (loadFunction: () => Promise<T[]>) => {
    if (loading || !hasMore) return;
    
    try {
      setLoading(true);
      setError(null);
      const newData = await loadFunction();
      
      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newData]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(async (refreshFunction: () => Promise<T[]>) => {
    try {
      setRefreshing(true);
      setError(null);
      const newData = await refreshFunction();
      setData(newData);
      setHasMore(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData([]);
    setLoading(false);
    setRefreshing(false);
    setError(null);
    setHasMore(true);
  }, []);

  return {
    data,
    loading,
    refreshing,
    error,
    hasMore,
    loadMore,
    refresh,
    reset,
    setData,
    setError,
  };
}
