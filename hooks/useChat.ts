import { useState, useEffect, useCallback } from 'react';
import { dbHelpers, supabase } from '@/lib/supabase';
import { useChatRealtime, useOffersRealtime, useConversationsRealtime } from './useRealtime';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';

export function useConversations() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async (skipLoading = false, retryCount = 0) => {
    if (!user) return;

    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000; // 1 second

    try {
      if (!skipLoading) {
        setLoading(true);
      }
      setError(null);

      console.log(`📥 Fetching conversations (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      // Fetch conversations and unread counts in parallel with timeout
      const fetchPromise = Promise.all([
        dbHelpers.getConversations(user.id),
        dbHelpers.getUnreadMessageCounts(user.id)
      ]);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      const [conversationsResult, unreadCountsResult] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (conversationsResult.error) {
        throw new Error(typeof conversationsResult.error === 'string' ? conversationsResult.error : (conversationsResult.error as any)?.message || 'Failed to load conversations');
      } else {
        console.log(`✅ Loaded ${conversationsResult.data?.length || 0} conversations`);
        setConversations(conversationsResult.data || []);
        
        // Update unread counts in the chat store
        const { setUnreadCount, unreadCounts, manuallyMarkedAsUnread, lastReadTimestamps } = useChatStore.getState();
        
        if (unreadCountsResult.data) {
          // Smart merge: only update counts for conversations that:
          // 1. Have unread messages in the database, OR
          // 2. Are not in the local state (new conversations)
          // 3. Are not manually marked as unread (preserve user's manual marking)
          Object.entries(unreadCountsResult.data).forEach(([conversationId, count]) => {
            const countNum = Number(count);
            const currentLocalCount = unreadCounts[conversationId] || 0;
            const isManuallyMarked = manuallyMarkedAsUnread.has(conversationId);
            
            // Smart logic to handle race conditions, app reloads, and preserve local state
            const lastReadTime = lastReadTimestamps[conversationId];
            const timeSinceLastRead = lastReadTime ? Date.now() - lastReadTime : null;
            const isRecentRead = timeSinceLastRead !== null && timeSinceLastRead < 300000; // 5 minutes
            
            if (isManuallyMarked) {
              // Don't update manually marked conversations
            } else if (!(conversationId in unreadCounts)) {
              // New conversation not in local state - use database count
              setUnreadCount(conversationId, countNum);
            } else if (countNum > 0 && currentLocalCount === 0) {
              // Database shows unread but local shows 0 - check if this is a recent read
              if (isRecentRead) {
                // Don't update - preserve the local state of 0
              } else {
                setUnreadCount(conversationId, countNum);
              }
            } else if (countNum > 0 && currentLocalCount > 0) {
              // If both database and local have unread messages, use the higher count
              const maxCount = Math.max(countNum, currentLocalCount);
              if (maxCount !== currentLocalCount) {
                setUnreadCount(conversationId, maxCount);
              }
            } else if (countNum === 0 && currentLocalCount > 0) {
              // Database shows 0 but local shows unread - use database (messages were read)
              setUnreadCount(conversationId, 0);
            }
          });
        }
        
        // Clear counts for conversations that no longer have unread messages in database
        // But only if they're not manually marked as unread
        const currentUnreadCounts = unreadCountsResult.data || {};
        Object.keys(unreadCounts).forEach(conversationId => {
          if (!(conversationId in currentUnreadCounts) && !manuallyMarkedAsUnread.has(conversationId)) {
            setUnreadCount(conversationId, 0);
          }
        });
      }
    } catch (err: any) {
      console.error(`❌ Error loading conversations:`, err);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchConversations(skipLoading, retryCount + 1);
      }
      
      // Max retries reached
      const errorMessage = err.message === 'Request timeout' 
        ? 'Connection timeout. Please check your internet connection.'
        : 'Failed to load conversations. Pull to refresh.';
      
      setError(errorMessage);
      console.error('❌ Max retries reached, giving up');
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Real-time updates for conversations
  const handleConversationUpdate = useCallback(() => {
    // Use skipLoading to avoid showing loading state for real-time updates
    fetchConversations(true);
  }, [fetchConversations]);

  // Set up real-time subscriptions - MUST be called unconditionally (Rules of Hooks)
  // The hook will handle the user check internally
  useConversationsRealtime(user?.id || '', handleConversationUpdate);

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

  const fetchMessages = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000;

    try {
      setLoading(true);
      setError(null);

      console.log(`📥 Fetching messages for conversation ${conversationId} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      // Add timeout to prevent infinite loading
      const fetchPromise = dbHelpers.getMessages(conversationId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      const { data, error: fetchError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (fetchError) {
        throw new Error(typeof fetchError === 'string' ? fetchError : (fetchError as any)?.message || 'Failed to load messages');
      } else {
        // Reverse the order since getMessages returns newest first, but we want oldest first for display
        const sortedMessages = (data || []).reverse();
        console.log(`✅ Loaded ${sortedMessages.length} messages`);
        setMessages(sortedMessages);
      }
    } catch (err: any) {
      console.error(`❌ Error loading messages:`, err);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchMessages(retryCount + 1);
      }
      
      // Max retries reached
      const errorMessage = err.message === 'Request timeout' 
        ? 'Connection timeout. Please check your internet connection.'
        : 'Failed to load messages. Pull to refresh.';
      
      setError(errorMessage);
      console.error('❌ Max retries reached for messages, giving up');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Real-time message updates
  const handleNewMessage = useCallback((newMessage: any) => {
    console.log(`📨 Real-time message received in useMessages:`, {
      messageId: newMessage.id,
      conversationId: newMessage.conversation_id,
      content: newMessage.content?.substring(0, 50),
      sender: newMessage.sender_id,
      hasJoins: !!newMessage.sender,
    });
    
    // useChatRealtime now fetches complete message data with joins,
    // so we don't need to fetch again here
    
    setMessages(prev => {
      console.log(`📨 Updating messages state. Previous count: ${prev.length}`);
      
      // Check if message already exists
      const existingIndex = prev.findIndex(msg => msg.id === newMessage.id);
      
      if (existingIndex !== -1) {
        console.log(`📨 Message ${newMessage.id} already exists at index ${existingIndex}, updating...`);
        // Update existing message (for read receipts, status changes, etc.)
        const updatedMessages = [...prev];
        updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...newMessage };
        return updatedMessages;
      }
      
      console.log(`📨 Adding new message ${newMessage.id} to messages array`);
      
      // Add new message and sort by created_at to maintain chronological order
      const updatedMessages = [...prev, newMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      console.log(`📨 New messages count: ${updatedMessages.length}`);
      
      return updatedMessages;
    });
  }, []);

  // Real-time subscription
  useChatRealtime(conversationId, handleNewMessage);
  
  // Debug: Log whenever messages state changes
  useEffect(() => {
    console.log(`🔥 [useMessages] Messages state updated for conversation ${conversationId}:`, {
      count: messages.length,
      messageIds: messages.map(m => m.id),
    });
  }, [messages, conversationId]);

  // Real-time offer updates
  const handleOfferUpdate = useCallback(async (updatedOffer: any) => {
    
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

    // Update last_seen timestamp whenever user sends a message
    supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) {
          console.warn('Failed to update last_seen:', error);
        }
      });

    // ✅ OPTIMISTIC UPDATE: Add message immediately to UI
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      message_type: messageType,
      images: images ? JSON.stringify(images) : null,
      offer_data: offerData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'sending',
      profiles: {
        id: user.id,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        avatar_url: user.user_metadata?.avatar_url || null,
      }
    };

    // Add optimistic message immediately
    setMessages(prev => {
      const updatedMessages = [...prev, optimisticMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return updatedMessages;
    });

    try {
      // Only moderate text messages (not system messages, offers, etc.)
      if (messageType === 'text' && content.trim()) {
        const { contentModerationService } = await import('@/lib/contentModerationService');
        
        const moderationResult = await contentModerationService.moderateContent({
          id: 'temp-message-id',
          type: 'comment', // Messages are similar to comments
          userId: user.id,
          content: content,
          images: images,
        });

        // Check if content is approved
        if (!moderationResult.isApproved) {
          // Remove optimistic message on moderation failure
          setMessages(prev => prev.filter(msg => msg.id !== tempId));
          
          // Extract specific violations with user-friendly messages
          const flagReasons = moderationResult.flags
            .map(flag => {
              if (flag.type === 'profanity') {
                return 'Inappropriate language detected';
              } else if (flag.type === 'personal_info') {
                return 'Too much personal information (multiple phone numbers/emails)';
              } else if (flag.type === 'spam') {
                return 'Spam-like content detected';
              } else if (flag.type === 'inappropriate') {
                return 'Inappropriate content detected';
              } else if (flag.type === 'suspicious_links') {
                return 'Suspicious or shortened links detected';
              }
              return flag.details;
            })
            .join('\n• ');
          
          return { 
            error: `Your message cannot be sent:\n\n• ${flagReasons}\n\nPlease review and modify your content, then try again.` 
          };
        }
      }

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
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        return { error: error.message };
      }

      
      // Update optimistic message with real data
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === tempId 
            ? { ...data, status: 'sent' }
            : msg
        );
        return updatedMessages;
      });
      
      return { data };
    } catch (err) {
      console.error('📤 Exception sending message:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      return { error: 'Failed to send message' };
    }
  };

  const markMessagesAsRead = async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      return;
    }


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
      } else {
        if (data && data.length > 0) {
        }
        
        // Always update local unread count to 0 since we're marking messages as read
        const { setUnreadCount, clearManuallyMarkedAsUnread } = useChatStore.getState();
        setUnreadCount(conversationId, 0);
        clearManuallyMarkedAsUnread(conversationId); // Clear manual marking since we're reading
        
        // Wait a bit to ensure database update is committed
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('❌ Exception in markMessagesAsRead:', error);
      // Even if there's an exception, update local state
      const { setUnreadCount, clearManuallyMarkedAsUnread } = useChatStore.getState();
      setUnreadCount(conversationId, 0);
      clearManuallyMarkedAsUnread(conversationId);
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