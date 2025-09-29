import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationSection } from '@/components/Recommendations';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { TrendingUp, MapPin, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

export default function TrendingRecommendationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    getTrendingNearUser, 
    getBoostedListings,
    trackInteraction 
  } = useRecommendations();

  const [trendingRecommendations, setTrendingRecommendations] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const [trending, featured] = await Promise.all([
        getTrendingNearUser({ limit: 30 }),
        getBoostedListings({ boostType: 'featured', limit: 20 })
      ]);

      setTrendingRecommendations(trending);
      setFeaturedListings(featured);
    } catch (error) {
      console.error('Error loading trending recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const handleListingPress = async (listingId: string) => {
    if (user) {
      await trackInteraction(listingId, 'view', {
        source: 'trending_recommendations',
        timeSpent: 0
      });
    }
    router.push(`/(tabs)/home/${listingId}`);
  };

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  if (!user) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Trending Items" showBackButton />
        <EmptyState
          title="Sign In Required"
          message="Please sign in to see trending items"
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
        <AppHeader title="Trending Items" showBackButton />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="100%" height={200} />
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader 
        title="Trending Items" 
        showBackButton 
        onBackPress={() => router.push('/(tabs)/home')}
      />
      
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Listings */}
        <RecommendationSection
          title="Featured Listings"
          subtitle="Sponsored content"
          icon={<TrendingUp size={20} color={theme.colors.primary} />}
          type="boosted"
          boostType="featured"
          limit={20}
          layout="grid"
          showViewAll={false}
          onListingPress={handleListingPress}
          style={{ marginBottom: theme.spacing.xl }}
        />

        {/* Trending Near You */}
        <RecommendationSection
          title="Trending Near You"
          subtitle="Popular items in your area"
          icon={<MapPin size={20} color={theme.colors.primary} />}
          type="trending"
          userLocation={user.user_metadata?.location}
          limit={30}
          layout="grid"
          showViewAll={false}
          onListingPress={handleListingPress}
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}
