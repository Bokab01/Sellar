import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useMessages } from '@/hooks/useChat';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useAppResume } from '@/hooks/useAppResume';
import { getOfferLimitFromMessages, type OfferLimitResult } from '@/utils/offerLimits';
import { formatChatTimestamp, isDifferentDay } from '@/utils/dateUtils';
import { dbHelpers, supabase } from '@/lib/supabase';
import { acceptOfferById, rejectOfferById } from '@/lib/offerStateMachine';
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
  DateSeparator,
  ChatImagePicker,
  ChatMenu,
  ChatInlineMenu,
  TransactionCompletionButton,
  CallbackMessage,
} from '@/components';
import { Phone, Info, Eye, MessageCircle, EllipsisVertical } from 'lucide-react-native';

export default function ChatScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { draftMessages, setDraftMessage, clearDraftMessage, markAsRead } = useChatStore();
  
  const { messages, loading, error, sendMessage, markMessagesAsRead, refresh: refreshMessages } = useMessages(conversationId!);
  
  // App resume handling - refresh messages when app comes back from background
  const { isRefreshing, isReconnecting, error: resumeError } = useAppResume({
    onResume: async () => {
      console.log('📱 Chat screen: App resumed, refreshing messages...');
      await refreshMessages();
      // Also refresh conversation details to get latest user status
      await fetchConversationDetails();
    },
    debug: true,
  });
  
  const [messageText, setMessageText] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [lastSeenText, setLastSeenText] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Get conversation details
  const [conversation, setConversation] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [typing, setTyping] = useState(false);
  const [existingTransaction, setExistingTransaction] = useState<any>(null);

  useEffect(() => {
    if (conversationId) {
      fetchConversationDetails();
      markAsRead(conversationId); // Update local state (may be blocked if manually marked as unread)
      markMessagesAsRead(); // Update database (should always work)
      console.log('📱 Chat detail screen loaded for conversation:', conversationId);
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

  // Update last seen text
  useEffect(() => {
    if (otherUser) {
      setLastSeenText(getLastSeenText());
      
      // Update every minute for real-time updates
      const interval = setInterval(() => {
        setLastSeenText(getLastSeenText());
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [otherUser]);

  const fetchConversationDetails = async () => {
    try {
      const { data: conv, error } = await dbHelpers.getConversation(conversationId!, user!.id);
      if (error) {
        console.error('Failed to fetch conversation details:', error);
        return;
      }
      
      if (conv) {
        setConversation(conv);
        const otherParticipant = conv.participant_1_profile?.id === user!.id 
          ? conv.participant_2_profile 
          : conv.participant_1_profile;
        setOtherUser(otherParticipant);
        
        // Check for existing transaction
        await checkExistingTransaction(conv.listing?.id);
      }
    } catch (err) {
      console.error('Failed to fetch conversation details:', err);
    }
  };

  const checkExistingTransaction = async (listingId: string) => {
    if (!listingId || !user) return;
    
    try {
      const { data: transaction, error } = await supabase
        .from('meetup_transactions')
        .select('*')
        .eq('listing_id', listingId)
        .eq('conversation_id', conversationId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && transaction) {
        setExistingTransaction(transaction);
      }
    } catch (err) {
      console.error('Error checking existing transaction:', err);
    }
  };

  const handleTransactionCreated = (transactionId: string) => {
    console.log('Transaction created:', transactionId);
    // Refresh to get the new transaction
    checkExistingTransaction(conversation?.listing?.id);
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

  const handleSendImage = async (imageUrl: string) => {
    try {
      // Send image message with the image URL
      const { error } = await sendMessage('📷 Image', 'image', [imageUrl]);
      if (error) {
        showErrorToast('Failed to send image');
      }
    } catch (err) {
      showErrorToast('Failed to send image');
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

    // Check offer limits using the new system
    const offerLimitStatus = getOfferLimitFromMessages(messages, user?.id!);
    
    if (!offerLimitStatus.canMakeOffer) {
      Alert.alert(
        'Offer Limit Reached', 
        offerLimitStatus.reason || 'You cannot make more offers for this listing.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
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
      const offerData = {
        listing_id: conversation?.listing_id!,
        conversation_id: conversationId!,
        message_id: message.id,
        buyer_id: user!.id,
        seller_id: otherUser?.id!,
        amount,
        currency: 'GHS',
        message: offerMessage.trim() || null,
        status: 'pending',
      };
      
      console.log('🎯 Creating offer with data:', offerData);
      const { data: createdOffer, error: offerError } = await dbHelpers.createOffer(offerData);
      console.log('🎯 Offer creation result:', { createdOffer, offerError });

      if (offerError) throw offerError;

      setShowOfferModal(false);
      setOfferAmount('');
      setOfferMessage('');
      
      // Refresh messages to show the new offer
      setTimeout(() => {
        refreshMessages();
      }, 500);
      
      showSuccessToast('Offer sent successfully!');
    } catch (err) {
      showErrorToast('Failed to send offer');
    } finally {
      setSendingOffer(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      console.log('🎯 Handling offer action:', { offerId, action, userId: user?.id, userType: typeof user?.id });
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Use direct Supabase query instead of the helper function
      console.log('🎯 Using direct Supabase query to update offer:', { offerId, action });
      
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      
      // First, check if the offer exists
      console.log('🎯 Checking if offer exists...');
      const { data: existingOffer, error: checkError } = await supabase
        .from('offers')
        .select('id, status, buyer_id, seller_id')
        .eq('id', offerId)
        .single();
      
      console.log('🎯 Offer check result:', { existingOffer, checkError });
      
      if (checkError || !existingOffer) {
        throw new Error(`Offer not found: ${checkError?.message || 'Offer does not exist'}`);
      }
      
      // Check user permissions
      console.log('🎯 Checking user permissions:', {
        currentUserId: user.id,
        offerBuyerId: existingOffer.buyer_id,
        offerSellerId: existingOffer.seller_id,
        isBuyer: user.id === existingOffer.buyer_id,
        isSeller: user.id === existingOffer.seller_id,
        canUpdate: user.id === existingOffer.buyer_id || user.id === existingOffer.seller_id
      });
      
      if (user.id !== existingOffer.buyer_id && user.id !== existingOffer.seller_id) {
        throw new Error('You do not have permission to update this offer. Only the buyer or seller can update it.');
      }
      
      console.log('🎯 Found offer, proceeding with update...');
      
      // Direct update using Supabase client
      const { data, error } = await supabase
        .from('offers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId)
        .select();
      
      console.log('🎯 Direct update result:', { data, error });
      
      if (error) {
        console.error('🎯 Direct update error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        console.error('🎯 No rows updated:', { offerId, newStatus });
        throw new Error('No offer was updated. The offer may not exist or you may not have permission to update it.');
      }
      
      console.log('🎯 Successfully updated offer:', data[0]);

      // If offer was accepted, handle the acceptance flow
      if (action === 'accept') {
        await handleOfferAcceptance(offerId, data[0]);
      }

      // Refresh messages to show updated offer status
      setTimeout(() => {
        refreshMessages();
      }, 500); // Small delay to ensure database update is complete

      // Determine the correct message based on user role
      // We need to check the offer data to see who is the seller vs buyer
      const systemMessage = action === 'accept' 
        ? `✅ Offer accepted! The listing has been reserved for you. Please complete the transaction within 48 hours.`
        : `❌ Offer declined. The offer has been declined.`;
      
      await sendMessage(systemMessage, 'system');
      
      showSuccessToast(action === 'accept' ? 'Offer accepted!' : 'Offer declined');
      
    } catch (err) {
      console.error('🎯 Error in handleOfferAction:', err);
      showErrorToast(`Failed to ${action} offer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleOfferAcceptance = async (offerId: string, acceptedOffer: any) => {
    try {
      console.log('🎯 Handling offer acceptance:', { offerId, acceptedOffer });

      // 1. Update listing status to 'reserved'
      if (conversation?.listing_id) {
        console.log('🎯 Updating listing status to reserved:', conversation.listing_id);
        const { error: listingError } = await supabase
          .from('listings')
          .update({ 
            status: 'reserved',
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.listing_id);

        if (listingError) {
          console.error('🎯 Error updating listing status:', listingError);
        } else {
          console.log('🎯 Successfully updated listing status to reserved');
        }
      }

      // 2. Reject all other pending offers for this listing
      console.log('🎯 Rejecting other pending offers for this listing');
      const { error: rejectError } = await supabase
        .from('offers')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('listing_id', conversation?.listing_id)
        .eq('status', 'pending')
        .neq('id', offerId); // Don't reject the accepted offer

      if (rejectError) {
        console.error('🎯 Error rejecting other offers:', rejectError);
      } else {
        console.log('🎯 Successfully rejected other pending offers');
      }

      // 3. Create a transaction record (if you have a transactions table)
      // This would link the buyer, seller, listing, and offer
      console.log('🎯 Offer acceptance flow completed successfully');

    } catch (err) {
      console.error('🎯 Error in handleOfferAcceptance:', err);
      // Don't throw error here - the offer was still accepted
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

    // Check offer limits using the new system
    const offerLimitStatus = getOfferLimitFromMessages(messages, user?.id!);
    
    if (!offerLimitStatus.canMakeOffer) {
      Alert.alert(
        'Offer Limit Reached', 
        offerLimitStatus.reason || 'You cannot make more offers for this listing.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }

    setSendingOffer(true);
    try {
      // Create counter offer message
      const counterContent = `💰 Counter Offer: GHS ${(amount || 0).toLocaleString()}${offerMessage ? `\n\n"${offerMessage}"` : ''}`;
      
      console.log('🎯 Creating counter offer message...');
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
        .select('id');

      console.log('🎯 Message creation result:', { message, messageError });

      if (messageError) {
        console.error('🎯 Message creation error:', messageError);
        throw new Error(`Failed to create message: ${messageError.message}`);
      }

      if (!message || message.length === 0) {
        throw new Error('Failed to create message: No data returned');
      }

      const messageId = message[0].id;

      // Create counter offer record using direct Supabase query
      // For counter offers, the current user becomes the buyer (making the offer)
      // and the other user becomes the seller (receiving the offer)
      console.log('🎯 Creating counter offer with data:', {
        listing_id: conversation?.listing_id!,
        conversation_id: conversationId!,
        message_id: messageId,
        buyer_id: user!.id, // Current user is the buyer (making the counter offer)
        seller_id: otherUser?.id!, // Other user is the seller (receiving the counter offer)
        parent_offer_id: counteringOfferId, // Link to the original offer
        amount,
        currency: 'GHS',
        message: offerMessage.trim() || null,
        status: 'pending',
      });

      const { data: counterOffer, error: offerError } = await supabase
        .from('offers')
        .insert({
          listing_id: conversation?.listing_id!,
          conversation_id: conversationId!,
          message_id: messageId,
          buyer_id: user!.id, // Current user is the buyer
          seller_id: otherUser?.id!, // Other user is the seller
          parent_offer_id: counteringOfferId, // Link to the original offer
          amount,
          currency: 'GHS',
          message: offerMessage.trim() || null,
          status: 'pending',
        })
        .select();

      console.log('🎯 Counter offer creation result:', { counterOffer, offerError });

      if (offerError) {
        console.error('🎯 Counter offer creation error:', offerError);
        throw new Error(`Failed to create counter offer: ${offerError.message}`);
      }

      if (!counterOffer || counterOffer.length === 0) {
        throw new Error('Failed to create counter offer: No data returned');
      }

      // Update the original offer's status to "countered"
      if (counteringOfferId) {
        console.log('🎯 Updating original offer status to countered:', counteringOfferId);
        const { error: updateOriginalError } = await supabase
          .from('offers')
          .update({ 
            status: 'countered',
            updated_at: new Date().toISOString()
          })
          .eq('id', counteringOfferId);

        if (updateOriginalError) {
          console.error('🎯 Error updating original offer:', updateOriginalError);
          // Don't throw error here, just log it - the counter offer was still created
        } else {
          console.log('🎯 Successfully updated original offer status to countered');
        }
      }

      setShowCounterModal(false);
      setOfferAmount('');
      setOfferMessage('');
      setCounteringOfferId(null);
      showSuccessToast('Counter offer sent!');
      
      // Refresh messages to show updated offer statuses
      setTimeout(() => {
        refreshMessages();
      }, 500);
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

  const truncateText = (text: string, maxLength: number = 30) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getLastSeenText = () => {
    if (!otherUser?.last_seen) return 'Last seen unknown';
    
    if (otherUser.is_online) {
      return 'Online now';
    }
    
    const lastSeen = new Date(otherUser.last_seen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    // Handle edge cases
    if (diffMs < 0) return 'Just now'; // Future time (clock sync issues)
    
    // Recent activity
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    // Hours
    if (diffHours < 24) {
      if (diffHours === 1) return 'Last seen 1 hour ago';
      return `Last seen ${diffHours} hours ago`;
    }
    
    // Days
    if (diffDays < 7) {
      if (diffDays === 1) return 'Last seen yesterday';
      return `Last seen ${diffDays} days ago`;
    }
    
    // Weeks
    if (diffWeeks < 4) {
      if (diffWeeks === 1) return 'Last seen 1 week ago';
      return `Last seen ${diffWeeks} weeks ago`;
    }
    
    // Months
    if (diffMonths < 12) {
      if (diffMonths === 1) return 'Last seen 1 month ago';
      return `Last seen ${diffMonths} months ago`;
    }
    
    // Years
    const diffYears = Math.floor(diffMonths / 12);
    if (diffYears === 1) return 'Last seen 1 year ago';
    return `Last seen ${diffYears} years ago`;
  };

  return (
    <SafeAreaWrapper>
      <AppHeader
        title={otherUser ? `${otherUser.first_name || 'User'} ${otherUser.last_name || ''}`.trim() : 'Chat'}
        subtitle={otherUser ? lastSeenText : ''}
        showBackButton
        onBackPress={() => router.back()}
        leftAction={
          otherUser ? (
            <Avatar
              name={`${otherUser.first_name || 'User'} ${otherUser.last_name || ''}`.trim()}
              source={otherUser.avatar_url}
              size="sm"
              style={{ marginLeft: theme.spacing.sm }}
            />
          ) : undefined
        }
        rightActions={[
          otherUser?.phone && (
            <Button
              key="call-user"
              variant="icon"
              icon={<Phone size={20} color={theme.colors.text.primary} />}
              onPress={() => {
                Alert.alert(
                  'Call User',
                  `Call ${otherUser.first_name || 'User'}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Call', onPress: () => Linking.openURL(`tel:${otherUser.phone}`) },
                  ]
                );
              }}
            />
          ),
          <ChatInlineMenu
            key="chat-inline-menu"
            conversationId={conversationId!}
            otherUser={otherUser}
            conversation={conversation}
            onBlock={() => console.log('Block user')}
            onReport={() => console.log('Report user')}
            onDelete={() => console.log('Delete conversation')}
            onArchive={() => console.log('Archive conversation')}
            onMute={() => console.log('Mute conversation')}
            onUnmute={() => console.log('Unmute conversation')}
          />,
        ].filter(Boolean)}
      />

      {/* Listing Context Banner */}
      {conversation?.listing?.title && conversation?.listing?.id && (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/home/${conversation.listing.id}`)}
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
            {/* Listing Image */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.borderRadius.sm,
                overflow: 'hidden',
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              {conversation.listing.images && conversation.listing.images.length > 0 ? (
                <Image
                  source={{ uri: conversation.listing.images[0] }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: theme.colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Eye size={16} color={theme.colors.primaryForeground} />
                </View>
              )}
            </View>
            
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.primary }}>
                💼 About: {conversation.listing.title}
              </Text>
              {conversation.listing.price && (
                <PriceDisplay
                  amount={conversation.listing.price}
                  size="sm"
                  style={{ marginTop: theme.spacing.xs }}
                />
              )}
            </View>
            <Text variant="caption" style={{ color: theme.colors.primary }}>
              View Listing →
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* General Conversation Banner (when no listing) */}
      {!conversation?.listing?.title && (
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                backgroundColor: theme.colors.text.muted,
                borderRadius: theme.borderRadius.sm,
                padding: theme.spacing.sm,
              }}
            >
              <MessageCircle size={16} color={theme.colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                💬 General Conversation
              </Text>
              <Text variant="caption" style={{ color: theme.colors.text.muted, marginTop: theme.spacing.xs }}>
                Chat with {otherUser?.first_name ? otherUser.first_name : 'User'}
              </Text>
            </View>
          </View>
        </View>
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
              description={conversation?.listing?.title 
                ? `Send a message about "${conversation.listing.title}"`
                : "Send a message to begin chatting"
              }
            />
          ) : (
            messages.map((message: any, index: number) => {
              const isOwn = message.sender_id === user?.id;
              const messageDate = new Date(message.created_at);
              const timestamp = formatChatTimestamp(messageDate);
              
              // Check if we need a date separator
              const showDateSeparator = index === 0 || 
                (index > 0 && isDifferentDay(message.created_at, messages[index - 1].created_at));
              
              const elements = [];
              
              // Add date separator if needed
              if (showDateSeparator) {
                elements.push(
                  <DateSeparator
                    key={`date-${message.id}`}
                    date={messageDate}
                  />
                );
              }
              
              // Ensure message content is safe
              const safeMessageContent = String(message.content || '');

              if (message.message_type === 'offer') {
                const offer = message.offers?.[0];
                console.log('🎯 Offer data:', { offer, messageId: message.id, messageType: message.message_type, offersArray: message.offers });
                
                // If offer is undefined, try to fetch it manually
                if (!offer && message.offers && message.offers.length === 0) {
                  console.log('🎯 No offer found for message, this might be an old offer message without proper offer data');
                  // For now, render as a regular message if no offer data is available
                  elements.push(
                    <ChatBubble
                      key={message.id}
                      message={safeMessageContent}
                      isOwn={isOwn}
                      timestamp={timestamp}
                      type={message.message_type}
                      status={message.status}
                      senderName={!isOwn ? `${message.sender?.first_name || 'User'} ${message.sender?.last_name || ''}`.trim() : undefined}
                    />
                  );
                  return elements;
                }
                
                if (offer) {
                  elements.push(
                    <View key={message.id} style={{ paddingHorizontal: theme.spacing.lg }}>
                      <OfferCard
                        offer={{
                          id: offer.id,
                          amount: offer.amount,
                          currency: offer.currency,
                          originalPrice: conversation?.listing?.price,
                          status: offer.status,
                          timestamp,
                          expiresAt: offer.expires_at,
                          buyer: {
                            name: `${message.sender?.first_name || 'User'} ${message.sender?.last_name || ''}`.trim(),
                            avatar: message.sender?.avatar_url,
                            rating: message.sender?.rating,
                          },
                          message: offer.message ? String(offer.message) : undefined,
                          isOwn,
                        }}
                        onAccept={() => {
                          console.log('🎯 Accept button clicked for offer:', { 
                            offerId: offer.id, 
                            offerType: typeof offer.id,
                            fullOffer: offer 
                          });
                          handleOfferAction(offer.id, 'accept');
                        }}
                        onReject={() => {
                          console.log('🎯 Reject button clicked for offer:', { 
                            offerId: offer.id, 
                            offerType: typeof offer.id,
                            fullOffer: offer 
                          });
                          handleOfferAction(offer.id, 'reject');
                        }}
                        onCounter={() => {
                          setCounteringOfferId(offer.id);
                          setShowCounterModal(true);
                          setOfferAmount('');
                          setOfferMessage('');
                        }}
                        onMessage={() => {}}
                        showActions={offer.status === 'pending'}
                      />
                    </View>
                  );
                  return elements;
                }
              }

              // Callback request message
              if (message.message_type === 'callback_request') {
                elements.push(
                  <CallbackMessage
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    senderName={!isOwn ? `${message.sender?.first_name || 'User'} ${message.sender?.last_name || ''}`.trim() : undefined}
                    senderPhone={message.sender?.phone}
                    timestamp={timestamp}
                  />
                );
                return elements;
              }

              if (message.message_type === 'system') {
                elements.push(
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
                        {safeMessageContent}
                      </Text>
                    </View>
                  </View>
                );
                return elements;
              }

              // Determine message status for read receipts
              let messageStatus = message.status || 'sent';
              
              // If it's our own message, check if the other user has read it
              if (isOwn) {
                if (message.read_at) {
                  messageStatus = 'read';
                } else if (message.delivered_at) {
                  messageStatus = 'delivered';
                } else {
                  messageStatus = 'sent';
                }
              }

              elements.push(
                <ChatBubble
                  key={message.id}
                  message={safeMessageContent}
                  isOwn={isOwn}
                  timestamp={timestamp}
                  type={message.message_type}
                  status={messageStatus}
                  senderName={!isOwn ? `${message.sender?.first_name || otherUser?.first_name || 'User'} ${message.sender?.last_name || otherUser?.last_name || ''}`.trim() : undefined}
                  images={message.message_type === 'image' && message.images ? 
                    (() => {
                      try {
                        return typeof message.images === 'string' ? JSON.parse(message.images) : message.images;
                      } catch (e) {
                        console.warn('Failed to parse message images:', e);
                        return undefined;
                      }
                    })()
                    : undefined}
                />
              );
              
              return elements;
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
                  {otherUser?.first_name ? `${otherUser.first_name} is typing...` : 'User is typing...'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Transaction Completion Button */}
        {conversation?.listing && otherUser && !existingTransaction && (
          <View style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <TransactionCompletionButton
              conversationId={conversationId!}
              otherUser={otherUser}
              listing={conversation.listing}
              existingTransaction={existingTransaction}
              onTransactionCreated={handleTransactionCreated}
            />
          </View>
        )}

        {/* Transaction Status Display */}
        {existingTransaction && (
          <View style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}>
            <TransactionCompletionButton
              conversationId={conversationId!}
              otherUser={otherUser}
              listing={conversation?.listing}
              existingTransaction={existingTransaction}
              onTransactionCreated={handleTransactionCreated}
            />
          </View>
        )}

        {/* Message Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, theme.spacing.md) : theme.spacing.md,
            gap: theme.spacing.sm,
          }}
        >
          {/* Image Picker */}
          <ChatImagePicker
            onImageSelected={handleSendImage}
            disabled={false}
          />

          {/* Message Input */}
          <MessageInput
            value={messageText}
            onChangeText={setMessageText}
            onSend={handleSendMessage}
            placeholder={conversation?.listing?.title 
              ? `Message about ${truncateText(String(conversation.listing.title))}...` 
              : "Type a message..."}
            style={{
              flex: 1,
              borderTopWidth: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
            }}
            conversationId={conversationId}
          />
        </View>

      </KeyboardAvoidingView>

      {/* Make Offer Modal */}
      <AppModal
        visible={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        title="Make an Offer"
        size="lg"
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
          {conversation?.listing?.title && (
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
                {conversation.listing.title}
              </Text>
              {conversation.listing.price && (
                <PriceDisplay
                  amount={conversation.listing.price}
                  size="md"
                />
              )}
            </View>
          )}

          <Input
            label="Your Offer (GHS)"
            placeholder="Enter your offer amount"
            value={offerAmount}
            onChangeText={setOfferAmount}
            keyboardType="numeric"
            helper={conversation?.listing?.price 
              ? `Current price: GHS ${(conversation.listing.price || 0).toLocaleString()}`
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
        size="lg"
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