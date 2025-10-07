import React, { useState, useEffect } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { Text } from '@/components/Typography/Text';
import { AppModal } from '@/components/Modal/Modal';
import { Button } from '@/components/Button/Button';
import { Input } from '@/components/Input/Input';
import { Badge } from '@/components/Badge/Badge';
import { Avatar } from '@/components/Avatar/Avatar';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import { 
  CheckCircle, 
  MapPin, 
  Clock, 
  DollarSign,
  User,
  MessageSquare,
  QrCode,
  AlertTriangle,
  HandCoins
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase-client';
import { reputationService } from '@/lib/reputationService';

interface TransactionCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  otherUser: any;
  listing: any;
  existingTransaction?: any;
  onTransactionCreated?: (transactionId: string) => void;
}

export function TransactionCompletionModal({
  visible,
  onClose,
  conversationId,
  otherUser,
  listing,
  existingTransaction,
  onTransactionCreated,
}: TransactionCompletionModalProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'confirmation' | 'success'>(
    existingTransaction ? 'confirmation' : 'details'
  );
  const [transactionData, setTransactionData] = useState({
    agreedPrice: existingTransaction?.agreed_price?.toString() || listing?.price?.toString() || '',
    meetupLocation: existingTransaction?.meetup_location || '',
    meetupTime: existingTransaction?.meetup_time || '',
    buyerNotes: existingTransaction?.buyer_notes || '',
    sellerNotes: existingTransaction?.seller_notes || '',
  });
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(
    existingTransaction?.id || null
  );

  // Sync createdTransactionId when existingTransaction changes
  useEffect(() => {
    if (existingTransaction?.id && !createdTransactionId) {
      setCreatedTransactionId(existingTransaction.id);
    }
  }, [existingTransaction?.id, createdTransactionId]);

  const isBuyer = user?.id !== listing?.user_id;
  const role = isBuyer ? 'buyer' : 'seller';

  const handleCreateTransaction = async () => {
    // If transaction already exists, don't create a new one
    if (existingTransaction) {
      setStep('confirmation');
      return;
    }

    if (!transactionData.agreedPrice.trim()) {
      Alert.alert('Error', 'Please enter the agreed price');
      return;
    }

    const price = Number(transactionData.agreedPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      // Create transaction record with the creator automatically confirmed
      const confirmationField = isBuyer ? 'buyer_confirmed_at' : 'seller_confirmed_at';
      const { data: transaction, error } = await supabase
        .from('meetup_transactions')
        .insert({
          buyer_id: isBuyer ? user!.id : otherUser.id,
          seller_id: isBuyer ? otherUser.id : user!.id,
          listing_id: listing.id,
          conversation_id: conversationId,
          agreed_price: price,
          meetup_location: transactionData.meetupLocation || null,
          meetup_time: transactionData.meetupTime || null,
          buyer_notes: isBuyer ? transactionData.buyerNotes : transactionData.sellerNotes,
          seller_notes: isBuyer ? transactionData.sellerNotes : transactionData.buyerNotes,
          status: 'pending',
          [confirmationField]: new Date().toISOString(), // Auto-confirm the creator
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedTransactionId(transaction.id);
      setStep('success'); // Creator goes straight to success since they're auto-confirmed
      onTransactionCreated?.(transaction.id);

    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMeetup = async () => {
    if (!createdTransactionId) {
      Alert.alert('Error', 'Transaction ID not found. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const confirmationField = isBuyer ? 'buyer_confirmed_at' : 'seller_confirmed_at';
      
      // Update the confirmation timestamp
      const { data: updatedTransaction, error } = await supabase
        .from('meetup_transactions')
        .update({
          [confirmationField]: new Date().toISOString(),
        })
        .eq('id', createdTransactionId)
        .select('buyer_confirmed_at, seller_confirmed_at, listing_id')
        .single();

      if (error) throw error;
      
      // Check if both parties have now confirmed
      const bothConfirmed = updatedTransaction.buyer_confirmed_at && updatedTransaction.seller_confirmed_at;
      
      if (bothConfirmed && updatedTransaction.listing_id) {
        console.log('✅ Both parties confirmed! Finalizing transaction');
        
        // Check if there's a pending transaction for this conversation
        const { data: pendingTxs, error: pendingTxError } = await supabase
          .from('pending_transactions')
          .select('id, quantity_reserved')
          .eq('conversation_id', conversationId)
          .eq('listing_id', updatedTransaction.listing_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!pendingTxError && pendingTxs && pendingTxs.length > 0) {
          // =============================================
          // PARTIAL QUANTITY TRANSACTION
          // =============================================
          const pendingTx = pendingTxs[0];
          console.log('✅ Found pending transaction, confirming quantity:', pendingTx.quantity_reserved);
          
          // Use the confirm_pending_transaction function
          const { data: bothConfirmedPending, error: confirmError } = await supabase
            .rpc('confirm_pending_transaction', {
              p_pending_tx_id: pendingTx.id,
              p_user_id: user!.id,
              p_role: role
            });

          if (confirmError) {
            console.error('Error confirming pending transaction:', confirmError);
          } else {
            console.log('✅ Pending transaction confirmed successfully');
            
            // Link the meetup transaction to the pending transaction
            await supabase
              .from('pending_transactions')
              .update({ meetup_transaction_id: createdTransactionId })
              .eq('id', pendingTx.id);
          }
        } else {
          // =============================================
          // FULL LISTING TRANSACTION (old method)
          // =============================================
          console.log('✅ No pending transaction found, marking full listing as sold');
          
          // Mark listing as sold (remove reservation)
          const { error: listingError } = await supabase
            .from('listings')
            .update({
              status: 'sold',
              reserved_until: null,
              reserved_for: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', updatedTransaction.listing_id);

          if (listingError) {
            console.error('Error marking listing as sold:', listingError);
          } else {
            console.log('✅ Listing marked as sold successfully');
          }
        }
        
        // Award reputation points to both parties for successful transaction
        try {
          const buyerId = updatedTransaction.buyer_id;
          const sellerId = updatedTransaction.seller_id;
          
          await Promise.all([
            reputationService.updateTransactionStats(buyerId, true),
            reputationService.updateTransactionStats(sellerId, true)
          ]);
          
          console.log('✅ Reputation points awarded to both parties');
        } catch (repError) {
          console.error('Failed to award reputation points:', repError);
          // Don't fail transaction completion if reputation update fails
        }
      }
      
      setStep('success');
      
      // Small delay to ensure database update propagates before notifying parent
      setTimeout(() => {
        onTransactionCreated?.(createdTransactionId);
      }, 300);
    } catch (error) {
      console.error('Error confirming transaction:', error);
      Alert.alert('Error', 'Failed to confirm meetup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderDetailsStep = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      style={{ maxHeight: 500 }}
    >
      <View style={{ gap: theme.spacing.lg }}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.primary + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.md,
          }}>
            <CheckCircle size={30} color={theme.colors.primary} />
          </View>
          <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
            Mark as Completed
          </Text>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            Create a transaction record for this meetup to enable reviews
          </Text>
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
            <User size={16} color={theme.colors.text.secondary} />
            <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
              {isBuyer ? 'Seller' : 'Buyer'}:
            </Text>
            <View style={{ marginLeft: theme.spacing.sm }}>
              <UserDisplayName profile={otherUser} variant="primary" />
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
              Item: {listing?.title}
            </Text>
          </View>

          {/* Role Badge */}
          <View style={{ alignItems: 'flex-start' }}>
            <Badge
              text={`You are the ${role}`}
              variant={isBuyer ? 'info' : 'success'}
              size="small"
            />
          </View>
        </View>

        {/* Form Fields */}
        <View style={{ gap: theme.spacing.md }}>
          <Input
            label="Agreed Price (GHS)"
            value={transactionData.agreedPrice}
            onChangeText={(text) => setTransactionData(prev => ({ ...prev, agreedPrice: text }))}
            placeholder="Enter the final agreed price"
            keyboardType="numeric"
            leftIcon={<HandCoins size={20} color={theme.colors.text.secondary} />}
          />

          <Input
            label="Meetup Location (Optional)"
            value={transactionData.meetupLocation}
            onChangeText={(text) => setTransactionData(prev => ({ ...prev, meetupLocation: text }))}
            placeholder="Where did you meet?"
            leftIcon={<MapPin size={20} color={theme.colors.text.secondary} />}
          />

          <Input
            label={`${role === 'buyer' ? 'Buyer' : 'Seller'} Notes (Optional)`}
            value={role === 'buyer' ? transactionData.buyerNotes : transactionData.sellerNotes}
            onChangeText={(text) => setTransactionData(prev => ({ 
              ...prev, 
              [role === 'buyer' ? 'buyerNotes' : 'sellerNotes']: text 
            }))}
            placeholder="Any additional notes about the transaction"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Info Box */}
        <View style={{
          backgroundColor: theme.colors.warning + '10',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          borderLeftWidth: 4,
          borderLeftColor: theme.colors.warning,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color={theme.colors.warning} style={{ marginTop: 2 }} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
                Why create a transaction record?
              </Text>
              <Text variant="caption" color="secondary">
                • Enables authentic reviews from real meetups{'\n'}
                • Builds trust through verified transactions{'\n'}
                • Helps prevent fake or spam reviews{'\n'}
                • Creates a record for both parties
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderConfirmationStep = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      style={{ maxHeight: 400 }}
    >
      <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.success + '20',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <QrCode size={40} color={theme.colors.success} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
          Transaction Created!
        </Text>
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          Now confirm that the meetup happened successfully
        </Text>
      </View>

      <View style={{
        backgroundColor: theme.colors.surfaceVariant,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
      }}>
        <Text variant="h4" style={{ marginBottom: theme.spacing.md, textAlign: 'center' }}>
          Confirm Meetup
        </Text>
        <Text variant="body" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
          Did you successfully meet and complete this transaction?
        </Text>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Button
            variant="secondary"
            onPress={onClose}
            style={{ flex: 1 }}
          >
            Not Yet
          </Button>
          <Button
            variant="primary"
            onPress={handleConfirmMeetup}
            loading={loading}
            style={{ flex: 1 }}
          >
            Yes, Confirm
          </Button>
        </View>
      </View>

      <View style={{
        backgroundColor: theme.colors.info + '10',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        width: '100%',
      }}>
        <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
          Both parties need to confirm for the transaction to be fully verified.
          You can leave reviews once confirmed.
        </Text>
      </View>
      </View>
    </ScrollView>
  );

  const renderSuccessStep = () => (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.success + '20',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <CheckCircle size={40} color={theme.colors.success} />
      </View>

      <View style={{ alignItems: 'center' }}>
        <Text variant="h3" style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}>
          Meetup Confirmed!
        </Text>
        <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
          You can now leave a review for this transaction
        </Text>
      </View>

      <View style={{
        backgroundColor: theme.colors.success + '10',
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        width: '100%',
      }}>
        <Text variant="body" style={{ textAlign: 'center', marginBottom: theme.spacing.md }}>
          🎉 Transaction successfully recorded!
        </Text>
        <Text variant="caption" color="secondary" style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
          This creates a verified transaction that enables authentic reviews and builds trust in the community.
        </Text>
      </View>
    </View>
  );

  const getModalTitle = () => {
    switch (step) {
      case 'details':
        return 'Complete Transaction';
      case 'confirmation':
        return 'Confirm Meetup';
      case 'success':
        return 'Success!';
      default:
        return 'Complete Transaction';
    }
  };

  const getPrimaryAction = () => {
    switch (step) {
      case 'details':
        return {
          text: 'Create Transaction',
          onPress: handleCreateTransaction,
          loading,
          icon: <CheckCircle size={16} color={theme.colors.primaryForeground} />,
        };
      case 'confirmation':
        return undefined; // Handled in the step content
      case 'success':
        return {
          text: 'Done',
          onPress: onClose,
        };
      default:
        return undefined;
    }
  };

  const getSecondaryAction = () => {
    if (step === 'details') {
      return {
        text: 'Cancel',
        onPress: onClose,
      };
    }
    return undefined;
  };

  return (
    <>
      <AppModal
        visible={visible}
        onClose={onClose}
        title={getModalTitle()}
        size="lg"
        position="bottom"
        primaryAction={getPrimaryAction()}
        secondaryAction={getSecondaryAction()}
        dismissOnBackdrop={step !== 'confirmation'}
      >
        {step === 'details' && renderDetailsStep()}
        {step === 'confirmation' && renderConfirmationStep()}
        {step === 'success' && renderSuccessStep()}
      </AppModal>

    </>
  );
}
