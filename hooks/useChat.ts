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
              // Don't update manually marked conversations
            } else if (!(conversationId in unreadCounts)) {
              // New conversation not in local state - use database count
              setUnreadCount(conversationId, count as number);
            } else if (count > 0 && currentLocalCount === 0) {
              // Database shows unread but local shows 0 - check if this is a recent read
              if (isRecentRead) {
                // Don't update - preserve the local state of 0
              } else {
                setUnreadCount(conversationId, count as number);
              }
            } else if (count > 0 && currentLocalCount > 0) {
              // If both database and local have unread messages, use the higher count
              const maxCount = Math.max(count as number, currentLocalCount);
              if (maxCount !== currentLocalCount) {
                setUnreadCount(conversationId, maxCount);
              }
            } else if (count === 0 && currentLocalCount > 0) {
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

  // Real-time updates for conversations
  const handleConversationUpdate = useCallback(() => {
    // Use skipLoading to avoid showing loading state for real-time updates
    fetchConversations(true);
  }, []);

  // Set up real-time subscriptions
  if (user?.id) {
    useConversationsRealtime(user.id, handleConversationUpdate);
  }

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
  const handleNewMessage = useCallback((newMessage: any) => {
    
    // useChatRealtime now fetches complete message data with joins,
    // so we don't need to fetch again here
    
    setMessages(prev => {
      // Check if message already exists
      const existingIndex = prev.findIndex(msg => msg.id === newMessage.id);
      
      if (existingIndex !== -1) {
        // Update existing message (for read receipts, status changes, etc.)
        const updatedMessages = [...prev];
        updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...newMessage };
        return updatedMessages;
      }
      
      
      // Add new message and sort by created_at to maintain chronological order
      const updatedMessages = [...prev, newMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      return updatedMessages;
    });
  }, []);

  useChatRealtime(conversationId, handleNewMessage);

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