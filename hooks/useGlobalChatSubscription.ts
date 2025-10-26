import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useInAppNotificationStore } from '@/store/useInAppNotificationStore';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Global hook to set up real-time chat subscriptions for unread count updates
 * This ensures the inbox tab badge and chatlist counters update in real-time
 * Similar to useGlobalNotificationSubscription
 */
export function useGlobalChatSubscription() {
  const { user } = useAuthStore();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user?.id) {
      // Cleanup existing subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      return;
    }

    console.log('💬 [GlobalChat] Setting up global chat subscription for user:', user.id);

    // Cleanup any existing channel first
    if (channelRef.current) {
      console.log('💬 [GlobalChat] Removing existing channel before creating new one');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Add a small delay to ensure auth is fully ready
    const setupTimeout = setTimeout(() => {
      console.log('💬 [GlobalChat] Creating channel now...');
      
      // Create a channel to listen for new messages
      const channel = supabase
        .channel(`global-chat-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new;

          // Don't increment unread count if current user sent the message
          if (newMessage.sender_id === user.id) {
            return;
          }

          // Get the conversation to check if user is a participant
          const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('participant_1, participant_2')
            .eq('id', newMessage.conversation_id)
            .single();

          if (convError) {
            return;
          }

          // Check if current user is a participant
          const isParticipant = 
            conversation.participant_1 === user.id || 
            conversation.participant_2 === user.id;

          if (!isParticipant) {
            return;
          }

          // Increment unread count for this conversation
          const { unreadCounts, setUnreadCount, activeConversationId } = useChatStore.getState();
          const currentCount = unreadCounts[newMessage.conversation_id] || 0;
          const newCount = currentCount + 1;
          
          console.log('📬 [GlobalChat] Setting unread count:', {
            conversationId: newMessage.conversation_id,
            currentCount,
            newCount,
            activeConversationId,
          });
          
          setUnreadCount(newMessage.conversation_id, newCount);

          // Show in-app notification ONLY if:
          // 1. App is in foreground
          // 2. User is NOT currently viewing this conversation
          const isViewingThisChat = activeConversationId === newMessage.conversation_id;
          
          if (AppState.currentState === 'active' && !isViewingThisChat) {
            console.log('🔔 [GlobalChat] Showing in-app notification...');
            
            // Fetch sender info for notification
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', newMessage.sender_id)
              .single();

            const senderName = senderProfile
              ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() || 'Someone'
              : 'Someone';

            console.log('🔔 [GlobalChat] Triggering notification for:', senderName);

            useInAppNotificationStore.getState().showNotification({
              title: `New message from ${senderName}`,
              message: newMessage.content ? newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : '') : 'Sent you a message',
              type: 'message',
              data: {
                conversationId: newMessage.conversation_id,
                senderId: newMessage.sender_id,
              },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const updatedMessage = payload.new;
          
          // Check if message was marked as read
          if (updatedMessage.is_read && !payload.old.is_read) {
            // Fetch fresh unread count for this conversation
            const { count, error: countError } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', updatedMessage.conversation_id)
              .eq('is_read', false)
              .neq('sender_id', user.id);

            if (!countError) {
              const newCount = count || 0;
              useChatStore.getState().setUnreadCount(updatedMessage.conversation_id, newCount);
            }
          }
        }
      )
        .subscribe((status) => {
          console.log('💬 [GlobalChat] Subscription status:', status);
        });

      channelRef.current = channel;
    }, 500); // Wait 500ms for auth to be ready

    // Cleanup on unmount or user change
    return () => {
      clearTimeout(setupTimeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);
}

