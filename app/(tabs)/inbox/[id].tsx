import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useMessages } from '@/hooks/useChat';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { dbHelpers, supabase } from '@/lib/supabase';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  ChatBubble,
  MessageInput,
  OfferCard,
  UserProfile,
  AppModal,
  Input,
  Button,
  PriceDisplay,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  Toast,
  Avatar,
  Badge,
} from '@/components';
import { Phone, Video, MoveVertical as MoreVertical, DollarSign, Info, Eye } from 'lucide-react-native';

export default function ChatScreen() {
  const { theme } = useTheme();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { draftMessages, setDraftMessage, clearDraftMessage, markAsRead } = useChatStore();
  
  const { messages, loading, error, sendMessage } = useMessages(conversationId!);
  
  const [messageText, setMessageText] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Get conversation details
  const [conversation, setConversation] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (conversationId) {
      fetchConversationDetails();
      markAsRead(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    // Load draft message
    const draft = draftMessages[conversationId!] || '';
    setMessageText(draft);
  }, [conversationId, draftMessages]);

  useEffect(() => {
    // Save draft message
    if (conversationId) {
      setDraftMessage(conversationId, messageText);
    }
  }, [messageText, conversationId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const fetchConversationDetails = async () => {
    try {
      const { data, error } = await dbHelpers.getConversations(user!.id);
      if (data) {
        const conv = (data as any).find((c: any) => c.id === conversationId);
        if (conv) {
          setConversation(conv);
          const otherParticipant = (conv as any).participant_1_profile?.id === user!.id 
            ? (conv as any).participant_2_profile 
            : (conv as any).participant_1_profile;
          setOtherUser(otherParticipant);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversation details:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const content = messageText.trim();
    setMessageText('');
    clearDraftMessage(conversationId!);

    const { error } = await sendMessage(content);
    if (error) {
      showErrorToast('Failed to send message');
      setMessageText(content); // Restore message on error
    }
  };


  const handleSendOffer = async () => {
    if (!offerAmount.trim()) {
      Alert.alert('Error', 'Please enter an offer amount');
      return;
    }

    const amount = Number(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSendingOffer(true);
    try {
      // Create offer message first
      const offerContent = `💰 Offer: GHS ${(amount || 0).toLocaleString()}${offerMessage ? `\n\n"${offerMessage}"` : ''}`;
      
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId!,
          sender_id: user!.id,
          content: offerContent,
          message_type: 'offer',
          offer_data: {
            amount,
            currency: 'GHS',
            message: offerMessage.trim() || null,
            listing_id: conversation?.listing_id,
          },
        })
        .select('id')
        .single();

      if (messageError) throw messageError;

      // Create offer record
      const { error: offerError } = await dbHelpers.createOffer({
        listing_id: conversation?.listing_id!,
        conversation_id: conversationId!,
        message_id: message.id,
        buyer_id: user!.id,
        seller_id: otherUser?.id!,
        amount,
        currency: 'GHS',
        message: offerMessage.trim() || null,
      });

      if (offerError) throw offerError;

      setShowOfferModal(false);
      setOfferAmount('');
      setOfferMessage('');
      showSuccessToast('Offer sent successfully!');
    } catch (err) {
      showErrorToast('Failed to send offer');
    } finally {
      setSendingOffer(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      // Update offer status
      const { error } = await dbHelpers.updateOfferStatus(offerId, action === 'accept' ? 'accepted' : 'rejected');
      
      if (error) {
        throw new Error(error.message);
      }

      // Send system message
      const systemMessage = action === 'accept' 
        ? `✅ Offer accepted! The seller has accepted your offer.`
        : `❌ Offer declined. The seller has declined your offer.`;
      
      await sendMessage(systemMessage, 'system');
      
      showSuccessToast(action === 'accept' ? 'Offer accepted!' : 'Offer declined');
    } catch (err) {
      showErrorToast(`Failed to ${action} offer`);
    }
  };

  const handleCounterOffer = async () => {
    if (!offerAmount.trim()) {
      Alert.alert('Error', 'Please enter a counter offer amount');
      return;
    }

    const amount = Number(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setSendingOffer(true);
    try {
      // Create counter offer message
      const counterContent = `💰 Counter Offer: GHS ${(amount || 0).toLocaleString()}${offerMessage ? `\n\n"${offerMessage}"` : ''}`;
      
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId!,
          sender_id: user!.id,
          content: counterContent,
          message_type: 'offer',
          offer_data: {
            amount,
            currency: 'GHS',
            message: offerMessage.trim() || null,
            listing_id: conversation?.listing_id,
          },
        })
        .select('id')
        .single();

      if (messageError) throw messageError;

      // Create counter offer record
      const { error: offerError } = await dbHelpers.createOffer({
        listing_id: conversation?.listing_id!,
        conversation_id: conversationId!,
        message_id: message.id,
        buyer_id: otherUser?.id!,
        seller_id: user!.id,
        amount,
        currency: 'GHS',
        message: offerMessage.trim() || null,
      });

      if (offerError) throw offerError;

      setShowCounterModal(false);
      setOfferAmount('');
      setOfferMessage('');
      showSuccessToast('Counter offer sent!');
    } catch (err) {
      showErrorToast('Failed to send counter offer');
    } finally {
      setSendingOffer(false);
    }
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastVariant('success');
    setShowToast(true);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastVariant('error');
    setShowToast(true);
  };

  if (loading) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Loading..."
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={{ flex: 1, padding: theme.spacing.lg }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingSkeleton
              key={index}
              width="80%"
              height={60}
              borderRadius={theme.borderRadius.lg}
              style={{ 
                marginBottom: theme.spacing.md,
                alignSelf: index % 2 === 0 ? 'flex-start' : 'flex-end',
              }}
            />
          ))}
        </View>
      </SafeAreaWrapper>
    );
  }

  if (error) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Chat"
          showBackButton
          onBackPress={() => router.back()}
        />
        <ErrorState
          message={error}
          onRetry={() => {}}
        />
      </SafeAreaWrapper>
    );
  }

  const getLastSeenText = () => {
    if (!otherUser?.last_seen) return '';
    
    if (otherUser.is_online) {
      return 'Online now';
    }
    
    const lastSeen = new Date(otherUser.last_seen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return lastSeen.toLocaleDateString();
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Chat'}
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          otherUser?.phone && (
            <Button
              key="call-user"
              variant="icon"
              icon={<Phone size={20} color={theme.colors.text.primary} />}
              onPress={() => {
                Alert.alert(
                  'Call User',
                  `Call ${otherUser.first_name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Call', onPress: () => Linking.openURL(`tel:${otherUser.phone}`) },
                  ]
                );
              }}
            />
          ),
          <Button
            key="more-options"
            variant="icon"
            icon={<MoreVertical size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              Alert.alert('Coming Soon', 'More options will be available soon');
            }}
          />,
        ].filter(Boolean)}
      />

      {/* Listing Context Banner */}
      {conversation?.listings && (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/home/${conversation.listings.id}`)}
          style={{
            backgroundColor: theme.colors.primary + '10',
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.primary + '20',
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.sm,
                padding: theme.spacing.sm,
              }}
            >
              <Eye size={16} color={theme.colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.primary }}>
                💼 About: {conversation.listings.title}
              </Text>
              <PriceDisplay
                amount={conversation.listings.price}
                size="sm"
                style={{ marginTop: theme.spacing.xs }}
              />
            </View>
            <Text variant="caption" style={{ color: theme.colors.primary }}>
              View Listing →
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: theme.spacing.md }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <EmptyState
              title="Start the conversation"
              description={conversation?.listings 
                ? `Send a message about "${conversation.listings.title}"`
                : "Send a message to begin chatting"
              }
            />
          ) : (
            messages.map((message: any) => {
              const isOwn = message.sender_id === user?.id;
              const timestamp = new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              if (message.message_type === 'offer') {
                const offer = message.offers?.[0];
                if (offer) {
                  return (
                    <View key={message.id} style={{ paddingHorizontal: theme.spacing.lg }}>
                      <OfferCard
                        offer={{
                          id: offer.id,
                          amount: offer.amount,
                          currency: offer.currency,
                          originalPrice: conversation?.listings?.price,
                          status: offer.status,
                          timestamp,
                          expiresAt: offer.expires_at,
                          buyer: {
                            name: `${message.sender?.first_name} ${message.sender?.last_name}`,
                            avatar: message.sender?.avatar_url,
                            rating: message.sender?.rating,
                          },
                          message: offer.message,
                          isOwn,
                        }}
                        onAccept={() => handleOfferAction(offer.id, 'accept')}
                        onReject={() => handleOfferAction(offer.id, 'reject')}
                        onCounter={() => {
                          setShowCounterModal(true);
                          setOfferAmount('');
                          setOfferMessage('');
                        }}
                        onMessage={() => {}}
                        showActions={offer.status === 'pending'}
                      />
                    </View>
                  );
                }
              }

              if (message.message_type === 'system') {
                return (
                  <View key={message.id} style={{ alignItems: 'center', marginVertical: theme.spacing.md }}>
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceVariant,
                        paddingHorizontal: theme.spacing.lg,
                        paddingVertical: theme.spacing.sm,
                        borderRadius: theme.borderRadius.full,
                        maxWidth: '80%',
                      }}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: theme.colors.text.secondary,
                          textAlign: 'center',
                          fontWeight: '500',
                        }}
                      >
                        {message.content}
                      </Text>
                    </View>
                  </View>
                );
              }

              return (
                <ChatBubble
                  key={message.id}
                  message={message.content}
                  isOwn={isOwn}
                  timestamp={timestamp}
                  type={message.message_type}
                  status={message.status}
                  senderName={!isOwn ? `${message.sender?.first_name} ${message.sender?.last_name}` : undefined}
                />
              );
            })
          )}

          {/* Typing Indicator */}
          {typing && (
            <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.md }}>
              <View
                style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.md,
                  alignSelf: 'flex-start',
                  maxWidth: '80%',
                }}
              >
                <Text variant="bodySmall" color="muted" style={{ fontStyle: 'italic' }}>
                  {otherUser?.first_name} is typing...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Message Input */}
        <MessageInput
          value={messageText}
          onChangeText={setMessageText}
          onSend={handleSendMessage}
          onCamera={() => {
            Alert.alert('Coming Soon', 'Camera feature will be available soon');
          }}
          onImagePicker={() => Alert.alert('Coming Soon', 'Image sharing feature will be available soon')}
          placeholder={conversation?.listings 
            ? `Message about ${conversation.listings.title}...`
            : "Type a message..."
          }
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        />

        {/* Quick Actions */}
        {conversation?.listings && (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <Button
                variant="secondary"
                icon={<DollarSign size={18} color={theme.colors.primary} />}
                onPress={() => setShowOfferModal(true)}
                style={{ flex: 1 }}
                size="sm"
              >
                Make Offer
              </Button>
              
              <Button
                variant="tertiary"
                onPress={() => router.push(`/(tabs)/home/${conversation.listings.id}`)}
                style={{ flex: 1 }}
                size="sm"
              >
                View Listing
              </Button>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Make Offer Modal */}
      <AppModal
        visible={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        title="Make an Offer"
        primaryAction={{
          text: 'Send Offer',
          onPress: handleSendOffer,
          loading: sendingOffer,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowOfferModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          {conversation?.listings && (
            <View
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
              }}
            >
              <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.sm }}>
                Making offer for:
              </Text>
              <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
                {conversation.listings.title}
              </Text>
              <PriceDisplay
                amount={conversation.listings.price}
                size="md"
              />
            </View>
          )}

          <Input
            label="Your Offer (GHS)"
            placeholder="Enter your offer amount"
            value={offerAmount}
            onChangeText={setOfferAmount}
            keyboardType="numeric"
            helper={conversation?.listings 
              ? `Current price: GHS ${(conversation.listings.price || 0).toLocaleString()}`
              : undefined
            }
          />

          <Input
            variant="multiline"
            label="Message (Optional)"
            placeholder="Add a message with your offer..."
            value={offerMessage}
            onChangeText={setOfferMessage}
            helper="Explain why this is a fair offer"
          />
        </View>
      </AppModal>

      {/* Counter Offer Modal */}
      <AppModal
        visible={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        title="Make Counter Offer"
        primaryAction={{
          text: 'Send Counter Offer',
          onPress: handleCounterOffer,
          loading: sendingOffer,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setShowCounterModal(false),
        }}
      >
        <View style={{ gap: theme.spacing.lg }}>
          <View
            style={{
              backgroundColor: theme.colors.warning + '10',
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.warning + '30',
            }}
          >
            <Text variant="bodySmall" style={{ 
              color: theme.colors.warning,
              textAlign: 'center',
              fontWeight: '500',
            }}>
              💡 Making a counter offer will replace the previous offer
            </Text>
          </View>

          <Input
            label="Counter Offer Amount (GHS)"
            placeholder="Enter your counter offer amount"
            value={offerAmount}
            onChangeText={setOfferAmount}
            keyboardType="numeric"
          />

          <Input
            variant="multiline"
            label="Message (Optional)"
            placeholder="Explain your counter offer..."
            value={offerMessage}
            onChangeText={setOfferMessage}
          />
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