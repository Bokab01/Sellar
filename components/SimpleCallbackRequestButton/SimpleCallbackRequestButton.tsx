import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Text, 
  Button, 
  AppModal, 
  Toast 
} from '@/components';
import { supabase, dbHelpers } from '@/lib/supabase';
import { router } from 'expo-router';
import { PhoneCall, CheckCircle } from 'lucide-react-native';

interface SimpleCallbackRequestButtonProps {
  listingId: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  listingTitle: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  disabled?: boolean;
}

export function SimpleCallbackRequestButton({
  listingId,
  sellerId,
  sellerName,
  sellerPhone,
  listingTitle,
  variant = 'secondary',
  size = 'md',
  showIcon = true,
  disabled = false,
}: SimpleCallbackRequestButtonProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [hasRecentCallbackRequest, setHasRecentCallbackRequest] = useState(false);

  // Don't show button if seller doesn't have phone number
  if (!sellerPhone) {
    return null;
  }

  // Don't show button if user is the seller
  if (user?.id === sellerId) {
    return null;
  }

  const handleRequestCallback = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to request a callback');
      return;
    }

    if (!user.phone) {
      Alert.alert('Phone Required', 'Please add your phone number to your profile to request callbacks');
      return;
    }

    try {
      setLoading(true);
      
      // Find or create conversation
      let conversationId = await findOrCreateConversation();
      
      // Send callback request message
      await sendCallbackMessage(conversationId);
      
      setShowConfirmModal(false);
      setToastMessage(`Callback request sent! Opening chat...`);
      setToastVariant('success');
      setShowToast(true);
      
      // Navigate to chat after a brief delay
      setTimeout(() => {
        router.push(`/(tabs)/inbox/${conversationId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error requesting callback:', error);
      setToastMessage(error instanceof Error ? error.message : 'Failed to send callback request');
      setToastVariant('error');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const findOrCreateConversation = async (): Promise<string> => {
    // First, try to find existing conversation about this listing
    const { data: existingConversations, error: searchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`)
      .or(`participant_1.eq.${sellerId},participant_2.eq.${sellerId}`)
      .limit(1);

    if (searchError) throw searchError;

    if (existingConversations && existingConversations.length > 0) {
      return existingConversations[0].id;
    }

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        participant_1: user!.id,
        participant_2: sellerId,
        listing_id: listingId,
        status: 'active',
      })
      .select('id')
      .single();

    if (createError) throw createError;
    
    return newConversation.id;
  };

  const sendCallbackMessage = async (conversationId: string) => {
    const callbackMessage = `Hi ${sellerName}! Can you call me back about "${listingTitle}"? My number is ${user!.phone}. Thanks! 📞`;
    
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content: callbackMessage,
        message_type: 'callback_request',
        status: 'sent',
      });

    if (error) throw error;
  };

  // Check for recent callback requests in existing conversations
  React.useEffect(() => {
    const checkRecentCallbackRequest = async () => {
      if (!user || !listingId) return;

      try {
        // Check for recent callback request messages in the last 24 hours
        const { data: recentMessages, error } = await supabase
          .from('messages')
          .select('id, created_at')
          .eq('sender_id', user.id)
          .eq('message_type', 'callback_request')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (error) throw error;

        setHasRecentCallbackRequest(recentMessages && recentMessages.length > 0);
      } catch (error) {
        console.error('Error checking recent callback requests:', error);
      }
    };

    checkRecentCallbackRequest();
  }, [user, listingId]);

  // Show different states based on recent requests
  if (hasRecentCallbackRequest) {
    return (
      <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <Button
          variant="secondary"
          size={size}
          disabled={true}
          icon={<CheckCircle size={16} color={theme.colors.success} />}
        >
          Request Sent
        </Button>
        <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
          Check your chat with {sellerName}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onPress={() => setShowConfirmModal(true)}
        icon={showIcon ? <PhoneCall size={16} color={variant === 'primary' ? theme.colors.surface : theme.colors.primary} /> : undefined}
      >
        Request Callback
      </Button>

      {/* Simple Confirmation Modal */}
      <AppModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Request Callback"
        size="lg"
        primaryAction={{
          text: 'Yes, Request Callback',
          onPress: handleRequestCallback,
          loading: loading,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowConfirmModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg, alignItems: 'center', paddingVertical: theme.spacing.md }}>
          <PhoneCall size={48} color={theme.colors.primary} />
          
          <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="h4" style={{ textAlign: 'center' }}>
              Want {sellerName} to call you back?
            </Text>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              About: {listingTitle}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              width: '100%',
            }}
          >
            <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
              {sellerName} will call you at: {user?.phone || 'your phone number'}
            </Text>
          </View>

          <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
            You can only request one callback per listing per day
          </Text>
        </View>
      </AppModal>

      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
        onHide={() => setShowToast(false)}
      />
    </>
  );
}

export default SimpleCallbackRequestButton;
