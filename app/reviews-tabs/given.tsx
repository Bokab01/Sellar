import React, { useCallback, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { Container, ReviewsList, EmptyState } from '@/components';
import { MessageSquare } from 'lucide-react-native';

export default function GivenReviewsTab() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  // Cache data to prevent unnecessary refetches
  const hasLoadedData = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 30000; // 30 seconds cooldown

  // Smart focus effect - only refresh if needed
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;
      
      if (!hasLoadedData.current || timeSinceLastFetch > FETCH_COOLDOWN) {
        hasLoadedData.current = true;
        lastFetchTime.current = now;
      } else {
      }
    }, [])
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Container style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={<MessageSquare size={48} color={theme.colors.text.muted} />}
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
        {/* Reviews Content */}
        <ReviewsList
          key="given-reviews"
          reviewerId={user.id}
          showWriteReview={false}
          reviewedUserName="Reviews you've written"
        />
      </Container>
    </ScrollView>
  );
}

