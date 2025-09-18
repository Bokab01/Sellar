import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { ReviewCard } from '@/components/ReviewCard/ReviewCard';
import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton/LoadingSkeleton';
import { ReviewForm } from '@/components/ReviewForm/ReviewForm';
import { useReviews, useReviewHelpfulVote, type Review } from '@/hooks/useReviews';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDistanceToNow } from 'date-fns';
import { Star, ThumbsUp, Edit, MessageSquare } from 'lucide-react-native';

interface ReviewsListProps {
  userId?: string;
  listingId?: string;
  reviewerId?: string;
  showWriteReview?: boolean;
  reviewedUserName?: string;
  listingTitle?: string;
  isVerifiedPurchase?: boolean;
  onReviewChange?: () => void;
  style?: any;
}

export function ReviewsList({
  userId,
  listingId,
  reviewerId,
  showWriteReview = false,
  reviewedUserName,
  listingTitle,
  isVerifiedPurchase = false,
  onReviewChange,
  style,
}: ReviewsListProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const { reviews, loading, error, hasMore, refresh, loadMore } = useReviews({
    userId,
    listingId,
    reviewerId,
  });

  // Note: Review deletion is disabled for data integrity
  const { toggleHelpfulVote, loading: voteLoading } = useReviewHelpfulVote();

  const handleWriteReview = () => {
    setEditingReview(null);
    setShowReviewForm(true);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  // Note: Review deletion is disabled for data integrity

  const handleHelpfulVote = async (review: Review) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote on reviews');
      return;
    }

    try {
      await toggleHelpfulVote(review.id, review.user_helpful_vote || false);
      refresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to update vote');
    }
  };

  const handleReviewSuccess = () => {
    refresh();
    onReviewChange?.();
  };

  const renderReviewActions = (review: Review) => {
    const isOwnReview = user?.id === review.reviewer_id;
    
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          marginTop: theme.spacing.md,
        }}
      >
        {/* Helpful Vote - Only show for others' reviews */}
        {!isOwnReview && (
          <TouchableOpacity
            onPress={() => handleHelpfulVote(review)}
            disabled={voteLoading || !user}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.borderRadius.md,
              backgroundColor: review.user_helpful_vote 
                ? theme.colors.primaryContainer 
                : theme.colors.surfaceVariant,
            }}
          >
            <ThumbsUp
              size={14}
              color={review.user_helpful_vote ? theme.colors.primary : theme.colors.secondary}
              fill={review.user_helpful_vote ? theme.colors.primary : 'transparent'}
            />
            <Text
              variant="caption"
              style={{
                color: review.user_helpful_vote ? theme.colors.primary : theme.colors.secondary,
                fontWeight: review.user_helpful_vote ? '600' : '400',
              }}
            >
              Helpful {review.helpful_count > 0 && `(${review.helpful_count})`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Own Review Actions */}
        {isOwnReview && (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <TouchableOpacity
              onPress={() => handleEditReview(review)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                paddingVertical: theme.spacing.xs,
                paddingHorizontal: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              <Edit size={14} color={theme.colors.secondary} />
              <Text variant="caption" color="secondary">
                Edit
              </Text>
            </TouchableOpacity>

            {/* Delete button removed - reviews cannot be deleted for data integrity */}
          </View>
        )}
      </View>
    );
  };

  const renderReview = (review: Review) => {
    const timeAgo = formatDistanceToNow(new Date(review.created_at), { addSuffix: true });
    
    return (
      <View
        key={review.id}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <ReviewCard
          reviewer={{
            name: review.reviewer?.full_name || 'Anonymous',
            avatar: review.reviewer?.avatar_url || undefined,
          }}
          rating={review.rating}
          comment={review.comment}
          timestamp={timeAgo}
          helpful={review.helpful_count}
          verified={review.is_verified_purchase}
          style={{ backgroundColor: 'transparent', padding: 0, margin: 0, borderWidth: 0 }}
        />

        {/* Listing Info (if applicable) */}
        {review.listing && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginTop: theme.spacing.md,
              paddingTop: theme.spacing.md,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <MessageSquare size={16} color={theme.colors.secondary} />
            <Text variant="caption" color="secondary">
              Review for: {review.listing.title}
            </Text>
          </View>
        )}

        {renderReviewActions(review)}
      </View>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <View style={style}>
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingSkeleton
            key={index}
            height={150}
            style={{ marginBottom: theme.spacing.md }}
          />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View style={[{ padding: theme.spacing.lg }, style]}>
        <Text variant="body" style={{ color: theme.colors.error, textAlign: 'center' }}>
          {error}
        </Text>
        <Button
          variant="tertiary"
          onPress={refresh}
          style={{ marginTop: theme.spacing.md }}
        >
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <View style={style}>
      {/* Write Review Button */}
      {showWriteReview && user && userId && user.id !== userId && (
        <Button
          onPress={handleWriteReview}
          style={{ marginBottom: theme.spacing.lg }}
          leftIcon={<Star size={18} color={theme.colors.primaryForeground} />}
        >
          Write a Review
        </Button>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star size={48} color={theme.colors.secondary} />}
          title="No Reviews Yet"
          description={
            showWriteReview && user && userId && user.id !== userId
              ? "Be the first to write a review!"
              : "No reviews have been written yet."
          }
        />
      ) : (
        <>
          {reviews.map(renderReview)}

          {/* Load More Button */}
          {hasMore && (
            <Button
              variant="tertiary"
              onPress={loadMore}
              loading={loading}
              style={{ marginTop: theme.spacing.md }}
            >
              Load More Reviews
            </Button>
          )}
        </>
      )}

      {/* Review Form Modal */}
      {showReviewForm && userId && reviewedUserName && (
        <ReviewForm
          visible={showReviewForm}
          onClose={() => setShowReviewForm(false)}
          reviewedUserId={userId}
          reviewedUserName={reviewedUserName}
          listingId={listingId}
          listingTitle={listingTitle}
          isVerifiedPurchase={isVerifiedPurchase}
          existingReview={editingReview || undefined}
          onSuccess={handleReviewSuccess}
        />
      )}
    </View>
  );
}
