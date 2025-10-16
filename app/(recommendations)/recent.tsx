import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, SectionList, RefreshControl, TouchableOpacity } from 'react-native';
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
import { Button } from '@/components/Button/Button';
import { Eye, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { RecommendationService } from '@/lib/recommendationService';

// ✅ Section types for SectionList
type SectionData = {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  data: RecommendationListing[][]; // Array of pairs
};

export default function RecentlyViewedScreen() {
  // ✅ CRITICAL: ALL hooks MUST be at the top, before any conditional returns
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    getRecentlyViewed,
    trackInteraction,
    refreshRecommendations
  } = useRecommendations();

  const [recentlyViewed, setRecentlyViewed] = useState<RecommendationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get all listing IDs for stats
  const listingIds = useMemo(() => 
    recentlyViewed.map(r => r.listing_id).filter(Boolean), 
    [recentlyViewed]
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
    if (recentlyViewed.length === 0) return [];

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
      title: 'Recently Viewed',
      subtitle: 'Items you\'ve looked at',
      icon: <Eye size={20} color={theme.colors.primary} />,
      data: createPairs(recentlyViewed)
    }];
  }, [recentlyViewed, theme.colors.primary]);

  const loadRecentlyViewed = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // ✅ Reduced limit for faster loading and less memory usage
      const recent = await getRecentlyViewed({ limit: 30 });
      setRecentlyViewed(recent);
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getRecentlyViewed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecentlyViewed();
    await refreshStats();
    setRefreshing(false);
  }, [loadRecentlyViewed, refreshStats]);

  const handleListingPress = useCallback(async (listingId: string) => {
    if (user) {
      await trackInteraction(listingId, 'view', {
        source: 'recently_viewed',
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

  const handleClearHistory = async () => {
    if (!user) return;

    try {
      await RecommendationService.clearRecentlyViewed(user.id);
      setRecentlyViewed([]);
      // Trigger refresh for all recommendation sections
      refreshRecommendations();
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
    }
  };

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
  const RecentCard = React.memo(({ listing }: { listing: RecommendationListing }) => {
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
      <View style={{ flex: 1, paddingHorizontal: 2 }}>
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
          borderRadius={theme.borderRadius.sm}  
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
          <RecentCard key={listing.listing_id} listing={listing} />
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

  const renderFooter = useCallback(() => (
    <View style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
      <Button
        variant="secondary"
        onPress={handleClearHistory}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Trash2 size={16} color={theme.colors.text.muted} />
        <Text variant="button" color="muted">
          Clear History
        </Text>
      </Button>
    </View>
  ), [theme, handleClearHistory]);

  useEffect(() => {
    // ✅ Delay loading to improve navigation performance
    const timer = setTimeout(() => {
      loadRecentlyViewed();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadRecentlyViewed]);

  if (!user) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Recently Viewed" showBackButton />
        <EmptyState
          title="Sign In Required"
          message="Please sign in to see your recently viewed items"
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
        <AppHeader title="Recently Viewed" showBackButton />
        <HomeScreenSkeleton loadingText="Loading your recently viewed items..." />
      </SafeAreaWrapper>
    );
  }

  if (recentlyViewed.length === 0) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Recently Viewed" showBackButton />
        <EmptyState
          title="No Recent Views"
          message="Items you view will appear here"
          icon={<Eye size={48} color={theme.colors.text.muted} />}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="Recently Viewed" 
        showBackButton 
        onBackPress={() => router.push('/(tabs)/home')}
        rightActions={[
          <TouchableOpacity
            key="clear-history"
            onPress={handleClearHistory}
            style={{
              padding: theme.spacing.sm,
              borderRadius: theme.borderRadius.sm,
              backgroundColor: theme.colors.surfaceVariant,
            }}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color={theme.colors.text.muted} />
          </TouchableOpacity>
        ]}
      />
      
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        ListFooterComponent={renderFooter}
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
