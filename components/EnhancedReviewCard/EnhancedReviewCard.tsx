import React, { useState } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Text, 
  Avatar, 
  Rating, 
  Badge, 
  Button,
  UserDisplayName,
  VerificationBadge
} from '@/components';
import { 
  CheckCircle, 
  Shield, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  MessageSquare,
  Award,
  Users,
  Clock,
  DollarSign
} from 'lucide-react-native';

interface EnhancedReviewCardProps {
  review: {
    id: string;
    reviewer_id: string;
    reviewed_user_id: string;
    rating: number;
    comment: string;
    verification_level: 'unconfirmed' | 'single_confirmed' | 'mutual_confirmed';
    is_transaction_confirmed: boolean;
    reviewer_verification_score: number;
    transaction_value: number;
    helpful_count: number;
    not_helpful_count: number;
    created_at: string;
    reviewer: {
      id: string;
      full_name: string;
      avatar_url?: string;
      username?: string;
    };
    transaction?: {
      id: string;
      agreed_price: number;
      status: string;
      listing: {
        title: string;
      };
    };
  };
  onHelpfulVote?: (reviewId: string, isHelpful: boolean) => void;
  onReport?: (reviewId: string) => void;
  onRespond?: (reviewId: string) => void;
  showTransactionDetails?: boolean;
  compact?: boolean;
  style?: any;
}

