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
import { Star, TrendingUp, Eye } from 'lucide-react-native';
import { router } from 'expo-router';

// ✅ Section types for SectionList
type SectionData = {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  data: RecommendationListing[][]; // Array of pairs
};

export default function PersonalizedRecommendationsScreen() {
  // ✅ CRITICAL: ALL hooks MUST be at the top, before any conditional returns
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    getPersonalizedRecommendations, 
    getTrendingNearUser, 
    getRecentlyViewed,
    trackInteraction 
  } = useRecommendations();

  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<RecommendationListing[]>([]);
  const [trendingRecommendations, setTrendingRecommendations] = useState<RecommendationListing[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecommendationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get all listing IDs for stats
  const listingIds = useMemo(() => [
    ...personalizedRecommendations.map(r => r.listing_id),
    ...trendingRecommendations.map(r => r.listing_id),
    ...recentlyViewed.map(r => r.listing_id),
  ].filter(Boolean), [personalizedRecommendations, trendingRecommendations, recentlyViewed]);

  const { viewCounts, refreshStats } = useMultipleListingStats({ listingIds });
  const { 
    favorites, 
    listingFavoriteCounts,
    toggleFavorite: toggleGlobalFavorite,
    incrementListingFavoriteCount,
    decrementListingFavoriteCount
  } = useFavoritesStore();

  // ✅ Create section list data structure with pairs for 2-column grid
  const sections = useMemo<SectionData[]>(() => {
    const sectionArray: SectionData[] = [];

    // Helper to create pairs
    const createPairs = (items: RecommendationListing[]): RecommendationListing[][] => {
      const pairs: RecommendationListing[][] = [];
      for (let i = 0; i < items.length; i += 2) {
        pairs.push([items[i], items[i + 1]].filter(Boolean));
      }
      return pairs as any;
    };

    // Personalized section
    if (personalizedRecommendations.length > 0) {
      sectionArray.push({
        title: 'Recommended for You',
        subtitle: 'Based on your interests and activity',
        icon: <Star size={20} color={theme.colors.primary} />,
        data: createPairs(personalizedRecommendations) as any
      });
    }

    // Trending section
    if (trendingRecommendations.length > 0) {
      sectionArray.push({
        title: 'Trending Near You',
        subtitle: 'Popular items in your area',
        icon: <TrendingUp size={20} color={theme.colors.primary} />,
        data: createPairs(trendingRecommendations) as any
      });
    }

    // Recently viewed section
    if (recentlyViewed.length > 0) {
      sectionArray.push({
        title: 'Recently Viewed',
        subtitle: 'Items you\'ve looked at',
        icon: <Eye size={20} color={theme.colors.primary} />,
        data: createPairs(recentlyViewed) as any
      });
    }

    return sectionArray;
  }, [personalizedRecommendations, trendingRecommendations, recentlyViewed, theme]);

  const loadRecommendations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const [personalized, trending, recent] = await Promise.all([
        getPersonalizedRecommendations({ limit: 20 }),
        getTrendingNearUser({ limit: 15 }),
        getRecentlyViewed({ limit: 15 })
      ]);

      setPersonalizedRecommendations(personalized);
      setTrendingRecommendations(trending);
      setRecentlyViewed(recent);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getPersonalizedRecommendations, getTrendingNearUser, getRecentlyViewed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendations();
    await refreshStats();
    setRefreshing(false);
  }, [loadRecommendations, refreshStats]);

  const handleListingPress = useCallback(async (listingId: string) => {
    if (user) {
      await trackInteraction(listingId, 'view', {
        source: 'personalized_recommendations',
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

  // ✅ Render section header
  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <View style={{ 
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
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
  ), [theme]);

  // ✅ Render row of 2 items for SectionList
  const renderItem = useCallback(({ item: pair, index }: { item: RecommendationListing[]; index: number }) => {
    const renderCard = (listing: RecommendationListing) => {
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
        <View style={{ flex: 1, paddingHorizontal: 2}}>
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
    };

    return (
      <View style={{ flexDirection: 'row', marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.xs }}>
        {pair.map((listing) => (
          <React.Fragment key={listing.listing_id}>
            {renderCard(listing)}
          </React.Fragment>
        ))}
        {/* Add spacer if only one item in pair */}
        {pair.length === 1 && <View style={{ flex: 1 }} />}
      </View>
    );
  }, [theme, favorites, viewCounts, listingFavoriteCounts, user, handleListingPress, handleFavoritePress]);

  const keyExtractor = useCallback((item: RecommendationListing[], index: number) => 
    `row-${index}-${item.map(i => i.listing_id).join('-')}`,
    []
  );

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (!user) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Personalized Recommendations" showBackButton />
        <EmptyState
          title="Sign In Required"
          message="Please sign in to see personalized recommendations"
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
        <AppHeader title="Personalized Recommendations" showBackButton />
        <HomeScreenSkeleton loadingText="Personalizing recommendations for you..." />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="Personalized Recommendations" 
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
        // ✅ Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        updateCellsBatchingPeriod={50}
      />
    </SafeAreaWrapper>
  );
}
