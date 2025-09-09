import { useState, useEffect, useCallback } from 'react';
import { dbHelpers, supabase } from '@/lib/supabase';
import { useChatRealtime, useOffersRealtime } from './useRealtime';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';

export function useConversations() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async (skipLoading = false) => {
    if (!user) return;

    try {
      if (!skipLoading) {
        setLoading(true);
      }
      setError(null);

      // Fetch conversations and unread counts in parallel
      const [conversationsResult, unreadCountsResult] = await Promise.all([
        dbHelpers.getConversations(user.id),
        dbHelpers.getUnreadMessageCounts(user.id)
      ]);

      if (conversationsResult.error) {
        setError(typeof conversationsResult.error === 'string' ? conversationsResult.error : (conversationsResult.error as any)?.message || 'Failed to load conversations');
      } else {
        setConversations(conversationsResult.data || []);
        
        // Update unread counts in the chat store
        const { setUnreadCount, unreadCounts } = useChatStore.getState();
        
        if (unreadCountsResult.data) {
          // Update counts for conversations with unread messages
          Object.entries(unreadCountsResult.data).forEach(([conversationId, count]) => {
            setUnreadCount(conversationId, count as number);
          });
        }
        
        // Clear counts for conversations that no longer have unread messages
        // This ensures that conversations marked as read are properly cleared
        const currentUnreadCounts = unreadCountsResult.data || {};
        Object.keys(unreadCounts).forEach(conversationId => {
          if (!(conversationId in currentUnreadCounts)) {
            console.log('🧹 Clearing unread count for conversation:', conversationId);
            setUnreadCount(conversationId, 0);
          }
        });
      }
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  return {
    conversations,
    loading,
    error,
    refresh: fetchConversations,
  };
}

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dbHelpers.getMessages(conversationId);

      if (fetchError) {
        setError(typeof fetchError === 'string' ? fetchError : (fetchError as any)?.message || 'Failed to load messages');
      } else {
        // Reverse the order since getMessages returns newest first, but we want oldest first for display
        const sortedMessages = (data || []).reverse();
        setMessages(sortedMessages);
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Real-time message updates
  const handleNewMessage = useCallback(async (newMessage: any) => {
    console.log('📨 New message received via real-time:', newMessage);
    
    // For offer messages, fetch the complete message data including offers
    if (newMessage.message_type === 'offer') {
      try {
        const { data: completeMessage, error } = await dbHelpers.getMessages(conversationId);
        if (!error && completeMessage) {
          const messageWithOffers = completeMessage.find(msg => msg.id === newMessage.id);
          if (messageWithOffers) {
            newMessage = messageWithOffers;
            console.log('📨 Fetched complete offer message:', newMessage);
          }
        }
      } catch (err) {
        console.error('📨 Error fetching complete message:', err);
      }
    }
    
    setMessages(prev => {
      // Check if message already exists
      const existingIndex = prev.findIndex(msg => msg.id === newMessage.id);
      
      if (existingIndex !== -1) {
        // Update existing message (for read receipts, status changes, etc.)
        console.log('📨 Updating existing message:', newMessage.id);
        const updatedMessages = [...prev];
        updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...newMessage };
        return updatedMessages;
      }
      
      console.log('📨 Adding new message to list. Previous count:', prev.length);
      
      // Add new message and sort by created_at to maintain chronological order
      const updatedMessages = [...prev, newMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      console.log('📨 Updated messages count:', updatedMessages.length);
      return updatedMessages;
    });
  }, [conversationId]);

  useChatRealtime(conversationId, handleNewMessage);

  // Real-time offer updates
  const handleOfferUpdate = useCallback(async (updatedOffer: any) => {
    console.log('🔗 Offer update received via real-time:', updatedOffer);
    
    // Refresh messages to get updated offer data
    // This ensures the UI shows the latest offer statuses
    setTimeout(() => {
      fetchMessages();
    }, 100); // Small delay to ensure database consistency
  }, [fetchMessages]);

  useOffersRealtime(conversationId, handleOfferUpdate);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  const sendMessage = async (content: string, messageType = 'text', images?: string[], offerData?: any) => {
    const { user } = useAuthStore.getState();
    if (!user) return { error: 'Not authenticated' };

    console.log('📤 Sending message:', { content, messageType, conversationId, senderId: user.id, images });

    try {
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        offer_data: offerData,
      };

      // Add images if provided
      if (images && images.length > 0) {
        messageData.images = JSON.stringify(images);
      }

      const { data, error } = await dbHelpers.sendMessage(messageData);

      if (error) {
        console.error('📤 Error sending message:', error);
        return { error: error.message };
      }

      console.log('📤 Message sent successfully:', data);
      
      // Add a fallback: if real-time doesn't work, manually add the message to the list
      setTimeout(() => {
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === data.id);
          if (!exists) {
            console.log('📤 Adding sent message manually (real-time fallback)');
            const updatedMessages = [...prev, data].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return updatedMessages;
          }
          return prev;
        });
      }, 1000); // Wait 1 second to see if real-time picks it up
      
      return { data };
    } catch (err) {
      console.error('📤 Exception sending message:', err);
      return { error: 'Failed to send message' };
    }
  };

  const markMessagesAsRead = async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.log('❌ No user found for markMessagesAsRead');
      return;
    }

    console.log('📖 markMessagesAsRead called for conversation:', conversationId);

    try {
      // Mark unread messages as read using read_at timestamp
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .select();

      if (error) {
        console.error('❌ Failed to mark messages as read:', error);
      } else {
        console.log('✅ Marked messages as read:', data?.length || 0, 'messages in conversation:', conversationId);
        
        // Update local unread count to 0 since messages are now read
        if (data && data.length > 0) {
          const { setUnreadCount } = useChatStore.getState();
          setUnreadCount(conversationId, 0);
          console.log('📊 Updated local unread count to 0 for conversation:', conversationId);
        }
      }
    } catch (error) {
      console.error('❌ Exception in markMessagesAsRead:', error);
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    markMessagesAsRead,
    refresh: fetchMessages,
  };
}