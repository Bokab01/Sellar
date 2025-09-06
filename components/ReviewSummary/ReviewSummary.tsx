import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Rating } from '@/components/Rating/Rating';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { useReviewStats, type ReviewStats } from '@/hooks/useReviews';
import { Star } from 'lucide-react-native';

interface ReviewSummaryProps {
  userId: string;
  showDistribution?: boolean;
  style?: any;
}

export function ReviewSummary({ 
  userId, 
  showDistribution = true, 
  style 
}: ReviewSummaryProps) {
  const { theme } = useTheme();
  const { stats, loading, error } = useReviewStats(userId);

  if (loading) {
    return (
      <View style={[{ padding: theme.spacing.lg }, style]}>
        <LoadingSkeleton height={80} />
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={[{ padding: theme.spacing.lg }, style]}>
        <Text variant="body" style={{ color: theme.colors.error, textAlign: 'center' }}>
          Unable to load review statistics
        </Text>
      </View>
    );
  }

  const renderRatingBar = (rating: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <View
        key={rating}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: theme.spacing.sm,
        }}
      >
        {/* Rating Label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', width: 40 }}>
          <Text variant="bodySmall" color="secondary">
            {rating}
          </Text>
          <Star
            size={12}
            color={theme.colors.warning}
            fill={theme.colors.warning}
            style={{ marginLeft: 2 }}
          />
        </View>

        {/* Progress Bar */}
        <View
          style={{
            flex: 1,
            height: 8,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 4,
            marginHorizontal: theme.spacing.sm,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: theme.colors.warning,
              borderRadius: 4,
            }}
          />
        </View>

        {/* Count */}
        <Text variant="bodySmall" color="secondary" style={{ width: 30, textAlign: 'right' }}>
          {count}
        </Text>
      </View>
    );
  };

  return (
    <View style={[
      {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      style
    ]}>
      {stats.total_reviews === 0 ? (
        // No Reviews State
        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.lg }}>
          <Star size={32} color={theme.colors.secondary} />
          <Text variant="h4" style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
            No Reviews Yet
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            This seller hasn&apos;t received any reviews yet.
          </Text>
        </View>
      ) : (
        <>
          {/* Overall Rating */}
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
            <Text variant="h1" style={{ fontSize: 48, fontWeight: 'bold' }}>
              {stats.average_rating.toFixed(1)}
            </Text>
            
            <Rating
              rating={stats.average_rating}
              size="lg"
              showValue={false}
              style={{ marginVertical: theme.spacing.sm }}
            />
            
            <Text variant="body" color="secondary">
              Based on {(stats.total_reviews || 0).toLocaleString()} review{(stats.total_reviews || 0) !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Rating Distribution */}
          {showDistribution && (
            <View>
              <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
                Rating Breakdown
              </Text>
              
              {[5, 4, 3, 2, 1].map(rating => 
                renderRatingBar(
                  rating, 
                  stats.rating_distribution[rating as keyof typeof stats.rating_distribution], 
                  stats.total_reviews
                )
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// Compact version for use in cards
export function CompactReviewSummary({ 
  userId, 
  style 
}: { 
  userId: string; 
  style?: any; 
}) {
  const { theme } = useTheme();
  const { stats, loading } = useReviewStats(userId);

  if (loading) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <LoadingSkeleton width={80} height={20} />
      </View>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Text variant="caption" color="muted">
          No reviews
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <Rating
        rating={stats.average_rating}
        size="sm"
        showValue={true}
        showCount={true}
        reviewCount={stats.total_reviews}
      />
    </View>
  );
}
