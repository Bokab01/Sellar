import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, TouchableOpacity, RefreshControl, ScrollView, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecommendations, RecommendationListing } from '@/hooks/useRecommendations';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { Text } from '@/components/Typography/Text';
import { ProductCard } from '@/components/Card/Card';
import { Grid } from '@/components/Grid/Grid';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { ChevronRight, TrendingUp, Heart, Eye, Star } from 'lucide-react-native';
import { router } from 'expo-router';

interface RecommendationSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  type: 'personalized' | 'trending' | 'category' | 'recently_viewed' | 'collaborative' | 'boosted';
  listingId?: string; // Required for category and collaborative recommendations
  userLocation?: string;
  boostType?: string;
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  onListingPress?: (listingId: string) => void;
  style?: any;
  layout?: 'horizontal' | 'grid'; // New prop to control layout
}

const RecommendationSection = memo(function RecommendationSection({
  title,
  subtitle,
  icon,
  type,
  listingId,
  userLocation,
  boostType,
  limit = 10,
  showViewAll = true,
  onViewAll,
  onListingPress,
  style,
  layout = 'horizontal'
}: RecommendationSectionProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const {
    loading,
    error,
    refreshTrigger,
    getPersonalizedRecommendations,
    getTrendingNearUser,
    getCategoryRecommendations,
    getRecentlyViewed,
    getCollaborativeRecommendations,
    getBoostedListings,
    trackInteraction
  } = useRecommendations();

  const [recommendations, setRecommendations] = useState<RecommendationListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Memoize listing IDs to prevent unnecessary re-renders
  const listingIds = useMemo(() => 
    recommendations.map(item => item.listing_id).filter(Boolean), 
    [recommendations]
  );
  
  // Get favorites and view counts for all listings
  const { favorites: hookFavorites, viewCounts, refreshStats } = useMultipleListingStats({ 
    listingIds 
  });
  
  // Get favorites from global store for sync across all instances
  const { 
    incrementFavoritesCount, 
    decrementFavoritesCount,
    listingFavoriteCounts,
    toggleFavorite: toggleGlobalFavorite,
    incrementListingFavoriteCount,
    decrementListingFavoriteCount,
    updateListingFavoriteCount,
    favorites: globalFavorites
  } = useFavoritesStore();
  
  // Merge hook favorites with global favorites
  const favorites = useMemo(() => ({
    ...hookFavorites,
    ...globalFavorites
  }), [hookFavorites, globalFavorites]);

  const loadRecommendations = useCallback(async () => {
    try {
      let data: RecommendationListing[] = [];

      // Fetch one extra item to check if there are more available
      const fetchLimit = limit + 1;

      switch (type) {
        case 'personalized':
          data = await getPersonalizedRecommendations({ limit: fetchLimit });
          break;
        case 'trending':
          data = await getTrendingNearUser({ limit: fetchLimit, userLocation });
          break;
        case 'category':
          if (listingId) {
            data = await getCategoryRecommendations(listingId, { limit: fetchLimit });
          }
          break;
        case 'recently_viewed':
          data = await getRecentlyViewed({ limit: fetchLimit });
          break;
        case 'collaborative':
          if (listingId) {
            data = await getCollaborativeRecommendations(listingId, { limit: fetchLimit });
          }
          break;
        case 'boosted':
          data = await getBoostedListings({ limit: fetchLimit, boostType });
          break;
      }

      setRecommendations(data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      // Error is already handled by the hook functions (they set error state)
    }
  }, [type, listingId, userLocation, boostType, limit, getPersonalizedRecommendations, getTrendingNearUser, getCategoryRecommendations, getRecentlyViewed, getCollaborativeRecommendations, getBoostedListings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  }, [loadRecommendations]);
  
  // Initialize listing favorite counts when recommendations load
  useEffect(() => {
    recommendations.forEach(item => {
      if (item.favorites_count !== undefined) {
        const currentStoreCount = listingFavoriteCounts[item.listing_id];
        if (currentStoreCount === undefined) {
          updateListingFavoriteCount(item.listing_id, item.favorites_count);
        }
      }
    });
  }, [recommendations]);

  const handleFavoritePress = useCallback(async (listingId: string) => {
    if (!user) return;
    
    try {
      const isFavorited = favorites[listingId] || false;
      
      // Optimistic update using global store (syncs across all instances)
      toggleGlobalFavorite(listingId);
      
      // Update the listing's favorite count optimistically
      if (isFavorited) {
        decrementListingFavoriteCount(listingId);
      } else {
        incrementListingFavoriteCount(listingId);
      }
      
      // Import and use the favorites function
      const { toggleFavorite } = await import('@/lib/favoritesAndViews');
      const result = await toggleFavorite(listingId);
      
      if (result.error) {
        // Revert optimistic updates on error
        toggleGlobalFavorite(listingId);
        if (isFavorited) {
          incrementListingFavoriteCount(listingId);
        } else {
          decrementListingFavoriteCount(listingId);
        }
      } else {
        // Refresh stats to get latest data
        refreshStats();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [user, favorites, toggleGlobalFavorite, incrementListingFavoriteCount, decrementListingFavoriteCount, refreshStats]);

  const handleViewPress = useCallback((listingId: string) => {
    // Navigate to listing detail to see more details
    router.push(`/(tabs)/home/${listingId}`);
  }, []);

  // ✅ OPTIMIZED: Memoized render item for horizontal FlatList
  const renderHorizontalItem = useCallback(({ item, index }: { item: RecommendationListing; index: number }) => {
    // Ensure we have valid data before rendering
    if (!item || !item.listing_id || !item.title) {
      return null;
    }
    
    // ✅ Use pre-computed is_sellar_pro flag (optimal performance)
    const isSellarPro = item.is_sellar_pro === true;
    
    // Determine badge based on status (Priority: Reserved > Urgent > Spotlight > Boosted > PRO)
    let badge;
    if (item.status === 'reserved') {
      badge = { text: 'Reserved', variant: 'warning' as const };
    } else if (item.urgent_until && new Date(item.urgent_until) > new Date()) {
      badge = { text: 'Urgent Sale', variant: 'urgent' as const };
    } else if (item.spotlight_until && new Date(item.spotlight_until) > new Date()) {
      badge = { text: 'Spotlight', variant: 'spotlight' as const };
    } else if (item.boost_until && new Date(item.boost_until) > new Date()) {
      badge = { text: 'Boosted', variant: 'featured' as const };
    } else if (isSellarPro) {
      badge = { text: '⭐ PRO', variant: 'primary' as const };
    }
    
    return (
      <View style={{ width: 180, marginRight: theme.spacing.sm }}>
        <ProductCard
          image={Array.isArray(item.images) ? item.images[0] : (item.images || '')}
          title={item.title || 'Untitled'}
          price={item.price || 0}
          previousPrice={item.previous_price}
          priceChangedAt={item.price_changed_at}
          currency={item.currency || 'GHS'}
          seller={{
            id: item.user_id || '',
            name: item.seller_name || 'Unknown',
            avatar: item.seller_avatar || undefined,
            rating: 0
          }}
          badge={badge}
          location={item.location || 'Unknown'}
          layout="grid"
          shadowSize="sm"
          listingId={item.listing_id}
          isFavorited={favorites[item.listing_id] || false}
          viewCount={viewCounts[item.listing_id] || 0}
          favoritesCount={listingFavoriteCounts[item.listing_id] ?? item.favorites_count ?? 0}
          onPress={() => onListingPress?.(item.listing_id)}
          onFavoritePress={user?.id !== item.user_id ? () => handleFavoritePress(item.listing_id) : undefined}
          onViewPress={() => handleViewPress(item.listing_id)}
          showReportButton={false}
          currentUserId={user?.id || ""}
        />
      </View>
    );
  }, [theme, favorites, viewCounts, listingFavoriteCounts, user, onListingPress, handleFavoritePress, handleViewPress]);

  // ✅ OPTIMIZED: Key extractor
  const keyExtractor = useCallback((item: RecommendationListing, index: number) => 
    item?.listing_id || `recommendation-${index}`, 
    []
  );

  // ✅ OPTIMIZED: getItemLayout for better scroll performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 180 + theme.spacing.sm, // width + marginRight
      offset: (180 + theme.spacing.sm) * index,
      index,
    }),
    [theme]
  );

  // ✅ OPTIMIZED: Slice data to limit for FlatList
  const displayedRecommendations = useMemo(() => 
    recommendations.slice(0, limit), 
    [recommendations, limit]
  );

  // ✅ OPTIMIZED: Memoized render item for grid FlatList
  const renderGridItem = useCallback(({ item, index }: { item: RecommendationListing; index: number }) => {
    // Ensure we have valid data before rendering
    if (!item || !item.listing_id || !item.title) {
      return null;
    }
    
    // ✅ Use pre-computed is_sellar_pro flag (optimal performance)
    const isSellarPro = item.is_sellar_pro === true;
    
    // Determine badge based on status (Priority: Reserved > Urgent > Spotlight > Boosted > PRO)
    let badge;
    if (item.status === 'reserved') {
      badge = { text: 'Reserved', variant: 'warning' as const };
    } else if (item.urgent_until && new Date(item.urgent_until) > new Date()) {
      badge = { text: 'Urgent Sale', variant: 'urgent' as const };
    } else if (item.spotlight_until && new Date(item.spotlight_until) > new Date()) {
      badge = { text: 'Spotlight', variant: 'spotlight' as const };
    } else if (item.boost_until && new Date(item.boost_until) > new Date()) {
      badge = { text: 'Boosted', variant: 'featured' as const };
    } else if (isSellarPro) {
      badge = { text: '⭐ PRO', variant: 'primary' as const };
    }
    
    return (
      <View style={{ flex: 0.5, paddingHorizontal: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
        <ProductCard
          image={Array.isArray(item.images) ? item.images[0] : (item.images || '')}
          title={item.title || 'Untitled'}
          price={item.price || 0}
          previousPrice={item.previous_price}
          priceChangedAt={item.price_changed_at}
          currency={item.currency || 'GHS'}
          seller={{
            id: item.user_id || '',
            name: item.seller_name || 'Unknown',
            avatar: item.seller_avatar || undefined,
            rating: 0
          }}
          badge={badge}
          location={item.location || 'Unknown'}
          layout="grid"
          fullWidth={false}
          shadowSize="sm"
          listingId={item.listing_id}
          isFavorited={favorites[item.listing_id] || false}
          viewCount={viewCounts[item.listing_id] || 0}
          favoritesCount={listingFavoriteCounts[item.listing_id] ?? item.favorites_count ?? 0}
          onPress={() => onListingPress?.(item.listing_id)}
          onFavoritePress={user?.id !== item.user_id ? () => handleFavoritePress(item.listing_id) : undefined}
          onViewPress={() => handleViewPress(item.listing_id)}
          showReportButton={false}
          currentUserId={user?.id || ""}
        />
      </View>
    );
  }, [theme, favorites, viewCounts, listingFavoriteCounts, user, onListingPress, handleFavoritePress, handleViewPress]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations, refreshTrigger]);

  // Refresh recommendations when screen comes into focus (e.g., returning from favorites screen)
  useFocusEffect(
    useCallback(() => {
      // Refresh stats to get latest favorites data
      refreshStats();
      
      // Reload recommendations to reflect any changes
      loadRecommendations();
    }, [refreshStats, loadRecommendations])
  );

  const getDefaultIcon = () => {
    switch (type) {
      case 'personalized':
        return <Star size={20} color={theme.colors.primary} />;
      case 'trending':
        return <TrendingUp size={20} color={theme.colors.primary} />;
      case 'category':
        return <Heart size={20} color={theme.colors.primary} />;
      case 'recently_viewed':
        return <Eye size={20} color={theme.colors.primary} />;
      case 'collaborative':
        return <TrendingUp size={20} color={theme.colors.primary} />;
      case 'boosted':
        return <Star size={20} color={theme.colors.primary} />;
      default:
        return null;
    }
  };

  const getRecommendationReason = (item: RecommendationListing) => {
    if (item.recommendation_reason) return item.recommendation_reason;
    
    switch (type) {
      case 'trending':
        return `Trending • ${item.distance_km ? `${item.distance_km}km away` : 'Near you'}`;
      case 'category':
        return 'Similar items';
      case 'recently_viewed':
        return 'Recently viewed';
      case 'collaborative':
        return 'People also viewed';
      case 'boosted':
        return item.boost_type ? `${item.boost_type.replace('_', ' ')}` : 'Featured';
      default:
        return 'Recommended for you';
    }
  };

  if (loading && recommendations.length === 0) {
    return (
      <View style={[{ marginBottom: theme.spacing.xl }, style]}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {icon || getDefaultIcon()}
            <Text variant="h3">{title}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width={180}
              height={200}
              style={{ borderRadius: theme.borderRadius.lg }}
            />
          ))}
        </View>
      </View>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <View style={[{ marginBottom: theme.spacing.xl }, style]}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {icon || getDefaultIcon()}
            <Text variant="h3">{title}</Text>
          </View>
        </View>
        <ErrorState
          message="Failed to load recommendations"
          onRetry={loadRecommendations}
        />
      </View>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }


  return (
    <View style={[{ marginBottom: theme.spacing.xl }, style]}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {icon || getDefaultIcon()}
            <Text variant="h3">{title}</Text>
          </View>
          {subtitle && (
            <Text variant="bodySmall" color="muted" style={{ marginTop: theme.spacing.xs }}>
              {subtitle}
            </Text>
          )}
        </View>
        
        {showViewAll && onViewAll && recommendations.length > limit && (
          <TouchableOpacity onPress={onViewAll}>
            <Text variant="button" color="primary">
              View All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recommendations List */}
      {layout === 'grid' ? (
        <FlatList
          data={displayedRecommendations}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={{
            paddingHorizontal: theme.spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          // ✅ Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
      ) : (
        <FlatList
          data={displayedRecommendations}
          renderItem={renderHorizontalItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
          }}
          style={{ marginHorizontal: -theme.spacing.lg, paddingVertical: theme.spacing.md}}
          // ✅ Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={3}
          initialNumToRender={3}
          updateCellsBatchingPeriod={50}
          getItemLayout={getItemLayout}
          // ✅ Smooth scrolling
          decelerationRate="fast"
          scrollEventThrottle={16}
          pagingEnabled={false}
          snapToInterval={180 + theme.spacing.sm}
          snapToAlignment="start"
        />
      )}
    </View>
  );
});

export { RecommendationSection };
