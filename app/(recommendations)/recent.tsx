import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useRecommendations } from '@/hooks/useRecommendations';
import { RecommendationSection } from '@/components/Recommendations';
import { Text } from '@/components/Typography/Text';
import { SafeAreaWrapper } from '@/components/Layout';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { Button } from '@/components/Button/Button';
import { Eye, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { RecommendationService } from '@/lib/recommendationService';

export default function RecentlyViewedScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    getRecentlyViewed,
    trackInteraction,
    refreshRecommendations
  } = useRecommendations();

  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecentlyViewed = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const recent = await getRecentlyViewed({ limit: 50 });
      setRecentlyViewed(recent);
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecentlyViewed();
    setRefreshing(false);
  };

  const handleListingPress = async (listingId: string) => {
    if (user) {
      await trackInteraction(listingId, 'view', {
        source: 'recently_viewed',
        timeSpent: 0
      });
    }
    router.push(`/(tabs)/home/${listingId}`);
  };

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

  useEffect(() => {
    loadRecentlyViewed();
  }, [user]);

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
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="100%" height={200} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="100%" height={200} />
        </View>
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
        {/* Recently Viewed Items */}
        <RecommendationSection
          title="Recently Viewed"
          subtitle="Items you've looked at"
          icon={<Eye size={20} color={theme.colors.primary} />}
          type="recently_viewed"
          limit={50}
          layout="grid"
          showViewAll={false}
          onListingPress={handleListingPress}
        />

        {/* Clear History Button */}
        <View style={{ marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
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
      </ScrollView>
    </SafeAreaWrapper>
  );
}
