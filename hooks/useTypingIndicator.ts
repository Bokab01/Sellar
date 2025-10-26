import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

const TYPING_TIMEOUT = 3000; // Clear typing status after 3 seconds of inactivity
const TYPING_THROTTLE = 500; // Only send typing update once per 500ms

export function useTypingIndicator(conversationId: string, otherUserId?: string) {
  const { user } = useAuthStore();
  const { setTypingUser } = useChatStore();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);
  const isTypingRef = useRef(false);
  const otherUserTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Broadcast typing status via Broadcast (in-memory, no DB writes)
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!user || !conversationId || !channelRef.current) {
      console.log('❌ Cannot broadcast typing - missing:', {
        hasUser: !!user,
        hasConversationId: !!conversationId,
        hasChannel: !!channelRef.current,
      });
      return;
    }

    const now = Date.now();
    
    // Throttle typing broadcasts
    if (isTyping && now - lastTypingBroadcastRef.current < TYPING_THROTTLE) {
      console.log('⏱️ Throttling typing broadcast');
      return;
    }

    lastTypingBroadcastRef.current = now;
    isTypingRef.current = isTyping;

    console.log('📤 Broadcasting typing status:', { 
      user_id: user.id, 
      is_typing: isTyping, 
      conversationId 
    });

    // Broadcast typing status (in-memory, super fast)
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        is_typing: isTyping,
        timestamp: now,
      },
    });
  }, [user, conversationId]);

  // User started typing
  const onTyping = useCallback(() => {
    console.log('⌨️ User typing...');
    
    // Always broadcast when user types (throttling is handled inside broadcastTyping)
    broadcastTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Typing timeout - clearing status');
      broadcastTyping(false);
    }, TYPING_TIMEOUT);
  }, [broadcastTyping]);

  // User stopped typing (e.g., sent message)
  const onStopTyping = useCallback(() => {
    console.log('🛑 Stopping typing indicator');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    isTypingRef.current = false;
    broadcastTyping(false);
  }, [broadcastTyping]);

  // Set up broadcast channel for typing indicators
  useEffect(() => {
    if (!conversationId || !user) {
      console.log('❌ Cannot setup typing channel - missing conversationId or user');
      return;
    }

    console.log('🔌 Setting up typing channel for conversation:', conversationId, 'otherUserId:', otherUserId);

    const channel = supabase
      .channel(`typing:${conversationId}`, {
        config: {
          broadcast: { self: false }, // Don't receive own broadcasts
          presence: { key: '' },
        },
      })
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        console.log('📥 Received typing broadcast:', payload);
        
        // Handle both formats: snake_case (user_id) and camelCase (userId)
        const payloadData = payload.payload;
        const user_id = payloadData.user_id || payloadData.userId;
        const is_typing = payloadData.is_typing !== undefined ? payloadData.is_typing : payloadData.isTyping !== undefined ? payloadData.isTyping : true;
        const timestamp = payloadData.timestamp;
        
        console.log('👤 Typing from user:', user_id, 'is_typing:', is_typing, 'otherUserId:', otherUserId);
        
        if (!user_id) {
          console.log('❌ No user_id in payload');
          return;
        }
        
        // Only process if it's the other user
        if (user_id === user.id) {
          console.log('⏭️ Ignoring own typing event');
          return;
        }
        
        if (!otherUserId) {
          console.log('⚠️ No otherUserId set yet');
          return;
        }
        
        if (user_id !== otherUserId) {
          console.log('⏭️ Typing from different user, ignoring. Got:', user_id, 'Expected:', otherUserId);
          return;
        }
        
        const now = Date.now();
        const age = now - timestamp;
        
        console.log('⏱️ Timestamp age:', age, 'ms');
        
        // Only show typing if timestamp is recent (within 5 seconds)
        if (is_typing && age < 5000) {
          console.log('✅ Setting typing user:', user_id, 'for conversation:', conversationId);
          setTypingUser(conversationId, user_id, true);
          
          // Clear any existing timeout for this user
          if (otherUserTypingTimeoutRef.current) {
            clearTimeout(otherUserTypingTimeoutRef.current);
          }
          
          // Auto-clear after 4 seconds (longer than throttle to avoid flicker)
          otherUserTypingTimeoutRef.current = setTimeout(() => {
            console.log('⏰ Auto-clearing typing status for:', user_id);
            setTypingUser(conversationId, user_id, false);
            otherUserTypingTimeoutRef.current = null;
          }, 4000);
        } else {
          console.log('❌ Clearing typing status (too old or stopped)');
          setTypingUser(conversationId, user_id, false);
          // Clear timeout if user explicitly stopped
          if (otherUserTypingTimeoutRef.current) {
            clearTimeout(otherUserTypingTimeoutRef.current);
            otherUserTypingTimeoutRef.current = null;
          }
        }
      })
      .subscribe((status) => {
        console.log('🔌 Typing channel status:', status);
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up typing channel');
      
      // Clear typing status on unmount
      if (isTypingRef.current && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: user?.id,
            is_typing: false,
            timestamp: Date.now(),
          },
        });
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (otherUserTypingTimeoutRef.current) {
        clearTimeout(otherUserTypingTimeoutRef.current);
        otherUserTypingTimeoutRef.current = null;
      }
    };
  }, [conversationId, user, otherUserId, setTypingUser]);

  return {
    onTyping,
    onStopTyping,
  };
}