export function EnhancedReviewCard({
  review,
  onHelpfulVote,
  onReport,
  onRespond,
  showTransactionDetails = true,
  compact = false,
  style,
}: EnhancedReviewCardProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [userVote, setUserVote] = useState<boolean | null>(null);

  const getVerificationBadge = () => {
    switch (review.verification_level) {
      case 'mutual_confirmed':
        return {
          text: 'Verified Transaction',
          variant: 'success' as const,
          icon: <CheckCircle size={12} color={theme.colors.success} />,
          description: 'Both parties confirmed this meetup',
        };
      case 'single_confirmed':
        return {
          text: 'Partially Verified',
          variant: 'warning' as const,
          icon: <Clock size={12} color={theme.colors.warning} />,
          description: 'One party confirmed this transaction',
        };
      default:
        return {
          text: 'Unverified',
          variant: 'neutral' as const,
          icon: <Users size={12} color={theme.colors.text.muted} />,
          description: 'Transaction not confirmed by both parties',
        };
    }
  };

  const getTrustScoreBadge = () => {
    const score = review.reviewer_verification_score;
    if (score >= 80) {
      return { text: 'Trusted Reviewer', variant: 'success' as const };
    } else if (score >= 60) {
      return { text: 'Verified Reviewer', variant: 'info' as const };
    } else if (score >= 40) {
      return { text: 'New Reviewer', variant: 'warning' as const };
    }
    return null;
  };

  const handleHelpfulVote = (isHelpful: boolean) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote on reviews');
      return;
    }

    if (user.id === review.reviewer_id) {
      Alert.alert('Cannot Vote', 'You cannot vote on your own review');
      return;
    }

    setUserVote(isHelpful);
    onHelpfulVote?.(review.id, isHelpful);
  };

  const handleReport = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to report reviews');
      return;
    }

    Alert.alert(
      'Report Review',
      'Why are you reporting this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => onReport?.(review.id) },
        { text: 'Inappropriate', onPress: () => onReport?.(review.id) },
        { text: 'Fake', onPress: () => onReport?.(review.id) },
      ]
    );
  };

  const verificationBadge = getVerificationBadge();
  const trustBadge = getTrustScoreBadge();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          padding: compact ? theme.spacing.md : theme.spacing.lg,
          borderRadius: theme.borderRadius.lg,
          borderWidth: 1,
          borderColor: review.is_transaction_confirmed 
            ? theme.colors.success + '30' 
            : theme.colors.border,
          marginBottom: theme.spacing.md,
          // Highlight verified transactions
          ...(review.is_transaction_confirmed && {
            backgroundColor: theme.colors.success + '05',
          }),
        },
        style,
      ]}
    >
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
      }}>
        <Avatar
          source={review.reviewer.avatar_url}
          name={review.reviewer.full_name}
          size={compact ? 'sm' : 'md'}
        />

        <View style={{ marginLeft: theme.spacing.md, flex: 1 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.xs,
          }}>
            <UserDisplayName
              profile={{
                ...review.reviewer,
                is_business: false // Default to false for reviewers
              }}
              variant="primary"
              textVariant={compact ? "bodySmall" : "body"}
              style={{ fontWeight: '600' }}
            />

            {/* Verification Status */}
            <Badge
              text={verificationBadge.text}
              variant={verificationBadge.variant}
              leftIcon={verificationBadge.icon}
              size="small"
            />
          </View>

          {/* Trust Score Badge */}
          {trustBadge && (
            <View style={{ marginBottom: theme.spacing.xs }}>
              <Badge
                text={trustBadge.text}
                variant={trustBadge.variant}
                size="small"
              />
            </View>
          )}

          {/* Rating and Date */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
          }}>
            <Rating
              rating={review.rating}
              size={compact ? 'sm' : 'md'}
              showValue={false}
            />
            <Text variant="caption" color="muted">
              {new Date(review.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Transaction Details */}
      {showTransactionDetails && review.transaction && (
        <View style={{
          backgroundColor: theme.colors.surfaceVariant,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.md,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                Transaction: {review.transaction.listing.title}
              </Text>
              <Text variant="caption" color="secondary">
                {verificationBadge.description}
              </Text>
            </View>
            
            {review.transaction_value > 0 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.primary + '10',
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.borderRadius.sm,
              }}>
                <DollarSign size={12} color={theme.colors.primary} />
                <Text variant="caption" style={{ 
                  color: theme.colors.primary,
                  fontWeight: '600',
                  marginLeft: theme.spacing.xs,
                }}>
                  GHS {review.transaction_value.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Review Comment */}
      <Text 
        variant={compact ? "bodySmall" : "body"} 
        style={{ 
          lineHeight: compact ? 18 : 22,
          marginBottom: theme.spacing.md,
        }}
      >
        {review.comment}
      </Text>

      {/* Actions */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}>
        {/* Helpful Votes */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <TouchableOpacity
            onPress={() => handleHelpfulVote(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              backgroundColor: userVote === true 
                ? theme.colors.success + '20' 
                : 'transparent',
            }}
            activeOpacity={0.7}
          >
            <ThumbsUp 
              size={14} 
              color={userVote === true ? theme.colors.success : theme.colors.text.secondary} 
            />
            <Text 
              variant="caption" 
              style={{ 
                marginLeft: theme.spacing.xs,
                color: userVote === true ? theme.colors.success : theme.colors.text.secondary,
              }}
            >
              {review.helpful_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleHelpfulVote(false)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              backgroundColor: userVote === false 
                ? theme.colors.error + '20' 
                : 'transparent',
            }}
            activeOpacity={0.7}
          >
            <ThumbsDown 
              size={14} 
              color={userVote === false ? theme.colors.error : theme.colors.text.secondary} 
            />
            <Text 
              variant="caption" 
              style={{ 
                marginLeft: theme.spacing.xs,
                color: userVote === false ? theme.colors.error : theme.colors.text.secondary,
              }}
            >
              {review.not_helpful_count}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {user?.id === review.reviewed_user_id && onRespond && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<MessageSquare size={14} color={theme.colors.text.secondary} />}
              onPress={() => onRespond(review.id)}
            >
              Respond
            </Button>
          )}

          <TouchableOpacity
            onPress={handleReport}
            style={{
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
            }}
            activeOpacity={0.7}
          >
            <Flag size={14} color={theme.colors.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Verification Level Indicator */}
      {review.is_transaction_confirmed && (
        <View style={{
          position: 'absolute',
          top: theme.spacing.md,
          right: theme.spacing.md,
        }}>
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.success,
          }} />
        </View>
      )}
    </View>
  );
}

// Compact version for lists
export function CompactEnhancedReviewCard(props: Omit<EnhancedReviewCardProps, 'compact'>) {
  return <EnhancedReviewCard {...props} compact showTransactionDetails={false} />;
}
