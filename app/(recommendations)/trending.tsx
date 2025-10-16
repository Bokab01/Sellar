import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, SectionList, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecommendations, RecommendationListing } from '@/hooks/useRecommendations';
import { useMultipleListingStats } from '@/hooks/useListingStats';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { ProductCard } from '@/components/Card/Card';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { LoadingSkeleton, HomeScreenSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';

// ✅ Section types for SectionList
type SectionData = {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  data: RecommendationListing[][]; // Array of pairs
};

export default function TrendingScreen() {
  // ✅ CRITICAL: ALL hooks MUST be at the top, before any conditional returns
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    getTrendingNearUser,
    trackInteraction
  } = useRecommendations();

  const [trendingItems, setTrendingItems] = useState<RecommendationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get all listing IDs for stats
  const listingIds = useMemo(() => 
    trendingItems.map(r => r.listing_id).filter(Boolean), 
    [trendingItems]
  );

  const { viewCounts, refreshStats } = useMultipleListingStats({ listingIds });
  const { 
    favorites, 
    listingFavoriteCounts,
    toggleFavorite: toggleGlobalFavorite,
    incrementListingFavoriteCount,
    decrementListingFavoriteCount
  } = useFavoritesStore();

  // ✅ Optimized section list data structure with memoized pairs
  const sections = useMemo<SectionData[]>(() => {
    if (trendingItems.length === 0) return [];

    // Memoized helper to create pairs
    const createPairs = (items: RecommendationListing[]): RecommendationListing[][] => {
      if (items.length === 0) return [];
      const pairs: RecommendationListing[][] = [];
      for (let i = 0; i < items.length; i += 2) {
        pairs.push([items[i], items[i + 1]].filter(Boolean));
      }
      return pairs;
    };

    return [{
      title: 'Trending Near You',
      subtitle: 'Popular items in your area',
      icon: <TrendingUp size={20} color={theme.colors.primary} />,
      data: createPairs(trendingItems)
    }];
  }, [trendingItems, theme.colors.primary]);

  const loadTrendingItems = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // ✅ Reduced limit for faster loading and less memory usage
      const trending = await getTrendingNearUser({ limit: 30 });
      setTrendingItems(trending);
    } catch (error) {
      console.error('Error loading trending items:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getTrendingNearUser]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTrendingItems();
    await refreshStats();
    setRefreshing(false);
  }, [loadTrendingItems, refreshStats]);

  const handleListingPress = useCallback(async (listingId: string) => {
    if (user) {
      await trackInteraction(listingId, 'view', {
        source: 'trending',
        timeSpent: 0
      });
    }
    router.push(`/(tabs)/home/${listingId}`);
  }, [user, trackInteraction]);

  const handleFavoritePress = useCallback(async (listingId: string) => {
    const isFavorited = favorites[listingId] || false;
    
    // Optimistic update
    toggleGlobalFavorite(listingId);
    if (isFavorited) {
      decrementListingFavoriteCount(listingId);
    } else {
      incrementListingFavoriteCount(listingId);
    }

    try {
      const { toggleFavorite } = await import('@/lib/favoritesAndViews');
      const result = await toggleFavorite(listingId);
      
      if (result.error) {
        // Revert on error
        toggleGlobalFavorite(listingId);
        if (isFavorited) {
          incrementListingFavoriteCount(listingId);
        } else {
          decrementListingFavoriteCount(listingId);
        }
      } else {
        refreshStats();
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [favorites, toggleGlobalFavorite, incrementListingFavoriteCount, decrementListingFavoriteCount, refreshStats]);

  // ✅ Memoized section header component
  const SectionHeader = React.memo(({ section }: { section: SectionData }) => (
    <View style={{ 
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.background,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
        {section.icon}
        <Text variant="h3">{section.title}</Text>
      </View>
      {section.subtitle && (
        <Text variant="bodySmall" color="muted">
          {section.subtitle}
        </Text>
      )}
    </View>
  ));

  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <SectionHeader section={section} />
  ), []);

  // ✅ Memoized card component for better performance
  const TrendingCard = React.memo(({ listing }: { listing: RecommendationListing }) => {
    const isSellarPro = listing.is_sellar_pro === true;
    
    let badge;
    if (listing.status === 'reserved') {
      badge = { text: 'Reserved', variant: 'warning' as const };
    } else if (listing.urgent_until && new Date(listing.urgent_until) > new Date()) {
      badge = { text: 'Urgent Sale', variant: 'urgent' as const };
    } else if (listing.spotlight_until && new Date(listing.spotlight_until) > new Date()) {
      badge = { text: 'Spotlight', variant: 'spotlight' as const };
    } else if (listing.boost_until && new Date(listing.boost_until) > new Date()) {
      badge = { text: 'Boosted', variant: 'featured' as const };
    } else if (isSellarPro) {
      badge = { text: '⭐ PRO', variant: 'primary' as const };
    }

    return (
      <View style={{ flex: 1, paddingHorizontal: theme.spacing.sm }}>
        <ProductCard
          image={Array.isArray(listing.images) ? listing.images[0] : (listing.images || '')}
          title={listing.title || 'Untitled'}
          price={listing.price || 0}
          previousPrice={listing.previous_price}
          priceChangedAt={listing.price_changed_at}
          currency={listing.currency || 'GHS'}
          seller={{
            id: listing.user_id || '',
            name: listing.seller_name || 'Unknown',
            avatar: listing.seller_avatar || undefined,
            rating: 0
          }}
          badge={badge}
          location={listing.location || 'Unknown'}
          layout="grid"
          fullWidth={false}
          shadowSize="sm"
          listingId={listing.listing_id}
          isFavorited={favorites[listing.listing_id] || false}
          viewCount={viewCounts[listing.listing_id] || 0}
          favoritesCount={listingFavoriteCounts[listing.listing_id] ?? listing.favorites_count ?? 0}
          onPress={() => handleListingPress(listing.listing_id)}
          onFavoritePress={user?.id !== listing.user_id ? () => handleFavoritePress(listing.listing_id) : undefined}
          showReportButton={false}
          currentUserId={user?.id || ""}
        />
      </View>
    );
  });

  // ✅ Optimized render item with memoized components
  const renderItem = useCallback(({ item: pair }: { item: RecommendationListing[] }) => {
    return (
      <View style={{ flexDirection: 'row', marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.xs }}>
        {pair.map((listing) => (
          <TrendingCard key={listing.listing_id} listing={listing} />
        ))}
        {/* Add spacer if only one item in pair */}
        {pair.length === 1 && <View style={{ flex: 1 }} />}
      </View>
    );
  }, [theme.spacing.sm, theme.spacing.xs]);

  const keyExtractor = useCallback((item: RecommendationListing[], index: number) => 
    `row-${index}-${item.map(i => i.listing_id).join('-')}`,
    []
  );

  useEffect(() => {
    // ✅ Delay loading to improve navigation performance
    const timer = setTimeout(() => {
      loadTrendingItems();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadTrendingItems]);

  if (!user) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Trending Near You" showBackButton />
        <EmptyState
          title="Sign In Required"
          message="Please sign in to see trending items near you"
          action={{
            text: 'Sign In',
            onPress: () => router.push('/(auth)/sign-in')
          }}
        />
      </SafeAreaWrapper>
    );
  }

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Trending Near You" showBackButton />
        <HomeScreenSkeleton loadingText="Finding trending items near you..." />
      </SafeAreaWrapper>
    );
  }

  if (trendingItems.length === 0) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Trending Near You" showBackButton />
        <EmptyState
          title="No Trending Items"
          message="Check back later for popular items in your area"
          icon={<TrendingUp size={48} color={theme.colors.text.muted} />}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="Trending Near You" 
        showBackButton 
        onBackPress={() => router.push('/(tabs)/home')}
      />
      
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        // ✅ Enhanced performance optimizations for smooth navigation
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        windowSize={7}
        initialNumToRender={8}
        updateCellsBatchingPeriod={100}
        decelerationRate="fast"
        scrollEventThrottle={32}
        // ✅ Optimize for navigation transitions
        getItemLayout={(data, index) => ({
          length: 200, // Approximate row height
          offset: 200 * index,
          index,
        })}
      />
    </SafeAreaWrapper>
  );
}
