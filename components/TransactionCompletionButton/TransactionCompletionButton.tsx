import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button/Button';
import { Badge } from '@/components/Badge/Badge';
import { CheckCircle, Clock, Users, Star } from 'lucide-react-native';
import { TransactionCompletionModal } from '../TransactionCompletionModal/TransactionCompletionModal';
import { TransactionBasedReviewForm } from '../TransactionBasedReviewForm/TransactionBasedReviewForm';

interface TransactionCompletionButtonProps {
  conversationId: string;
  otherUser: any;
  listing: any;
  existingTransaction?: any;
  onTransactionCreated?: (transactionId: string) => void;
  onTransactionUpdated?: () => void;
  style?: any;
}

export function TransactionCompletionButton({
  conversationId,
  otherUser,
  listing,
  existingTransaction,
  onTransactionCreated,
  onTransactionUpdated,
  style,
}: TransactionCompletionButtonProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // If transaction already exists, show status
  if (existingTransaction) {
    const getStatusInfo = () => {
      // Determine if current user is buyer or seller
      const isBuyer = user?.id !== listing?.user_id;
      const currentUserConfirmed = isBuyer 
        ? !!existingTransaction.buyer_confirmed_at 
        : !!existingTransaction.seller_confirmed_at;
      const otherUserConfirmed = isBuyer 
        ? !!existingTransaction.seller_confirmed_at 
        : !!existingTransaction.buyer_confirmed_at;

      // Both users confirmed - transaction is complete
      if (currentUserConfirmed && otherUserConfirmed) {
        // Check if user has already left a review
        const hasLeftReview = existingTransaction.reviews?.some((review: any) => 
          review.reviewer_id === user?.id
        );
        
        if (hasLeftReview) {
          return {
            text: 'Review Submitted',
            variant: 'success' as const,
            icon: <CheckCircle size={16} color={theme.colors.success} />,
            showReviewButton: false,
          };
        }
        
        return {
          text: 'Leave Review',
          variant: 'success' as const,
          icon: <Star size={16} color={theme.colors.success} />,
          showReviewButton: true,
        };
      }

      // Current user has confirmed, waiting for other user
      if (currentUserConfirmed && !otherUserConfirmed) {
        return {
          text: 'Waiting for Confirmation',
          variant: 'info' as const,
          icon: <Clock size={16} color={theme.colors.info} />,
        };
      }

      // Other user confirmed, current user needs to confirm
      if (!currentUserConfirmed && otherUserConfirmed) {
        return {
          text: 'Confirm Transaction',
          variant: 'warning' as const,
          icon: <CheckCircle size={16} color={theme.colors.warning} />,
          showConfirmButton: true,
        };
      }

      // Neither user has confirmed (shouldn't happen, but fallback)
      return {
        text: 'Transaction Created',
        variant: 'info' as const,
        icon: <Users size={16} color={theme.colors.info} />,
      };
    };

    const statusInfo = getStatusInfo();

    // If user needs to confirm, show a button instead of just a badge
    if (statusInfo.showConfirmButton) {
      return (
        <>
          <View style={[{ 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            paddingHorizontal: theme.spacing.sm,
          }]}>
            <Button
              variant="primary"
              onPress={() => setShowModal(true)}
              leftIcon={statusInfo.icon}
              style={[
                {
                  backgroundColor: theme.colors.warning,
                  borderColor: theme.colors.warning,
                  minHeight: 48,
                  paddingHorizontal: theme.spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                style,
              ]}
            >
              {statusInfo.text}
            </Button>
          </View>

          <TransactionCompletionModal
            visible={showModal}
            onClose={() => setShowModal(false)}
            conversationId={conversationId}
            otherUser={otherUser}
            listing={listing}
            existingTransaction={existingTransaction}
            onTransactionCreated={(transactionId) => {
              onTransactionCreated?.(transactionId);
              onTransactionUpdated?.();
            }}
          />
        </>
      );
    }

    // If transaction is completed, show review button or status
    if (statusInfo.showReviewButton !== undefined) {
      return (
        <>
          {statusInfo.showReviewButton ? (
            <View style={[{ 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '100%',
              paddingHorizontal: theme.spacing.sm,
            }]}>
              <Button
                variant="primary"
                onPress={() => setShowReviewForm(true)}
                leftIcon={statusInfo.icon}
                style={[
                  {
                    backgroundColor: theme.colors.success,
                    borderColor: theme.colors.success,
                    minHeight: 48,
                    paddingHorizontal: theme.spacing.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  style,
                ]}
              >
                {statusInfo.text}
              </Button>
            </View>
          ) : (
            <View style={[{ 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '100%',
              paddingHorizontal: theme.spacing.sm,
            }, style]}>
              <Badge
                text={statusInfo.text}
                variant={statusInfo.variant}
                leftIcon={statusInfo.icon}
              />
            </View>
          )}

          {statusInfo.showReviewButton && (
            <TransactionBasedReviewForm
              visible={showReviewForm}
              onClose={() => setShowReviewForm(false)}
              transactionId={existingTransaction.id}
              reviewedUserId={otherUser.id}
              reviewedUserName={otherUser.full_name || otherUser.first_name + ' ' + otherUser.last_name}
              onSuccess={() => {
                setShowReviewForm(false);
                // Refresh transaction data to update button state
                onTransactionUpdated?.();
              }}
            />
          )}
        </>
      );
    }

    return (
      <View style={[{ 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: theme.spacing.sm,
      }, style]}>
        <Badge
          text={statusInfo.text}
          variant={statusInfo.variant}
          leftIcon={statusInfo.icon}
        />
      </View>
    );
  }

  return (
    <>
      <View style={[{ 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: theme.spacing.sm,
      }]}>
        <Button
          variant="primary"
          onPress={() => setShowModal(true)}
          leftIcon={<CheckCircle size={16} color={theme.colors.primaryForeground} />}
          style={[
            {
              backgroundColor: theme.colors.success,
              borderColor: theme.colors.success,
              minHeight: 48,
              paddingHorizontal: theme.spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            },
            style,
          ]}
        >
          Mark as Completed
        </Button>
      </View>

      <TransactionCompletionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        conversationId={conversationId}
        otherUser={otherUser}
        listing={listing}
        onTransactionCreated={onTransactionCreated}
      />
    </>
  );
}
