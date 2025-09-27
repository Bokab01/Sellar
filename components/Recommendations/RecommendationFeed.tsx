import React, { useState, useEffect } from 'react';
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

export function RecommendationFeed({
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

  const handleRefresh = async () => {
    setRefreshing(true);
    // The individual sections will handle their own refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
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
    >
      {/* Personalized Recommendations */}
      <RecommendationSection
        title="Recommended for You"
        subtitle="Based on your interests and activity"
        icon={<Star size={20} color={theme.colors.primary} />}
        type="personalized"
        limit={6}
        layout="grid"
        showViewAll={true}
        onViewAll={onViewAllPersonalized}
        onListingPress={onListingPress}
      />

      {/* Trending Near You */}
      <RecommendationSection
        title="Trending Near You"
        subtitle="Popular items in your area"
        icon={<TrendingUp size={20} color={theme.colors.primary} />}
        type="trending"
        userLocation={user.user_metadata?.location}
        limit={6}
        layout="grid"
        showViewAll={true}
        onViewAll={onViewAllTrending}
        onListingPress={onListingPress}
      />

      {/* Recently Viewed */}
      <RecommendationSection
        title="Recently Viewed"
        subtitle="Items you've looked at"
        icon={<Eye size={20} color={theme.colors.primary} />}
        type="recently_viewed"
        limit={4}
        layout="grid"
        showViewAll={true}
        onViewAll={onViewAllRecentlyViewed}
        onListingPress={onListingPress}
      />

      {/* Boosted Listings */}
      <RecommendationSection
        title="Featured Listings"
        subtitle="Sponsored content"
        icon={<Zap size={20} color={theme.colors.primary} />}
        type="boosted"
        boostType="featured"
        limit={4}
        layout="grid"
        showViewAll={false}
        onListingPress={onListingPress}
      />
    </ScrollView>
  );
}
