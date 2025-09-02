import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/Typography/Text';
import { Input } from '@/components/Input/Input';
import { Button } from '@/components/Button/Button';
import { Rating } from '@/components/Rating/Rating';
import { Modal } from '@/components/Modal/Modal';
import { useCreateReview, useUpdateReview, type CreateReviewData, type Review } from '@/hooks/useReviews';

interface ReviewFormProps {
  visible: boolean;
  onClose: () => void;
  reviewedUserId: string;
  reviewedUserName: string;
  listingId?: string;
  listingTitle?: string;
  isVerifiedPurchase?: boolean;
  existingReview?: Review;
  onSuccess?: (review: Review) => void;
}

export function ReviewForm({
  visible,
  onClose,
  reviewedUserId,
  reviewedUserName,
  listingId,
  listingTitle,
  isVerifiedPurchase = false,
  existingReview,
  onSuccess,
}: ReviewFormProps) {
  const { theme } = useTheme();
  const { createReview, loading: createLoading } = useCreateReview();
  const { updateReview, loading: updateLoading } = useUpdateReview();
  
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});

  const loading = createLoading || updateLoading;
  const isEditing = !!existingReview;

  const validateForm = () => {
    const newErrors: { rating?: string; comment?: string } = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Please write a review comment';
    } else if (comment.trim().length < 10) {
      newErrors.comment = 'Review must be at least 10 characters long';
    } else if (comment.trim().length > 1000) {
      newErrors.comment = 'Review must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      let result: Review;

      if (isEditing && existingReview) {
        result = await updateReview(existingReview.id, {
          rating,
          comment: comment.trim()
        });
      } else {
        const reviewData: CreateReviewData = {
          reviewed_id: reviewedUserId,
          rating,
          comment: comment.trim(),
          is_verified_purchase: isVerifiedPurchase
        };

        if (listingId) {
          reviewData.listing_id = listingId;
        }

        result = await createReview(reviewData);
      }

      Alert.alert(
        'Success',
        isEditing ? 'Review updated successfully!' : 'Review submitted successfully!',
        [{ text: 'OK', onPress: () => {
          onSuccess?.(result);
          onClose();
        }}]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to submit review'
      );
    }
  };

  const handleClose = () => {
    setRating(existingReview?.rating || 0);
    setComment(existingReview?.comment || '');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={isEditing ? 'Edit Review' : 'Write a Review'}
    >
      <View style={{ padding: theme.spacing.lg }}>
        {/* Review Target Info */}
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.xs }}>
            {listingTitle ? 'Reviewing seller for' : 'Reviewing seller'}
          </Text>
          
          {listingTitle && (
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
              {listingTitle}
            </Text>
          )}
          
          <Text variant="body" style={{ fontWeight: '600' }}>
            {reviewedUserName}
          </Text>

          {isVerifiedPurchase && (
            <View
              style={{
                backgroundColor: theme.colors.success,
                borderRadius: theme.borderRadius.sm,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                alignSelf: 'flex-start',
                marginTop: theme.spacing.sm,
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: theme.colors.successForeground,
                  fontWeight: '600',
                }}
              >
                ✓ Verified Purchase
              </Text>
            </View>
          )}
        </View>

        {/* Rating Section */}
        <View style={{ marginBottom: theme.spacing.lg }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Rating *
          </Text>
          
          <View style={{ alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <Rating
              rating={rating}
              size="lg"
              interactive
              onRatingChange={setRating}
            />
          </View>

          {rating > 0 && (
            <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </Text>
          )}

          {errors.rating && (
            <Text variant="caption" style={{ color: theme.colors.error, marginTop: theme.spacing.xs }}>
              {errors.rating}
            </Text>
          )}
        </View>

        {/* Comment Section */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
            Review *
          </Text>
          
          <Input
            placeholder="Share your experience with this seller..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            maxLength={1000}
            style={{ minHeight: 100 }}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: theme.spacing.sm,
            }}
          >
            {errors.comment ? (
              <Text variant="caption" style={{ color: theme.colors.error }}>
                {errors.comment}
              </Text>
            ) : (
              <Text variant="caption" color="muted">
                Minimum 10 characters
              </Text>
            )}
            
            <Text variant="caption" color="muted">
              {comment.length}/1000
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
          }}
        >
          <Button
            variant="outline"
            onPress={handleClose}
            style={{ flex: 1 }}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            onPress={handleSubmit}
            style={{ flex: 1 }}
            loading={loading}
            disabled={loading}
          >
            {isEditing ? 'Update Review' : 'Submit Review'}
          </Button>
        </View>
      </View>
    </Modal>
  );
}
