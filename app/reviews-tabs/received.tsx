import React, { useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useReviewStats } from '@/hooks/useReviews';
import { Container, ReviewsList, ReviewSummary, EmptyState } from '@/components';
import { Star } from 'lucide-react-native';

export default function ReceivedReviewsTab() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  // Cache data to prevent unnecessary refetches
  const hasLoadedData = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cooldown
  
  // Get review stats to conditionally show summary
  const { stats: reviewStats, loading: statsLoading } = useReviewStats(user?.id || '');

  // Smart focus effect - only refresh if needed
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      if (!hasLoadedData.current || timeSinceLastFetch > FETCH_COOLDOWN) {
        console.log('🔄 Received Reviews: Focus refresh', { hasLoadedData: hasLoadedData.current, timeSinceLastFetch });
        hasLoadedData.current = true;
        lastFetchTime.current = now;
      } else {
        console.log('⏭️ Received Reviews: Using cached data on focus');
      }
    }, [])
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Container style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={<Star size={48} color={theme.colors.text.muted} />}
            title="Sign in required"
            description="Please sign in to view your reviews"
          />
        </Container>
      </View>
    );
  }

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ 
        paddingBottom: theme.spacing.xl
      }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      scrollEventThrottle={32}
      decelerationRate="fast"
    >
      <Container>
        {/* Review Summary - Only show when there are reviews */}
        {reviewStats && reviewStats.total_reviews > 0 && (
          <View style={{ marginBottom: theme.spacing.xl }}>
            <ReviewSummary 
              userId={user.id} 
            />
          </View>
        )}

        {/* Reviews Content */}
        <ReviewsList
          key="received-reviews"
          userId={user.id}
          showWriteReview={false}
          reviewedUserName={`${(user as any).first_name} ${(user as any).last_name}`}
        />
      </Container>
    </ScrollView>
  );
}

