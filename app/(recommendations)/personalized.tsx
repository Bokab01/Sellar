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
import { Star, TrendingUp, Eye, Heart } from 'lucide-react-native';
import { router } from 'expo-router';

export default function PersonalizedRecommendationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    getPersonalizedRecommendations, 
    getTrendingNearUser, 
    getRecentlyViewed,
    trackInteraction 
  } = useRecommendations();

  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any[]>([]);
  const [trendingRecommendations, setTrendingRecommendations] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async () => {
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
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
    setRefreshing(false);
  };

  const handleListingPress = async (listingId: string) => {
    if (user) {
      await trackInteraction(listingId, 'view', {
        source: 'personalized_recommendations',
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
        title="Personalized Recommendations" 
        showBackButton 
        onBackPress={() => router.back()}
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
        {/* Personalized Recommendations */}
        <RecommendationSection
          title="Recommended for You"
          subtitle="Based on your interests and activity"
          icon={<Star size={20} color={theme.colors.primary} />}
          type="personalized"
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
          icon={<TrendingUp size={20} color={theme.colors.primary} />}
          type="trending"
          userLocation={user.user_metadata?.location}
          limit={15}
          layout="grid"
          showViewAll={false}
          onListingPress={handleListingPress}
          style={{ marginBottom: theme.spacing.xl }}
        />

        {/* Recently Viewed */}
        <RecommendationSection
          title="Recently Viewed"
          subtitle="Items you've looked at"
          icon={<Eye size={20} color={theme.colors.primary} />}
          type="recently_viewed"
          limit={15}
          layout="grid"
          showViewAll={false}
          onListingPress={handleListingPress}
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}
