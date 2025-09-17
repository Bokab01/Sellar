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

      // Delay to ensure database updates have propagated
      await new Promise(resolve => setTimeout(resolve, 500));

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
        const { setUnreadCount, unreadCounts, manuallyMarkedAsUnread, lastReadTimestamps } = useChatStore.getState();
        
        if (unreadCountsResult.data) {
          // Smart merge: only update counts for conversations that:
          // 1. Have unread messages in the database, OR
          // 2. Are not in the local state (new conversations)
          // 3. Are not manually marked as unread (preserve user's manual marking)
          Object.entries(unreadCountsResult.data).forEach(([conversationId, count]) => {
            const currentLocalCount = unreadCounts[conversationId] || 0;
            const isManuallyMarked = manuallyMarkedAsUnread.has(conversationId);
            
            // Smart logic to handle race conditions, app reloads, and preserve local state
            const lastReadTime = lastReadTimestamps[conversationId];
            const timeSinceLastRead = lastReadTime ? Date.now() - lastReadTime : null;
            const isRecentRead = timeSinceLastRead !== null && timeSinceLastRead < 300000; // 5 minutes
            
            if (isManuallyMarked) {
              console.log('🚫 Preserving manually marked unread conversation:', conversationId);
              // Don't update manually marked conversations
            } else if (!(conversationId in unreadCounts)) {
              // New conversation not in local state - use database count
              console.log('📊 New conversation, using database count:', conversationId, 'count:', count);
              setUnreadCount(conversationId, count as number);
            } else if (count > 0 && currentLocalCount === 0) {
              // Database shows unread but local shows 0 - check if this is a recent read
              if (isRecentRead) {
                console.log('⚠️ Recent read detected - database shows unread but local shows 0 for:', conversationId);
                console.log('⏰ Last read:', timeSinceLastRead, 'ms ago - preserving local state (0)');
                // Don't update - preserve the local state of 0
              } else {
                console.log('📊 App reload detected - using database count for:', conversationId, 'count:', count);
                setUnreadCount(conversationId, count as number);
              }
            } else if (count > 0 && currentLocalCount > 0) {
              // If both database and local have unread messages, use the higher count
              const maxCount = Math.max(count as number, currentLocalCount);
              if (maxCount !== currentLocalCount) {
                console.log('📊 Using higher unread count:', conversationId, 'count:', maxCount);
                setUnreadCount(conversationId, maxCount);
              }
            } else if (count === 0 && currentLocalCount > 0) {
              // Database shows 0 but local shows unread - use database (messages were read)
              console.log('📊 Database shows 0, updating local count to 0 for:', conversationId);
              setUnreadCount(conversationId, 0);
            }
          });
        }
        
        // Clear counts for conversations that no longer have unread messages in database
        // But only if they're not manually marked as unread
        const currentUnreadCounts = unreadCountsResult.data || {};
        Object.keys(unreadCounts).forEach(conversationId => {
          if (!(conversationId in currentUnreadCounts) && !manuallyMarkedAsUnread.has(conversationId)) {
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
          const messageWithOffers = completeMessage.find(msg => (msg as any).id === (newMessage as any).id);
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
        // Even if database update fails, update local state to prevent UI issues
        const { setUnreadCount, clearManuallyMarkedAsUnread } = useChatStore.getState();
        setUnreadCount(conversationId, 0);
        clearManuallyMarkedAsUnread(conversationId);
        console.log('📊 Updated local unread count to 0 despite database error');
      } else {
        console.log('✅ Marked messages as read:', data?.length || 0, 'messages in conversation:', conversationId);
        if (data && data.length > 0) {
          console.log('📝 Messages marked as read:', data.map(msg => ({ id: msg.id, read_at: msg.read_at })));
        }
        
        // Always update local unread count to 0 since we're marking messages as read
        const { setUnreadCount, clearManuallyMarkedAsUnread } = useChatStore.getState();
        setUnreadCount(conversationId, 0);
        clearManuallyMarkedAsUnread(conversationId); // Clear manual marking since we're reading
        console.log('📊 Updated local unread count to 0 for conversation:', conversationId);
        
        // Wait a bit to ensure database update is committed
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('❌ Exception in markMessagesAsRead:', error);
      // Even if there's an exception, update local state
      const { setUnreadCount, clearManuallyMarkedAsUnread } = useChatStore.getState();
      setUnreadCount(conversationId, 0);
      clearManuallyMarkedAsUnread(conversationId);
      console.log('📊 Updated local unread count to 0 despite exception');
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