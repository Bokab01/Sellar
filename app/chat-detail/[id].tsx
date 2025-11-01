import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Platform, Alert, TouchableOpacity, Linking, Image, Keyboard, TouchableWithoutFeedback, Animated, ScrollView, FlatList } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
import { Phone, Info, Eye, MessageCircle, EllipsisVertical, Handshake } from 'lucide-react-native';
import { getDisplayName } from '@/hooks/useDisplayName';
import { UserDisplayName } from '@/components/UserDisplayName/UserDisplayName';
import { ExtraSmallUserBadges } from '@/components/UserBadgeSystem';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from '@/components/TypingIndicator';

export default function ChatScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { draftMessages, setDraftMessage, clearDraftMessage, markAsRead, setActiveConversationId, typingUsers } = useChatStore();
  
  const { messages, loading, error, sendMessage, markMessagesAsRead, refresh: refreshMessages } = useMessages(conversationId!);
  
  // App resume handling - refresh messages when app comes back from background
  const { isRefreshing, isReconnecting, error: resumeError } = useAppResume({
    onResume: async () => {
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [moderationError, setModerationError] = useState('');
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputContainerTranslateY = useRef(new Animated.Value(0)).current;
  const previousMessageCountRef = useRef(messages.length);
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Get conversation details
  const [conversation, setConversation] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [typing, setTyping] = useState(false);
  const [existingTransaction, setExistingTransaction] = useState<any>(null);
  const [conversationDeleted, setConversationDeleted] = useState(false);
  
  // Typing indicator
  const { onTyping, onStopTyping } = useTypingIndicator(conversationId!, otherUser?.id);
  
  // Debug typing users state
  useEffect(() => {
    if (conversationId) {
      console.log('💬 Typing users for conversation:', conversationId, ':', typingUsers[conversationId]);
    }
  }, [typingUsers, conversationId]);

  // Transform messages for FlatList with date separators
  const transformedMessages = useMemo(() => {
    console.log(`🎨 Transforming ${messages?.length || 0} messages for rendering`);
    
    if (!messages || messages.length === 0) {
      console.log(`🎨 No messages to transform`);
      return [];
    }
    
    const items: any[] = [];
    
    messages.forEach((message: any, index: number) => {
      const messageDate = new Date(message.created_at);
      const showDateSeparator = index === 0 || 
        (index > 0 && isDifferentDay(message.created_at, messages[index - 1].created_at));
      
      // Add date separator if needed
      if (showDateSeparator) {
        items.push({
          id: `date-${message.id}`,
          type: 'date-separator',
          date: messageDate,
        });
      }
      
      // Add the message
      items.push({
        id: message.id,
        type: 'message',
        data: message,
      });
    });
    
    console.log(`🎨 Transformed into ${items.length} items (messages + separators)`);
    
    return items;
  }, [messages]);

  // Debug: Track messages array changes and force re-render
  useEffect(() => {
    console.log(`🔍 Messages array changed. New count: ${messages?.length || 0}`);
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log(`🔍 Last message:`, {
        id: lastMessage.id,
        content: lastMessage.content?.substring(0, 50),
        sender: lastMessage.sender_id,
        created: lastMessage.created_at,
      });
    }
    // Force re-render when messages change
    setRenderKey(prev => {
      const newKey = prev + 1;
      console.log(`🔄 Force re-render triggered, new key: ${newKey}`);
      return newKey;
    });
  }, [messages]);

  // Bounce animation for new messages indicator
  useEffect(() => {
    if (hasNewMessages) {
      // Start bouncing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation and reset
      bounceAnim.setValue(0);
    }
  }, [hasNewMessages, bounceAnim]);

  // Smart scroll behavior - only auto-scroll if user is at bottom
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      // New messages arrived - check if user is at bottom
      const distanceFromBottom = contentHeightRef.current - scrollYRef.current - layoutHeightRef.current;
      // Increase threshold to 200px to be more conservative
      const isAtBottom = distanceFromBottom < 200;
      
      console.log('📩 New message arrived:', {
        isAtBottom,
        distanceFromBottom: Math.round(distanceFromBottom),
        isUserScrolledState: isUserScrolled,
        scrollY: Math.round(scrollYRef.current),
        contentHeight: Math.round(contentHeightRef.current),
        layoutHeight: Math.round(layoutHeightRef.current)
      });
      
      if (!isAtBottom && distanceFromBottom > 200) {
        // User is scrolled up significantly, show indicator instead of auto-scrolling
        console.log('📩 ✋ PREVENTING AUTO-SCROLL - User is scrolled up - showing indicator only');
        setHasNewMessages(true);
        setIsUserScrolled(true); // Ensure state is updated
        // DO NOT SCROLL - just show indicator
        return; // Exit early to prevent any scroll
      } else {
        // User is at bottom, auto-scroll
        console.log('📩 ✅ ALLOWING AUTO-SCROLL - User at bottom');
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd(true);
        }, 100);
      }
    }
    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd(true);
    setHasNewMessages(false);
    setIsUserScrolled(false);
  };

  // Handle scroll event to detect user scroll position
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    scrollYRef.current = contentOffset.y;
    contentHeightRef.current = contentSize.height;
    layoutHeightRef.current = layoutMeasurement.height;
    
    // Check if user is near bottom (within 150px threshold for better UX)
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const isAtBottom = distanceFromBottom < 150;
    
    const wasScrolled = isUserScrolled;
    const newScrollState = !isAtBottom;
    
    // Only update state if it changed to avoid unnecessary re-renders
    if (wasScrolled !== newScrollState) {
      console.log('📜 Scroll state changed:', { 
        wasScrolled, 
        newScrollState, 
        distanceFromBottom: Math.round(distanceFromBottom),
        scrollY: Math.round(contentOffset.y),
        contentHeight: Math.round(contentSize.height)
      });
      setIsUserScrolled(newScrollState);
    }
    
    // If user scrolls to bottom, clear new messages indicator
    if (isAtBottom && hasNewMessages) {
      console.log('📜 User scrolled to bottom - clearing new messages indicator');
      setHasNewMessages(false);
    }
  };

  useEffect(() => {
    if (conversationId && !conversationDeleted) {
      fetchConversationDetails();
      markAsRead(conversationId); // Update local state (may be blocked if manually marked as unread)
      markMessagesAsRead(); // Update database (should always work)
      
      // Set active conversation to prevent notifications while user is viewing this chat
      setActiveConversation(conversationId);
      
      // Initial scroll to bottom after a short delay to ensure content is loaded
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd(false); // Instant scroll on first load
        setIsUserScrolled(false); // Mark as not scrolled initially
      }, 500);
    }
    
    // Cleanup: Clear active conversation when leaving this screen
    return () => {
      if (conversationId) {
        clearActiveConversation();
      }
    };
  }, [conversationId, conversationDeleted]);
  
  // Function to set active conversation on device token
  const setActiveConversation = async (convId: string) => {
    if (!user) return;
    
    // Update the store immediately for in-app notification suppression
    setActiveConversationId(convId);
    
    try {
      await supabase
        .from('device_tokens')
        .update({ active_conversation_id: convId })
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      console.log('🔕 Set active conversation to prevent notifications:', convId);
    } catch (error) {
      console.warn('Failed to set active conversation:', error);
    }
  };
  
  // Function to clear active conversation
  const clearActiveConversation = async () => {
    if (!user) return;
    
    // Clear the store immediately for in-app notification re-enabling
    setActiveConversationId(null);
    
    try {
      await supabase
        .from('device_tokens')
        .update({ active_conversation_id: null })
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      console.log('🔔 Cleared active conversation, notifications enabled');
    } catch (error) {
      console.warn('Failed to clear active conversation:', error);
    }
  };

  // Realtime subscription for other user's profile updates (last_seen, is_online)
  useEffect(() => {
    if (!otherUser?.id) return;

    console.log('🟢 Setting up real-time subscription for other user profile:', otherUser.id);
    
    const profileChannel = supabase
      .channel(`profile-${otherUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherUser.id}`,
        },
        (payload) => {
          console.log('🟢 Other user profile updated:', {
            is_online: payload.new.is_online,
            last_seen: payload.new.last_seen,
          });
          
          // Update otherUser state with new profile data
          setOtherUser((prev: any) => ({
            ...prev,
            is_online: payload.new.is_online,
            last_seen: payload.new.last_seen,
          }));
        }
      )
      .subscribe((status) => {
        console.log('🟢 Profile subscription status:', status);
      });

    return () => {
      console.log('🟢 Cleaning up profile subscription');
      supabase.removeChannel(profileChannel);
    };
  }, [otherUser?.id]);

  // Realtime subscription for transaction updates
  useEffect(() => {
    if (!conversationId || !user?.id || !conversation?.listing_id) return;

    
    const channel = supabase
      .channel(`transaction-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetup_transactions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          
          // Refresh transaction data
          if (conversation?.listing_id) {
            checkExistingTransaction(conversation.listing_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, conversation?.listing_id]);

  // Keyboard event listeners for smooth animation
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardVisible(true);
        
        // Animate input container up by keyboard height
        Animated.timing(inputContainerTranslateY, {
          toValue: -keyboardHeight,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        
        // Animate input container back to original position
        Animated.timing(inputContainerTranslateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  useEffect(() => {
    // Load draft message only when conversation changes, not when draftMessages changes
    if (conversationId) {
      const draft = draftMessages[conversationId] || '';
      setMessageText(draft);
    }
  }, [conversationId]); // Removed draftMessages from dependencies to prevent conflicts

  useEffect(() => {
    // Save draft message with debouncing to prevent excessive updates
    if (conversationId && messageText !== draftMessages[conversationId]) {
      const timeoutId = setTimeout(() => {
        // Only save if the current messageText hasn't changed during the debounce period
        setDraftMessage(conversationId, messageText);
      }, 500); // Increased debounce to 500ms to reduce conflicts
      
      return () => clearTimeout(timeoutId);
    }
  }, [messageText, conversationId, setDraftMessage]); // Removed draftMessages from dependencies to prevent loops

  // NOTE: Removed old auto-scroll effect here - now handled by smart scroll logic above

  // Update last seen text
  useEffect(() => {
    if (otherUser) {
      const updateLastSeenText = () => {
        const newLastSeenText = getLastSeenText();
        setLastSeenText(prev => {
          // Only update if the text actually changed to prevent unnecessary re-renders
          return prev !== newLastSeenText ? newLastSeenText : prev;
        });
      };
      
      // Initial update
      updateLastSeenText();
      
      // Update every minute for real-time updates
      const interval = setInterval(updateLastSeenText, 60000);
      
      return () => clearInterval(interval);
    }
  }, [otherUser?.id, otherUser?.last_seen, otherUser?.is_online]); // Only depend on specific properties

  // Keyboard visibility listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      // Only scroll if user is near bottom (respect scroll state)
      const distanceFromBottom = contentHeightRef.current - scrollYRef.current - layoutHeightRef.current;
      if (distanceFromBottom < 200) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd(true);
        }, 100);
      }
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      // Only scroll if user is near bottom (respect scroll state)
      const distanceFromBottom = contentHeightRef.current - scrollYRef.current - layoutHeightRef.current;
      if (distanceFromBottom < 200) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd(true);
        }, 100);
      }
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const checkExistingTransaction = useCallback(async (listingId: string) => {
    if (!listingId || !user) return;
    
    try {
      const { data: transaction, error } = await supabase
        .from('meetup_transactions')
        .select(`
          *,
          reviews:reviews(
            id,
            reviewer_id,
            reviewed_user_id,
            rating,
            comment,
            status,
            created_at
          )
        `)
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
  }, [conversationId, user?.id]);

  const fetchConversationDetails = useCallback(async () => {
    try {
      const { data: conv, error } = await dbHelpers.getConversation(conversationId!, user!.id);
      
      // Handle deleted/removed conversations
      if (error) {
        // Check if it's a "no rows" error (conversation deleted)
        if ((error as any).message?.includes('0 rows') || (error as any).code === 'PGRST116') {
          setConversationDeleted(true); // Prevent further queries
          Alert.alert(
            'Conversation Unavailable',
            'This conversation has been removed or is no longer available.',
            [
              {
                text: 'OK',
                onPress: () => router.back()
              }
            ],
            { cancelable: false } // Prevent dismissing without action
          );
        } else {
          // Only log error if it's not the expected "conversation deleted" error
          console.error('Failed to fetch conversation details:', error);
        }
        return;
      }
      
      if (conv) {
        setConversation(conv);
        const otherParticipant = conv.participant_1_profile?.id === user!.id 
          ? conv.participant_2_profile 
          : conv.participant_1_profile;
        
        console.log('👤 Other user profile data:', {
          id: otherParticipant?.id,
          name: `${otherParticipant?.first_name} ${otherParticipant?.last_name}`,
          is_online: otherParticipant?.is_online,
          last_seen: otherParticipant?.last_seen,
          hasIsOnlineField: 'is_online' in (otherParticipant || {}),
          hasLastSeenField: 'last_seen' in (otherParticipant || {}),
        });
        
        // ✅ Check if other user has active Sellar Pro subscription
        if (otherParticipant?.id) {
          const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('status, current_period_end, plan_id, subscription_plans(name)')
            .eq('user_id', otherParticipant.id)
            .in('status', ['active', 'trialing', 'cancelled'])
            .single();

          const isSellarPro = subscription && 
            (subscription as any).subscription_plans?.name === 'Sellar Pro' &&
            (subscription.current_period_end ? new Date(subscription.current_period_end) > new Date() : true);

          setOtherUser({ ...otherParticipant, is_sellar_pro: isSellarPro });
        } else {
          setOtherUser(otherParticipant);
        }
        
        // Check for existing transaction
        await checkExistingTransaction(conv.listing?.id);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversation details:', err);
      
      // Handle unexpected errors
      setConversationDeleted(true); // Prevent further queries
      Alert.alert(
        'Error Loading Conversation',
        'Unable to load conversation details. Please try again.',
        [
          {
            text: 'Go Back',
            onPress: () => router.back()
          },
          {
            text: 'Retry',
            onPress: () => {
              setConversationDeleted(false);
              fetchConversationDetails();
            }
          }
        ]
      );
    }
  }, [conversationId, user?.id, checkExistingTransaction]);

  const handleTransactionCreated = (transactionId: string) => {
    // Refresh to get the new transaction
    checkExistingTransaction(conversation?.listing?.id);
  };


  const handleTransactionUpdated = () => {
    // Refresh to get the updated transaction
    checkExistingTransaction(conversation?.listing?.id);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const content = messageText.trim();
    setMessageText('');
    clearDraftMessage(conversationId!);
    onStopTyping(); // Stop typing indicator when sending

    const { error } = await sendMessage(content);
    if (error) {
      // Show modal for moderation errors, toast for other errors
      if (error.includes('cannot be sent:') || error.includes('detected')) {
        setModerationError(error);
        setShowModerationModal(true);
      } else {
        showErrorToast('Failed to send message');
      }
      setMessageText(content); // Restore message on error
    } else {
      // Always scroll to bottom after sending
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const handleSendImage = async (imageUrl: string) => {
    try {
      // Send image message with the image URL
      const { error } = await sendMessage('📷 Image', 'image', [imageUrl]);
      if (error) {
        showErrorToast('Failed to send image');
      } else {
        // Always scroll to bottom after sending
        setTimeout(() => scrollToBottom(), 100);
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
      
      const { data: createdOffer, error: offerError } = await dbHelpers.createOffer(offerData);

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
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (action === 'accept') {
        // Use new accept_offer_v2 RPC for unified offer + deposit system
        const { data, error } = await supabase.rpc('accept_offer_v2', {
          p_offer_id: offerId,
          p_seller_id: user.id,
          p_acceptance_message: null,
        });

        if (error) {
          console.error('🎯 Accept offer error:', error);
          throw new Error(error.message || 'Failed to accept offer');
        }

        // Check if deposit is required (Pro seller with requires_deposit = true)
        if (data.requires_deposit) {
          // Send system message about deposit requirement
          await sendMessage(
            `✅ Offer accepted! The buyer must pay a ₵20 Sellar Secure deposit within 24 hours to reserve this item.`,
            'system'
          );
          showSuccessToast('Offer accepted! Buyer will be notified to pay deposit.');
        } else {
          // Regular seller - no deposit required, listing stays active
          await sendMessage(
            `✅ Offer accepted! Please coordinate to complete the transaction.`,
            'system'
          );
          showSuccessToast('Offer accepted!');
        }

        // Refresh messages
        setTimeout(() => {
          refreshMessages();
        }, 500);

      } else {
        // Reject offer
        const { error } = await supabase
          .from('offers')
          .update({ 
            status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('id', offerId)
          .select();
        
        if (error) {
          throw new Error(`Failed to reject offer: ${error.message}`);
        }

        await sendMessage(`❌ Offer declined.`, 'system');
        showSuccessToast('Offer declined');

        // Refresh messages
        setTimeout(() => {
          refreshMessages();
        }, 500);
      }
      
    } catch (err) {
      console.error('🎯 Error in handleOfferAction:', err);
      showErrorToast(`Failed to ${action} offer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleOfferAcceptance = async (offerId: string, acceptedOffer: any) => {
    try {

      if (!conversation?.listing_id) {
        console.error('🎯 No listing_id found in conversation');
        return;
      }

      // Get listing details to check quantity
      const { data: listing, error: listingFetchError } = await supabase
        .from('listings')
        .select('quantity, quantity_reserved')
        .eq('id', conversation.listing_id)
        .single();

      if (listingFetchError || !listing) {
        console.error('🎯 Error fetching listing:', listingFetchError);
        return;
      }


      // Determine quantity being purchased (default to 1 if not specified in offer)
      const quantityToPurchase = acceptedOffer.quantity || 1;
      const availableQuantity = listing.quantity - (listing.quantity_reserved || 0);


      // Check if enough quantity is available
      if (availableQuantity < quantityToPurchase) {
        showErrorToast(`Only ${availableQuantity} item(s) available`);
        return;
      }

      // Decide reservation strategy based on quantity
      if (listing.quantity === 1 || quantityToPurchase === listing.quantity) {
        // =============================================
        // FULL LISTING RESERVATION (quantity = 1 or buying all)
        // =============================================
        
        const reservedUntil = new Date();
        reservedUntil.setHours(reservedUntil.getHours() + 48);
        
        // First, get current reservation_count
        const { data: currentListing } = await supabase
          .from('listings')
          .select('reservation_count')
          .eq('id', conversation.listing_id)
          .single();

        const { error: listingError } = await supabase
          .from('listings')
          .update({ 
            status: 'reserved',
            reserved_until: reservedUntil.toISOString(),
            reserved_for: acceptedOffer.buyer_id,
            reservation_count: (currentListing?.reservation_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.listing_id);

        if (listingError) {
          console.error('🎯 Error reserving listing:', listingError);
        } else {
        }
      } else {
        // =============================================
        // PARTIAL QUANTITY RESERVATION (multi-quantity listing)
        // =============================================
        
        const { data: pendingTx, error: pendingTxError } = await supabase
          .rpc('create_pending_transaction', {
            p_listing_id: conversation.listing_id,
            p_conversation_id: conversationId!,
            p_buyer_id: acceptedOffer.buyer_id,
            p_quantity: quantityToPurchase,
            p_agreed_price: acceptedOffer.amount,
            p_hours_until_expiry: 48
          });

        if (pendingTxError) {
          console.error('🎯 Error creating pending transaction:', pendingTxError);
          showErrorToast('Failed to reserve quantity');
          return;
        }

      }

      // 2. Reject all other pending offers for this listing
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
      }


    } catch (err) {
      console.error('🎯 Error in handleOfferAcceptance:', err);
      showErrorToast('Failed to process offer acceptance');
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


      if (offerError) {
        console.error('🎯 Counter offer creation error:', offerError);
        throw new Error(`Failed to create counter offer: ${offerError.message}`);
      }

      if (!counterOffer || counterOffer.length === 0) {
        throw new Error('Failed to create counter offer: No data returned');
      }

      // Update the original offer's status to "countered"
      if (counteringOfferId) {
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

  // Memoized message renderer
  // Calculate message status (sent/delivered/read)
  const getMessageStatus = useCallback((message: any): 'sending' | 'sent' | 'delivered' | 'read' | 'failed' => {
    // If message has read_at, it's been read
    if (message.read_at) {
      console.log(`✅ Message ${message.id} has been read at ${message.read_at}`);
      return 'read';
    }
    
    // If message exists in DB (has created_at), it's at least sent
    if (message.created_at && message.status !== 'failed') {
      return 'sent';
    }
    
    // Check status field
    if (message.status === 'failed') {
      return 'failed';
    }
    
    if (message.status === 'sending') {
      return 'sending';
    }
    
    return 'sent';
  }, []);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    if (item.type === 'date-separator') {
      return (
        <DateSeparator
          key={item.id}
          date={item.date}
        />
      );
    }
    
    const message = item.data;
    const isOwn = message.sender_id === user?.id;
    const messageDate = new Date(message.created_at);
    const timestamp = formatChatTimestamp(messageDate);
    const messageStatus = getMessageStatus(message);
    
    const safeMessageContent = String(message.content || '');

    if (message.message_type === 'offer') {
      const offer = message.offers?.[0];
      
      if (!offer && message.offers && message.offers.length === 0) {
        return (
          <ChatBubble
            key={message.id}
            message={safeMessageContent}
            isOwn={isOwn}
            timestamp={timestamp}
            type={message.message_type}
            status={messageStatus}
          />
        );
      }
      
      if (offer) {
        const isUserBuyer = offer.buyer_id === user?.id;
        const buyerProfile = offer.buyer || message.sender;
        
        return (
          <View key={message.id} style={{ paddingHorizontal: theme.spacing.sm }}>
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
                  name: getDisplayName(buyerProfile, false).displayName || 
                        buyerProfile?.full_name || 
                        (buyerProfile?.first_name && buyerProfile?.last_name 
                          ? `${buyerProfile.first_name} ${buyerProfile.last_name}` 
                          : null) || 
                        'Unknown User',
                  avatar: buyerProfile?.avatar_url,
                  rating: buyerProfile?.rating,
                },
                message: offer.message ? String(offer.message) : undefined,
                isOwn: isUserBuyer,
              }}
              onAccept={() => handleOfferAction(offer.id, 'accept')}
              onReject={() => handleOfferAction(offer.id, 'reject')}
              onCounter={() => {
                setCounteringOfferId(offer.id);
                setShowCounterModal(true);
                setOfferAmount('');
                setOfferMessage('');
              }}
              onMessage={() => {}}
              showActions={offer.status === 'pending'}
            />

            {/* Pay Deposit Button for Accepted Offers (Buyer Only) */}
            {offer.status === 'accepted' && 
             offer.awaiting_deposit === true && 
             isUserBuyer && (
              <View style={{ marginTop: theme.spacing.sm }}>
                <View
                  style={{
                    backgroundColor: theme.colors.success + '10',
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    borderWidth: 2,
                    borderColor: theme.colors.success + '30',
                  }}
                >
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.success,
                      fontWeight: '600',
                      marginBottom: theme.spacing.xs,
                      textAlign: 'center',
                    }}
                  >
                    🎉 Offer Accepted!
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.text.secondary,
                      textAlign: 'center',
                      marginBottom: theme.spacing.sm,
                      lineHeight: 18,
                    }}
                  >
                    Secure this item with a ₵20 deposit
                    {offer.deposit_deadline && (
                      <Text style={{ fontWeight: '600', color: theme.colors.warning }}>
                        {' '}before {new Date(offer.deposit_deadline).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    )}
                  </Text>
                  <Button
                    variant="primary"
                    onPress={() => {
                      // Navigate to listing with offer context
                      router.push({
                        pathname: `/(tabs)/home/${conversation?.listing_id}`,
                        params: { offer_id: offer.id }
                      } as any);
                    }}
                    fullWidth
                  >
                    Pay ₵20 Deposit
                  </Button>
                </View>
              </View>
            )}
          </View>
        );
      }
    }

    if (message.message_type === 'callback_request') {
      return (
        <CallbackMessage
          key={message.id}
          message={message}
          isOwn={isOwn}
          senderPhone={message.sender?.phone}
          timestamp={timestamp}
        />
      );
    }

    if (message.message_type === 'system') {
      return (
        <View key={message.id} style={{ alignItems: 'center', marginVertical: theme.spacing.md }}>
          <View
            style={{
              backgroundColor: theme.colors.surfaceVariant,
              paddingHorizontal: theme.spacing.sm,
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
    }

    return (
      <ChatBubble
        key={message.id}
        message={safeMessageContent}
        isOwn={isOwn}
        timestamp={timestamp}
        type={message.message_type}
        status={messageStatus}
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
  }, [user, conversation, otherUser, theme, handleOfferAction, setCounteringOfferId, setShowCounterModal, setOfferAmount, setOfferMessage, getMessageStatus]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const ListFooter = useMemo(() => (
    <View>
      {typing && (
        <View style={{ paddingHorizontal: theme.spacing.sm, marginTop: theme.spacing.md }}>
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
    </View>
  ), [otherUser, typing, theme]);

  // Show loading state if conversation was deleted
  if (conversationDeleted) {
    return (
      <SafeAreaWrapper>
        <AppHeader
          title="Conversation"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
          <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
            Redirecting...
          </Text>
        </View>
      </SafeAreaWrapper>
    );
  }

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
    <SafeAreaWrapper style={{ flex: 1 }}>
      <AppHeader
        title={
          otherUser ? (
            <View style={{ width: '100%' }}>
              <UserDisplayName
                profile={otherUser}
                variant="full"
                showBadge={false}
                textVariant="body"
                numberOfLines={1}
              />
              {/* ✅ Unified badge system - Extra Small for compact header */}
              {(otherUser.is_sellar_pro || otherUser.is_business || otherUser.verification_status) && (
                <View style={{ marginTop: 2 }}>
                  <ExtraSmallUserBadges
                    isSellarPro={Boolean(otherUser.is_sellar_pro)}
                    isBusinessUser={Boolean(otherUser.is_business)}
                    isVerified={otherUser.verification_status === 'verified' || otherUser.verification_status === 'business_verified'}
                    isBusinessVerified={otherUser.verification_status === 'business_verified'}
                  />
                </View>
              )}
            </View>
          ) : 'Chat'
        }
        subtitle={otherUser ? lastSeenText : ''}
        showBackButton
        onBackPress={() => router.back()}
        onTitlePress={otherUser ? () => router.push(`/profile/${otherUser.id}`) : undefined}
        leftAction={
          otherUser ? (
            <TouchableOpacity 
              onPress={() => router.push(`/profile/${otherUser.id}`)}
              activeOpacity={0.7}
            >
              <Avatar
                name={getDisplayName(otherUser, false).displayName}
                source={otherUser.avatar_url}
                size="sm"
                style={{ marginLeft: theme.spacing.sm }}
              />
            </TouchableOpacity>
          ) : undefined
        }
        rightActions={[
          // Transaction button - always show if there's a listing (users can complete transactions outside app)
          conversation?.listing && (
            <View key="transaction-btn" style={{ position: 'relative' }}>
              <Button
                variant="icon"
                icon={<Handshake size={20} color={theme.colors.text.primary} />}
                onPress={() => setShowTransactionModal(true)}
              />
              {/* Badge for action needed - only show if transaction exists and needs action */}
              {existingTransaction && (() => {
                // Show badge if not fully confirmed yet
                if (!existingTransaction.buyer_confirmed_at || !existingTransaction.seller_confirmed_at) return true;
                
                // Show badge if both confirmed but user hasn't left review
                const hasLeftReview = existingTransaction.reviews?.some((review: any) => 
                  review.reviewer_id === user?.id
                );
                return !hasLeftReview;
              })() && (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.colors.error,
                  }}
                />
              )}
            </View>
          ),
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
            onBlock={() => {
              router.push({
                pathname: '/block-user',
                params: {
                  userId: otherUser.id,
                  userName: getDisplayName(otherUser, false).displayName,
                  userAvatar: otherUser.avatar_url || ''
                }
              });
            }}
            onDelete={() => {}}
            onArchive={() => {}}
            onMute={() => {}}
            onUnmute={() => {}}
          />,
        ].filter(Boolean)}
      />

      {/* Listing Context Banner */}
      {!isKeyboardVisible && conversation?.listing_id && (
        <View
          style={{
            backgroundColor: !conversation?.listing
              ? theme.colors.error + '10'
              : conversation.listing.status === 'sold' 
              ? theme.colors.text.muted + '10'
              : conversation.listing.status === 'active'
              ? theme.colors.primary + '10'
              : theme.colors.surfaceVariant,
            borderBottomWidth: 1,
            borderBottomColor: !conversation?.listing
              ? theme.colors.error + '20'
              : conversation.listing.status === 'sold'
              ? theme.colors.text.muted + '20'
              : conversation.listing.status === 'active'
              ? theme.colors.primary + '20'
              : theme.colors.border,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (conversation?.listing?.status === 'active') {
                router.push(`/(tabs)/home/${conversation.listing.id}`);
              }
            }}
            activeOpacity={conversation?.listing?.status === 'active' ? 0.7 : 1}
            disabled={!conversation?.listing || conversation.listing.status !== 'active'}
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
                  position: 'relative',
                }}
              >
                {(() => {
                  // Use listing data if available, otherwise use snapshot
                  const listingImages = conversation?.listing?.images || 
                    (conversation?.listing_images ? 
                      (typeof conversation.listing_images === 'string' ? JSON.parse(conversation.listing_images) : conversation.listing_images) 
                      : []);
                  const isDeleted = !conversation?.listing?.id;
                  const isSold = conversation?.listing?.status === 'sold';

                  return listingImages && listingImages.length > 0 ? (
                    <>
                      <Image
                        source={{ uri: listingImages[0] }}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                        resizeMode="cover"
                        blurRadius={isDeleted || isSold ? 8 : 0}
                      />
                      {(isDeleted || isSold) && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 18 }}>{isDeleted ? '🗑️' : '✅'}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: isDeleted ? theme.colors.error : theme.colors.primary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Eye size={16} color={theme.colors.primaryForeground} />
                    </View>
                  );
                })()}
              </View>
              
              <View style={{ flex: 1 }}>
                {(() => {
                  // Use listing data if available, otherwise use snapshot
                  const listingTitle = conversation?.listing?.title || conversation?.listing_title || 'Unknown Listing';
                  const listingPrice = conversation?.listing?.price || conversation?.listing_price;
                  const isDeleted = !conversation?.listing?.id;
                  const isSold = conversation?.listing?.status === 'sold';
                  const isActive = conversation?.listing?.status === 'active';

                  return (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs }}>
                        <Text variant="bodySmall" style={{ 
                          fontWeight: '600', 
                          color: isDeleted 
                            ? theme.colors.error
                            : isSold
                            ? theme.colors.text.secondary
                            : isActive
                            ? theme.colors.primary
                            : theme.colors.text.muted,
                          flex: 1,
                        }} numberOfLines={1}>
                          {listingTitle}
                        </Text>
                        {isDeleted && (
                          <Badge text="Deleted" variant="neutral" size="sm" />
                        )}
                        {isSold && (
                          <Badge text="Sold" variant="success" size="sm" />
                        )}
                      </View>
                      {isDeleted && (
                        <Text variant="caption" style={{ 
                          color: theme.colors.text.muted,
                        }}>
                          This listing has been removed
                        </Text>
                      )}
                      {isSold && (
                        <Text variant="caption" style={{ 
                          color: theme.colors.text.muted,
                          fontWeight: '500',
                        }}>
                          ✅ This item has been sold
                        </Text>
                      )}
                      {isActive && listingPrice && (
                        <PriceDisplay
                          amount={listingPrice}
                          size="sm"
                        />
                      )}
                    </>
                  );
                })()}
              </View>
              {conversation?.listing?.status === 'active' && (
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  View Listing →
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* General Conversation Banner (when no listing) */}
      {!isKeyboardVisible && !conversation?.listing?.title && (
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            paddingHorizontal: theme.spacing.sm,
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


      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.sm,
            paddingBottom: keyboardHeight,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {messages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <EmptyState
                title="Start the conversation"
                description={conversation?.listing?.title 
                  ? `Send a message about "${conversation.listing.title}"`
                  : "Send a message to begin chatting"
                }
              />
            </View>
          ) : (
            <View key={`messages-${renderKey}-${messages.length}`}>
              {transformedMessages.map((item) => (
                <React.Fragment key={item.id}>
                  {renderMessage({ item })}
                </React.Fragment>
              ))}
              
              {ListFooter}
            </View>
          )}
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>

      {/* New Messages Indicator - Shown when user scrolled up and new message arrives */}
      {hasNewMessages && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: isKeyboardVisible ? keyboardHeight + 80 : 100,
            alignSelf: 'center',
            zIndex: 1000,
            transform: [{ translateY: bounceAnim }],
          }}
        >
          <TouchableOpacity
            onPress={scrollToBottom}
            style={{
              backgroundColor: theme.colors.primary,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.borderRadius.full,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              New messages
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 16 }}>↓</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Message Input - Fixed at bottom */}
      <Animated.View
        style={{
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          transform: [{ translateY: inputContainerTranslateY }],
        }}
      >
        {/* Typing Indicator */}
        {conversationId && typingUsers[conversationId] && typingUsers[conversationId].length > 0 && otherUser && (
          <TypingIndicator
            userName={getDisplayName(otherUser, false).displayName}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          />
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: theme.spacing.sm,
            paddingTop: theme.spacing.xs,
            paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, theme.spacing.sm) : theme.spacing.sm,
            gap: theme.spacing.xs,
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
          onChangeText={(text) => {
            setMessageText(text);
            if (text.trim()) {
              onTyping(); // Trigger typing indicator when user types
            } else {
              onStopTyping(); // Stop typing when input is cleared
            }
          }}
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
      </Animated.View>

      {/* Make Offer Modal */}
      <AppModal
        position="bottom"
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
        position="bottom"
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

      {/* Moderation Error Modal */}
      <AppModal
        visible={showModerationModal}
        onClose={() => setShowModerationModal(false)}
        title="Cannot Send Message"
        size="sm"
        primaryAction={{
          text: 'OK',
          onPress: () => setShowModerationModal(false),
        }}
      >
        <Text style={{ color: theme.colors.text.secondary, lineHeight: 22 }}>
          {moderationError}
        </Text>
      </AppModal>

      {/* Transaction Modal */}
      <AppModal
        visible={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        title="Transaction"
        size="lg"
      >
        <View style={{ paddingVertical: theme.spacing.md }}>
          {conversation?.listing && otherUser && (
            <TransactionCompletionButton
              conversationId={conversationId!}
              otherUser={otherUser}
              listing={conversation.listing}
              existingTransaction={existingTransaction}
              onTransactionCreated={(transactionId) => {
                handleTransactionCreated(transactionId);
                setShowTransactionModal(false);
              }}
              onTransactionUpdated={() => {
                handleTransactionUpdated();
                setShowTransactionModal(false);
              }}
            />
          )}
        </View>
      </AppModal>
    </SafeAreaWrapper>
  );
}