import React, { useState, useEffect } from 'react';
import { View, ScrollView, Linking, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  Badge,
  Avatar,
  LoadingSkeleton,
  PriceDisplay,
  AppModal,
  Toast,
} from '@/components';
import {
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  AlertCircle,
  Info,
  Users,
} from 'lucide-react-native';

interface CancellationRequest {
  id: string;
  requested_by: string;
  confirmed_by: string | null;
  reason: string | null;
  created_at: string;
  declined_at: string | null;
}

interface Deposit {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'released' | 'refunded' | 'expired' | 'claimed' | 'cancelled';
  created_at: string;
  expires_at: string | null;
  meetup_confirmed_by_buyer_at: string | null;
  meetup_confirmed_by_seller_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  listing: {
    title: string;
    price: number;
    images: string[];
    status: string;
  };
  buyer: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  };
  seller: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  };
}

export default function DepositConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [cancellationRequest, setCancellationRequest] = useState<CancellationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // showClaimModal REMOVED - Zero-dispute system
  const [showMutualCancelModal, setShowMutualCancelModal] = useState(false);
  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [showDeclineCancelModal, setShowDeclineCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('success');
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  const isBuyer = deposit?.buyer_id === user?.id;
  const isSeller = deposit?.seller_id === user?.id;

  useEffect(() => {
    fetchDeposit();
  }, [id]);

  const fetchDeposit = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('listing_deposits')
        .select(`
          *,
          listing:listings(title, price, images, status),
          buyer:buyer_id(full_name, avatar_url, phone),
          seller:seller_id(full_name, avatar_url, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setDeposit(data as any);

      // Fetch pending cancellation request if status is 'paid'
      if (data.status === 'paid') {
        const { data: requestData } = await supabase
          .from('deposit_cancellation_requests')
          .select('*')
          .eq('deposit_id', id)
          .is('confirmed_at', null)
          .is('declined_at', null)
          .single();

        setCancellationRequest(requestData);
      }
    } catch (error) {
      console.error('Error fetching deposit:', error);
      showToastMessage('Failed to load deposit details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToastMessage = (message: string, variant: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const handleConfirmMeetup = async () => {
    try {
      setConfirming(true);
      setShowConfirmModal(false);

      const { data, error } = await supabase.rpc('confirm_meetup_buyer', {
        p_deposit_id: id,
      });

      if (error) throw error;

      showToastMessage('Transaction confirmed! Deposit released to seller.', 'success');
      
      // Refresh deposit data
      await fetchDeposit();
      
      // Show review prompt instead of navigating away
      setTimeout(() => {
        setShowReviewPrompt(true);
      }, 1500);
    } catch (error: any) {
      console.error('Error confirming meetup:', error);
      showToastMessage(error.message || 'Failed to confirm meetup', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleLeaveReview = () => {
    setShowReviewPrompt(false);
    // Navigate to review screen with deposit and listing info
    router.push({
      pathname: '/review/create' as any,
      params: {
        listingId: deposit?.listing_id,
        sellerId: deposit?.seller_id,
        depositId: deposit?.id,
        transactionType: 'deposit',
      },
    });
  };

  const handleSkipReview = () => {
    setShowReviewPrompt(false);
    router.back();
  };

  // handleClaimNoShow REMOVED - Zero-dispute system
  // Seller can NO LONGER claim deposits unilaterally

  const handleRequestCancellation = async () => {
    try {
      setConfirming(true);
      setShowMutualCancelModal(false);

      const { data, error } = await supabase.rpc('request_mutual_cancellation', {
        p_deposit_id: id,
        p_reason: cancelReason || null,
      });

      if (error) throw error;

      showToastMessage('Cancellation request sent!', 'success');
      setCancelReason('');
      
      // Refresh deposit data
      await fetchDeposit();
    } catch (error: any) {
      console.error('Error requesting cancellation:', error);
      showToastMessage(error.message || 'Failed to send cancellation request', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmCancellation = async () => {
    try {
      setConfirming(true);
      setShowConfirmCancelModal(false);

      const { data, error } = await supabase.rpc('confirm_mutual_cancellation', {
        p_request_id: cancellationRequest?.id,
      });

      if (error) throw error;

      showToastMessage('Cancellation confirmed. Buyer will be refunded ₵20.', 'success');
      
      // Refresh deposit data
      await fetchDeposit();
      
      // Navigate back after a delay
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (error: any) {
      console.error('Error confirming cancellation:', error);
      showToastMessage(error.message || 'Failed to confirm cancellation', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleDeclineCancellation = async () => {
    try {
      setConfirming(true);
      setShowDeclineCancelModal(false);

      const { data, error } = await supabase.rpc('decline_mutual_cancellation', {
        p_request_id: cancellationRequest?.id,
      });

      if (error) throw error;

      showToastMessage('Cancellation request declined.', 'info');
      
      // Refresh deposit data
      await fetchDeposit();
    } catch (error: any) {
      console.error('Error declining cancellation:', error);
      showToastMessage(error.message || 'Failed to decline cancellation', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const canConfirm = isBuyer && deposit?.status === 'paid' && !deposit?.meetup_confirmed_by_buyer_at;
  // canClaim REMOVED - Zero-dispute system: Seller can NO LONGER claim deposits
  const isConfirmed = deposit?.status === 'released';
  // isClaimed REMOVED - Status no longer exists in zero-dispute system
  const isRefunded = deposit?.status === 'refunded';
  const isExpired = deposit?.status === 'expired';
  const isCancelled = deposit?.status === 'cancelled';

  const getStatusBanner = () => {
    if (isConfirmed) {
      return {
        color: theme.colors.success + '15',
        icon: <CheckCircle size={24} color={theme.colors.success} />,
        title: 'Transaction Complete! 🎉',
        message: 'Buyer confirmed the transaction. Deposit released to seller.',
      };
    }
    if (isRefunded) {
      return {
        color: theme.colors.info + '15',
        icon: <Info size={24} color={theme.colors.info} />,
        title: 'Deposit Refunded',
        message: 'The 3-day window expired. Deposit auto-refunded to buyer.',
      };
    }
    if (isExpired) {
      return {
        color: theme.colors.warning + '15',
        icon: <Clock size={24} color={theme.colors.warning} />,
        title: 'Deposit Expired',
        message: 'The 3-day window has passed. Deposit will be auto-refunded.',
      };
    }
    if (isCancelled) {
      return {
        color: theme.colors.info + '15',
        icon: <XCircle size={24} color={theme.colors.info} />,
        title: 'Deposit Cancelled',
        message: 'Both parties agreed to cancel. Full refund issued to buyer.',
      };
    }
    return {
      color: theme.colors.primary + '15',
      icon: <Clock size={24} color={theme.colors.primary} />,
      title: isBuyer ? 'Complete Your Transaction' : 'Waiting for Buyer',
      message: canConfirm 
        ? 'After receiving the item, tap "Confirm Transaction" to release ₵20 to the seller.'
        : 'The buyer will confirm after receiving the item. Deposit will be released to you.',
    };
  };

  const statusBanner = getStatusBanner();
  const otherParty = isBuyer ? deposit?.seller : deposit?.buyer;

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Deposit Details" showBackButton />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
          <LoadingSkeleton width="100%" height={80} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.lg }} />
          <LoadingSkeleton width="100%" height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.md }} />
          <LoadingSkeleton width="100%" height={120} borderRadius={theme.borderRadius.lg} style={{ marginBottom: theme.spacing.md }} />
          <LoadingSkeleton width="100%" height={100} borderRadius={theme.borderRadius.lg} />
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  if (!deposit) {
    return (
      <SafeAreaWrapper>
        <AppHeader title="Deposit Details" showBackButton />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
          <XCircle size={64} color={theme.colors.text.muted} />
          <Text variant="h3" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
            Deposit Not Found
          </Text>
          <Button
            variant="primary"
            onPress={() => router.back()}
            style={{ marginTop: theme.spacing.lg }}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper>
      <AppHeader title="Deposit Details" showBackButton />

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
        {/* Status Banner */}
        <View
          style={{
            backgroundColor: statusBanner.color,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {statusBanner.icon}
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600', marginBottom: 4 }}>
                {statusBanner.title}
              </Text>
              <Text variant="bodySmall" color="secondary">
                {statusBanner.message}
              </Text>
            </View>
          </View>
        </View>

        {/* Listing Info */}
        <View 
          style={{ 
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="caption" color="secondary">Listing</Text>
          <Text variant="body" style={{ fontWeight: '600', marginTop: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
            {deposit.listing.title}
          </Text>
          <PriceDisplay amount={deposit.listing.price} size="sm" />
        </View>

        {/* Other Party Info */}
        <View 
          style={{ 
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="caption" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
            {isBuyer ? 'Seller' : 'Buyer'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Avatar
              name={otherParty?.full_name || 'Unknown'}
              source={otherParty?.avatar_url || undefined}
              size="md"
            />
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {otherParty?.full_name || 'Unknown'}
              </Text>
              {otherParty?.phone && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`tel:${otherParty.phone}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                >
                  <Phone size={14} color={theme.colors.primary} />
                  <Text variant="bodySmall" color="primary">
                    {otherParty.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Deposit Info */}
        <View 
          style={{ 
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="caption" color="secondary">Deposit Amount</Text>
          <Text variant="h3" style={{ marginTop: theme.spacing.xs, color: theme.colors.primary }}>
            ₵{deposit.amount.toFixed(2)}
          </Text>
          <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.xs }}>
            Paid on {new Date(deposit.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {deposit.expires_at && deposit.status === 'paid' && (
            <View style={{ 
              marginTop: theme.spacing.sm, 
              padding: theme.spacing.sm, 
              backgroundColor: theme.colors.warning + '15',
              borderRadius: theme.borderRadius.sm,
            }}>
              <Text variant="bodySmall" style={{ color: theme.colors.warning }}>
                ⏰ Expires: {new Date(deposit.expires_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        {canConfirm && (
          <View
            style={{
              backgroundColor: theme.colors.info + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Info size={20} color={theme.colors.info} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                  Next Steps:
                </Text>
                <Text variant="bodySmall" style={{ lineHeight: 20 }}>
                  1. Contact the seller to arrange meetup{'\n'}
                  2. Meet and inspect the item{'\n'}
                  3. Complete the transaction{'\n'}
                  4. Come back here and confirm meetup{'\n'}
                  5. The ₵20 will be released to the seller
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* REMOVED: canClaim section (Zero-Dispute System)
            Seller can NO LONGER claim deposits unilaterally.
            Only buyer can release via confirmation.
            Expired deposits auto-refund to buyer. */}

        {/* Mutual Cancellation Section */}
        {deposit?.status === 'paid' && !cancellationRequest && (
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              Need to Cancel?
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md, lineHeight: 20 }}>
              Both parties must agree to cancel. This will result in a full refund to the buyer.
            </Text>
            <Button
              variant="outline"
              onPress={() => setShowMutualCancelModal(true)}
              fullWidth
              leftIcon={<Users size={20} color={theme.colors.primary} />}
            >
              Request Mutual Cancellation
            </Button>
          </View>
        )}

        {/* Pending Cancellation Request - Other Party Requested */}
        {cancellationRequest && cancellationRequest.requested_by !== user?.id && (
          <View
            style={{
              backgroundColor: theme.colors.warning + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.warning,
            }}
          >
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              Cancellation Request Pending
            </Text>
            <Text variant="bodySmall" style={{ marginBottom: theme.spacing.md, lineHeight: 20 }}>
              {isBuyer ? 'The seller' : 'The buyer'} has requested to cancel this deposit.
            </Text>
            {cancellationRequest.reason && (
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  marginBottom: theme.spacing.md,
                }}
              >
                <Text variant="caption" color="secondary">Reason:</Text>
                <Text variant="bodySmall" style={{ marginTop: 4 }}>
                  {cancellationRequest.reason}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button
                variant="primary"
                onPress={() => setShowConfirmCancelModal(true)}
                style={{ flex: 1 }}
                loading={confirming}
                disabled={confirming}
              >
                Accept
              </Button>
              <Button
                variant="outline"
                onPress={() => setShowDeclineCancelModal(true)}
                style={{ flex: 1 }}
                disabled={confirming}
              >
                Decline
              </Button>
            </View>
          </View>
        )}

        {/* Your Cancellation Request Pending */}
        {cancellationRequest && cancellationRequest.requested_by === user?.id && (
          <View
            style={{
              backgroundColor: theme.colors.info + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <Clock size={20} color={theme.colors.info} />
              <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
                Waiting for {isBuyer ? 'Seller' : 'Buyer'} Response
              </Text>
            </View>
            <Text variant="bodySmall" color="secondary" style={{ lineHeight: 20 }}>
              Your cancellation request has been sent. The other party will be notified.
            </Text>
            {cancellationRequest.reason && (
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.sm,
                  marginTop: theme.spacing.md,
                }}
              >
                <Text variant="caption" color="secondary">Your reason:</Text>
                <Text variant="bodySmall" style={{ marginTop: 4 }}>
                  {cancellationRequest.reason}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Button (Buyer Only) */}
        {canConfirm && (
          <Button
            variant="primary"
            onPress={() => setShowConfirmModal(true)}
            loading={confirming}
            disabled={confirming}
            leftIcon={<CheckCircle size={20} color="#FFF" />}
            fullWidth
            style={{ marginBottom: theme.spacing.sm }}
          >
            ✅ Confirm Transaction Complete
          </Button>
        )}

        {/* REMOVED: Claim No-Show Button (Zero-Dispute System)
            Seller can NO LONGER claim deposits.
            Deposits auto-refund after 3 days if buyer doesn't confirm. */}

        {/* Success Message */}
        {isConfirmed && (
          <View
            style={{
              backgroundColor: theme.colors.success + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginTop: theme.spacing.md,
            }}
          >
            <Text variant="body" style={{ textAlign: 'center', color: theme.colors.success }}>
              ✅ {isBuyer ? 'You have confirmed the meetup.' : 'The buyer confirmed the meetup.'} The ₵20 has been released to the seller.
            </Text>
          </View>
        )}

        {/* Review/Report Button for Cancelled/Expired/Refunded */}
        {(isRefunded || isExpired || isCancelled) && (
          <View style={{ marginTop: theme.spacing.lg }}>
            <View
              style={{
                backgroundColor: theme.colors.warning + '10',
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                marginBottom: theme.spacing.md,
              }}
            >
              <Text variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
                {isRefunded && '💰 Deposit has been refunded.'}
                {isExpired && '⏰ The 3-day window has expired.'}
                {isCancelled && '❌ Deposit was cancelled by mutual agreement.'}
              </Text>
              <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
                Your experience matters. Help others by sharing what happened.
              </Text>
            </View>

            <Button
              variant="secondary"
              onPress={() => {
                router.push({
                  pathname: '/review/create' as any,
                  params: {
                    listingId: deposit?.listing_id,
                    sellerId: isBuyer ? deposit?.seller_id : deposit?.buyer_id,
                    depositId: deposit?.id,
                    transactionType: 'deposit',
                    transactionStatus: deposit?.status,
                  },
                });
              }}
              fullWidth
              leftIcon={<AlertCircle size={20} color={theme.colors.warning} />}
            >
              ⚠️ Report Experience
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Confirm Transaction Modal */}
      <AppModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Transaction Complete"
        position="center"
        size="md"
      >
        <View style={{ padding: theme.spacing.md }}>
          <View
            style={{
              backgroundColor: theme.colors.success + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Text variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
              Did you receive the item and complete the transaction with the seller?
            </Text>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.info + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.sm,
              marginBottom: theme.spacing.xl,
            }}
          >
            <Text variant="bodySmall" style={{ textAlign: 'center', lineHeight: 20 }}>
              ℹ️ This will release ₵20 to the seller.{'\n'}
              Only confirm if you're satisfied with the transaction.
            </Text>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              variant="primary"
              onPress={handleConfirmMeetup}
              fullWidth
            >
              ✅ Yes, Release Deposit
            </Button>
            <Button
              variant="outline"
              onPress={() => setShowConfirmModal(false)}
              fullWidth
            >
              Cancel
            </Button>
          </View>
        </View>
      </AppModal>

      {/* REMOVED: Claim No-Show Modal (Zero-Dispute System) */}

      {/* Request Mutual Cancellation Modal */}
      <AppModal
        visible={showMutualCancelModal}
        onClose={() => {
          setShowMutualCancelModal(false);
          setCancelReason('');
        }}
        title="Request Cancellation"
        position="center"
        size="md"
      >
        <View style={{ padding: theme.spacing.md }}>
          <Text variant="body" style={{ marginBottom: theme.spacing.md, lineHeight: 22 }}>
            Both parties must agree to cancel. This will result in a full refund to the buyer.
          </Text>

          <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
            Reason (Optional)
          </Text>
          <TextInput
            value={cancelReason}
            onChangeText={setCancelReason}
            placeholder="e.g., Item no longer available, can't meet, etc."
            placeholderTextColor={theme.colors.text.muted}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              color: theme.colors.text.primary,
              fontSize: 14,
              lineHeight: 20,
              textAlignVertical: 'top',
              marginBottom: theme.spacing.xl,
            }}
          />

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              variant="primary"
              onPress={handleRequestCancellation}
              fullWidth
              loading={confirming}
              disabled={confirming}
            >
              Send Request
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                setShowMutualCancelModal(false);
                setCancelReason('');
              }}
              fullWidth
              disabled={confirming}
            >
              Cancel
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Confirm Cancellation Modal */}
      <AppModal
        visible={showConfirmCancelModal}
        onClose={() => setShowConfirmCancelModal(false)}
        title="Accept Cancellation?"
        position="center"
        size="md"
      >
        <View style={{ padding: theme.spacing.md }}>
          <View
            style={{
              backgroundColor: theme.colors.info + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
            }}
          >
            <Text variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
              Are you sure you want to accept this cancellation request?
            </Text>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.sm,
              marginBottom: theme.spacing.xl,
            }}
          >
            <Text variant="bodySmall" style={{ lineHeight: 20 }}>
              • The deposit will be cancelled{'\n'}
              • The buyer will receive a full refund (₵20){'\n'}
              • This action cannot be undone
            </Text>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              variant="primary"
              onPress={handleConfirmCancellation}
              fullWidth
              loading={confirming}
              disabled={confirming}
            >
              Yes, Accept Cancellation
            </Button>
            <Button
              variant="outline"
              onPress={() => setShowConfirmCancelModal(false)}
              fullWidth
              disabled={confirming}
            >
              No, Keep Deposit
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Decline Cancellation Modal */}
      <AppModal
        visible={showDeclineCancelModal}
        onClose={() => setShowDeclineCancelModal(false)}
        title="Decline Cancellation?"
        position="center"
        size="md"
      >
        <View style={{ padding: theme.spacing.md }}>
          <View
            style={{
              backgroundColor: theme.colors.warning + '15',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.xl,
            }}
          >
            <Text variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
              Are you sure you want to decline this cancellation request?
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
              The deposit will remain active and both parties will need to proceed with the meetup or wait for expiration.
            </Text>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              variant="primary"
              onPress={handleDeclineCancellation}
              fullWidth
              loading={confirming}
              disabled={confirming}
            >
              Yes, Decline Request
            </Button>
            <Button
              variant="outline"
              onPress={() => setShowDeclineCancelModal(false)}
              fullWidth
              disabled={confirming}
            >
              Cancel
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Review Prompt Modal */}
      <AppModal
        visible={showReviewPrompt}
        onClose={handleSkipReview}
        title="Leave a Review? ⭐"
        position="center"
        size="md"
      >
        <View style={{ padding: theme.spacing.lg }}>
          <View
            style={{
              backgroundColor: theme.colors.success + '10',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              marginBottom: theme.spacing.lg,
              alignItems: 'center',
            }}
          >
            <Text variant="h3" style={{ color: theme.colors.success, marginBottom: theme.spacing.sm }}>
              🎉 Transaction Complete!
            </Text>
            <Text variant="body" style={{ textAlign: 'center', lineHeight: 22 }}>
              Help other buyers by sharing your experience with {isBuyer ? 'the seller' : 'the buyer'}.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.info + '10',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.sm,
              marginBottom: theme.spacing.xl,
            }}
          >
            <Text variant="bodySmall" style={{ textAlign: 'center', lineHeight: 20 }}>
              💡 Reviews help build trust in our community and improve the buying experience for everyone.
            </Text>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Button
              variant="primary"
              onPress={handleLeaveReview}
              fullWidth
            >
              ⭐ Leave a Review
            </Button>
            <Button
              variant="outline"
              onPress={handleSkipReview}
              fullWidth
            >
              Maybe Later
            </Button>
          </View>
        </View>
      </AppModal>

      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaWrapper>
  );
}

