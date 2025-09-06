import { useState, useEffect } from 'react';
import { dbHelpers, supabase } from '@/lib/supabase';
import { useChatRealtime } from './useRealtime';
import { useAuthStore } from '@/store/useAuthStore';

export function useConversations() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dbHelpers.getConversations(user.id);

      if (fetchError) {
        setError(typeof fetchError === 'string' ? fetchError : (fetchError as any)?.message || 'Failed to load conversations');
      } else {
        setConversations(data || []);
      }
    } catch (err) {
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
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

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dbHelpers.getMessages(conversationId);

      if (fetchError) {
        setError(typeof fetchError === 'string' ? fetchError : (fetchError as any)?.message || 'Failed to load messages');
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Real-time message updates
  useChatRealtime(conversationId, (newMessage) => {
    setMessages(prev => {
      // Avoid duplicates
      const exists = prev.find(msg => msg.id === newMessage.id);
      if (exists) return prev;
      
      return [...prev, newMessage].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  });

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  const sendMessage = async (content: string, messageType = 'text', offerData?: any) => {
    const { user } = useAuthStore.getState();
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await dbHelpers.sendMessage({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        message_type: messageType,
        offer_data: offerData,
      });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (err) {
      return { error: 'Failed to send message' };
    }
  };

  const markMessagesAsRead = async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .neq('status', 'read');
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
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