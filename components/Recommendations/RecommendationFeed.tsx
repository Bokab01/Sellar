import React, { useState, useEffect, memo, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { RecommendationSection } from './RecommendationSection';
import { Text } from '@/components/Typography/Text';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { TrendingUp, Star, Eye, Heart, Zap } from 'lucide-react-native';

interface RecommendationFeedProps {
  onListingPress?: (listingId: string) => void;
  onViewAllPersonalized?: () => void;
  onViewAllTrending?: () => void;
  onViewAllRecentlyViewed?: () => void;
  style?: any;
}

const RecommendationFeed = memo(function RecommendationFeed({
  onListingPress,
  onViewAllPersonalized,
  onViewAllTrending,
  onViewAllRecentlyViewed,
  style
}: RecommendationFeedProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedSections, setLoadedSections] = useState<string[]>(['personalized']);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // The individual sections will handle their own refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    // Progressive loading - load sections one by one
    const timer1 = setTimeout(() => {
      setLoadedSections(prev => [...prev, 'trending']);
    }, 200);

    const timer2 = setTimeout(() => {
      setLoadedSections(prev => [...prev, 'recently_viewed']);
    }, 500);

    const timer3 = setTimeout(() => {
      setLoadedSections(prev => [...prev, 'boosted']);
      setLoading(false);
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  if (loading) {
    return (
      <View style={[{ padding: theme.spacing.lg }, style]}>
        <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
        <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
        <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
      </View>
    );
  }


  if (!user) {
    return (
      <View style={[{ padding: theme.spacing.lg }, style]}>
        <ErrorState
          message="Please sign in to see personalized recommendations"
          onRetry={() => {}}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1 }, style]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      scrollEventThrottle={32}
      decelerationRate="fast"
    >
      {/* Personalized Recommendations - Load first */}
      {loadedSections.includes('personalized') && (
        <RecommendationSection
          title="Recommended for You"
          subtitle="Based on your interests and activity"
          icon={<Star size={20} color={theme.colors.primary} />}
          type="personalized"
          limit={6}
          layout="horizontal"
          showViewAll={true}
          onViewAll={onViewAllPersonalized}
          onListingPress={onListingPress}
        />
      )}

      {/* Trending Near You - Load second */}
      {loadedSections.includes('trending') && (
        <RecommendationSection
          title="Trending Near You"
          subtitle="Popular items in your area"
          icon={<TrendingUp size={20} color={theme.colors.primary} />}
          type="trending"
          userLocation={user.user_metadata?.location}
          limit={6}
          layout="horizontal"
          showViewAll={true}
          onViewAll={onViewAllTrending}
          onListingPress={onListingPress}
        />
      )}

      {/* Recently Viewed - Load third */}
      {loadedSections.includes('recently_viewed') && (
        <RecommendationSection
          title="Recently Viewed"
          subtitle="Items you've looked at"
          icon={<Eye size={20} color={theme.colors.primary} />}
          type="recently_viewed"
          limit={6}
          layout="horizontal"
          showViewAll={true}
          onViewAll={onViewAllRecentlyViewed}
          onListingPress={onListingPress}
        />
      )}

      {/* Boosted Listings - Load last */}
      {loadedSections.includes('boosted') && (
        <RecommendationSection
          title="Featured Listings"
          subtitle="Sponsored content"
          icon={<Zap size={20} color={theme.colors.primary} />}
          type="boosted"
          boostType="featured"
          limit={6}
          layout="horizontal"
          showViewAll={false}
          onListingPress={onListingPress}
        />
      )}
    </ScrollView>
  );
});

export { RecommendationFeed };
