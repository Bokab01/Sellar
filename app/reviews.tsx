import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useReviewStats } from '@/hooks/useReviews';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Container,
  ReviewsList,
  ReviewSummary,
  EmptyState,
  LoadingSkeleton,
} from '@/components';
import { Star, MessageSquare, TrendingUp, Users } from 'lucide-react-native';

type ReviewTab = 'received' | 'given';

const ReviewsScreen = () => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ReviewTab>('received');
  
  // Get review stats to conditionally show summary
  const { stats: reviewStats, loading: statsLoading } = useReviewStats(user?.id || '');

  if (!user) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Reviews & Ratings"
          showBackButton
          onBackPress={() => router.back()}
        />
        <Container>
          <EmptyState
            icon={<Star size={48} color={theme.colors.text.muted} />}
            title="Sign in required"
            description="Please sign in to view your reviews"
          />
        </Container>
      </SafeAreaWrapper>
    );
  }

  const tabs = [
    { id: 'received' as ReviewTab, label: 'Reviews Received', icon: <Star size={18} color={theme.colors.text.primary} /> },
    { id: 'given' as ReviewTab, label: 'Reviews Given', icon: <MessageSquare size={18} color={theme.colors.text.primary} /> },
  ];

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Reviews & Ratings"
        showBackButton
        onBackPress={() => router.back()}
      />

      <View style={{ flex: 1 }}>
        <Container>
          {/* Review Summary - Only show for received reviews and when there are reviews */}
          {activeTab === 'received' && reviewStats && reviewStats.total_reviews > 0 && (
            <View style={{ marginBottom: theme.spacing.lg }}>
              <ReviewSummary 
                userId={user.id} 
              />
            </View>
          )}

          {/* Tab Navigation - Fixed position */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.xs,
              marginBottom: theme.spacing.lg,
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.sm,
                    backgroundColor: isActive ? theme.colors.primary : 'transparent',
                    borderRadius: theme.borderRadius.md,
                    gap: theme.spacing.xs,
                  }}
                >
                  {React.cloneElement(tab.icon, {
                    color: isActive ? theme.colors.primaryForeground : theme.colors.text.primary,
                  })}
                  <Text
                    variant="bodySmall"
                    style={{
                      color: isActive ? theme.colors.primaryForeground : theme.colors.text.primary,
                      fontWeight: isActive ? '600' : '400',
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Container>

        {/* Tab Content - Scrollable area */}
        <View style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={{ 
              paddingBottom: theme.spacing.xl
            }}
          >
            <Container>
              {activeTab === 'received' ? (
                <ReviewsList
                  userId={user.id}
                  showWriteReview={false}
                  reviewedUserName={`${(user as any).first_name} ${(user as any).last_name}`}
                />
              ) : (
                <ReviewsList
                  reviewerId={user.id}
                  showWriteReview={false}
                  reviewedUserName="Reviews you've written"
                />
              )}
            </Container>
          </ScrollView>
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

export default ReviewsScreen;
