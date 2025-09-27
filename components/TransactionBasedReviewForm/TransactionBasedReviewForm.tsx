import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Rating } from '@/components/Rating/Rating';
import { Badge } from '@/components/Badge/Badge';
import { Avatar } from '@/components/Avatar/Avatar';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import { 
  Star, 
  CheckCircle, 
  AlertTriangle,
  MessageSquare,
  Shield,
  Users,
  Clock
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase-client';

interface TransactionBasedReviewFormProps {
  visible: boolean;
  onClose: () => void;
  transactionId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  onSuccess?: (review: any) => void;
}

interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  agreed_price: number;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  verification_level: string;
  listing: {
    id: string;
    title: string;
  };
  buyer: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  seller: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function TransactionBasedReviewForm({
  visible,
  onClose,
  transactionId,
  reviewedUserId,
  reviewedUserName,
  onSuccess,
}: TransactionBasedReviewFormProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});

  useEffect(() => {
    if (visible && transactionId) {
      fetchTransaction();
    }
  }, [visible, transactionId]);

  const fetchTransaction = async () => {
    try {
      const { data, error } = await supabase
        .from('meetup_transactions')
        .select(`
          *,
          listing:listings(id, title),
          buyer:profiles!meetup_transactions_buyer_id_fkey(id, full_name, avatar_url),
          seller:profiles!meetup_transactions_seller_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', transactionId)
        .single();

      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      Alert.alert('Error', 'Failed to load transaction details');
    }
  };

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
    if (!validateForm() || !transaction || !user) return;

    setLoading(true);
    try {
      // Determine review type
      const reviewType = user.id === transaction.buyer_id ? 'buyer_to_seller' : 'seller_to_buyer';

      // Determine verification level and transaction confirmation status
      const bothConfirmed = !!(transaction.buyer_confirmed_at && transaction.seller_confirmed_at);
      const verificationLevel = bothConfirmed ? 'mutual_confirmed' : 'single_confirmed';


      const { data: review, error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          reviewed_user_id: reviewedUserId,
          transaction_id: transactionId,
          listing_id: transaction.listing.id,
          rating,
          comment: comment.trim(),
          review_type: reviewType,
          status: 'published',
          is_transaction_confirmed: bothConfirmed,
          verification_level: verificationLevel,
          transaction_value: transaction.agreed_price,
          reviewer_verification_score: 0
        })
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_fkey(id, full_name, avatar_url, username),
          transaction:meetup_transactions!reviews_meetup_transaction_id_fkey(
            id,
            agreed_price,
            status,
            listing:listings(title)
          )
        `)
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Review submitted successfully!',
        [{ 
          text: 'OK', 
          onPress: () => {
            onSuccess?.(review);
            onClose();
          }
        }]
      );
    } catch (error) {
      console.error('Error creating review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatus = () => {
    if (!transaction) return null;

    const bothConfirmed = transaction.buyer_confirmed_at && transaction.seller_confirmed_at;
    const userConfirmed = user?.id === transaction.buyer_id 
      ? transaction.buyer_confirmed_at 
      : transaction.seller_confirmed_at;
    const otherConfirmed = user?.id === transaction.buyer_id 
      ? transaction.seller_confirmed_at 
      : transaction.buyer_confirmed_at;

    if (bothConfirmed) {
      return {
        level: 'mutual_confirmed',
        text: 'Fully Verified Transaction',
        description: 'Both parties confirmed this meetup',
        icon: <CheckCircle size={16} color={theme.colors.success} />,
        color: theme.colors.success,
      };
    } else if (userConfirmed) {
      return {
        level: 'single_confirmed',
        text: 'Partially Verified Transaction',
        description: 'You confirmed this meetup, waiting for other party',
        icon: <Clock size={16} color={theme.colors.warning} />,
        color: theme.colors.warning,
      };
    } else if (otherConfirmed) {
      return {
        level: 'single_confirmed',
        text: 'Partially Verified Transaction',
        description: 'Other party confirmed, you can confirm too',
        icon: <Clock size={16} color={theme.colors.warning} />,
        color: theme.colors.warning,
      };
    } else {
      return {
        level: 'unconfirmed',
        text: 'Unverified Transaction',
        description: 'Neither party has confirmed this meetup yet',
        icon: <Users size={16} color={theme.colors.text.muted} />,
        color: theme.colors.text.muted,
      };
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setErrors({});
    onClose();
  };

  if (!transaction) {
    return (
      <AppModal
        visible={visible}
        onClose={handleClose}
        title="Loading..."
        size="md"
        position="bottom"
      >
        <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
          <Text variant="body" color="secondary">
            Loading transaction details...
          </Text>
        </View>
      </AppModal>
    );
  }

  const verificationStatus = getVerificationStatus();
  const otherUser = user?.id === transaction.buyer_id ? transaction.seller : transaction.buyer;

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title="Write Review"
      size="lg"
      position="bottom"
      primaryAction={{
        text: 'Submit Review',
        onPress: handleSubmit,
        loading,
        icon: <Star size={16} color={theme.colors.primaryForeground} />,
      }}
      secondaryAction={{
        text: 'Cancel',
        onPress: handleClose,
      }}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 500 }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          {/* Transaction Verification Status */}
          <View style={{
            backgroundColor: verificationStatus?.level === 'mutual_confirmed' 
              ? theme.colors.success + '10'
              : verificationStatus?.level === 'single_confirmed'
              ? theme.colors.warning + '10'
              : theme.colors.text.muted + '10',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            borderLeftWidth: 4,
            borderLeftColor: verificationStatus?.color,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {verificationStatus?.icon}
              <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                  {verificationStatus?.text}
                </Text>
                <Text variant="caption" color="secondary">
                  {verificationStatus?.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Transaction Details */}
          <View style={{
            backgroundColor: theme.colors.surfaceVariant,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
          }}>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Transaction Details
            </Text>

            {/* Other User */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <Avatar
                source={otherUser.avatar_url}
                name={otherUser.full_name}
                size="sm"
              />
              <View style={{ marginLeft: theme.spacing.sm }}>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {otherUser.full_name}
                </Text>
                <Text variant="caption" color="secondary">
                  {user?.id === transaction.buyer_id ? 'Seller' : 'Buyer'}
                </Text>
              </View>
            </View>

            {/* Listing */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <MessageSquare size={16} color={theme.colors.text.secondary} />
              <Text variant="body" style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                {transaction.listing.title}
              </Text>
            </View>

            {/* Transaction Value */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text variant="body" color="secondary">
                Transaction Value:
              </Text>
              <Text variant="body" style={{ fontWeight: '600' }}>
                GHS {transaction.agreed_price.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Rating Section */}
          <View>
            <Text variant="h4" style={{ marginBottom: theme.spacing.md }}>
              Rate Your Experience
            </Text>
            <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
              <Rating
                rating={rating}
                onRatingChange={setRating}
                interactive
                size="lg"
                showValue
              />
              {errors.rating && (
                <Text variant="caption" style={{ color: theme.colors.error, marginTop: theme.spacing.sm }}>
                  {errors.rating}
                </Text>
              )}
            </View>
          </View>

          {/* Comment Section */}
          <View>
            <Input
              label="Write Your Review"
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience with this transaction..."
              multiline
              numberOfLines={4}
              maxLength={1000}
              error={errors.comment}
              style={{ minHeight: 100 }}
            />
            <Text variant="caption" color="muted" style={{ textAlign: 'right', marginTop: theme.spacing.xs }}>
              {comment.length}/1000 characters
            </Text>
          </View>

          {/* Review Guidelines */}
          <View style={{
            backgroundColor: theme.colors.info + '10',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Shield size={16} color={theme.colors.info} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                  Review Guidelines
                </Text>
                <Text variant="caption" color="secondary">
                  • Be honest and fair in your review{'\n'}
                  • Focus on the transaction experience{'\n'}
                  • Avoid personal attacks or inappropriate language{'\n'}
                  • {verificationStatus?.level === 'mutual_confirmed' 
                    ? 'This review will be marked as verified' 
                    : 'Consider confirming the transaction for a verified review'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppModal>
  );
}
