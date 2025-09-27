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
        {/* Tab Navigation - Prominent at the top */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.colors.surface,
            marginHorizontal: theme.spacing.lg,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xs,
            ...theme.shadows.sm,
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
                  paddingVertical: theme.spacing.lg,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: isActive ? theme.colors.primary : 'transparent',
                  borderRadius: theme.borderRadius.md,
                  gap: theme.spacing.sm,
                  minHeight: 56,
                }}
                activeOpacity={0.7}
              >
                {React.cloneElement(tab.icon, {
                  size: 20,
                  color: isActive ? theme.colors.primaryForeground : theme.colors.text.primary,
                })}
                <Text
                  variant="body"
                  style={{
                    color: isActive ? theme.colors.primaryForeground : theme.colors.text.primary,
                    fontWeight: isActive ? '700' : '500',
                    fontSize: 16,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content - Everything renders below tabs */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingBottom: theme.spacing.xl
          }}
          showsVerticalScrollIndicator={false}
        >
          <Container>
            {/* Review Summary - Only show for received reviews and when there are reviews */}
            {activeTab === 'received' && reviewStats && reviewStats.total_reviews > 0 && (
              <View style={{ marginBottom: theme.spacing.xl }}>
                <ReviewSummary 
                  userId={user.id} 
                />
              </View>
            )}

            {/* Reviews Content */}
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
    </SafeAreaWrapper>
  );
};

export default ReviewsScreen;
