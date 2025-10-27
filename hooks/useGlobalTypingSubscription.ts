import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useFocusEffect } from '@react-navigation/native';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Global typing subscription for the inbox screen
 * Subscribes to typing channels for multiple conversations
 */
export function useGlobalTypingSubscription(conversationIds: string[]) {
  const { user } = useAuthStore();
  const { setTypingUser } = useChatStore();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [isFocused, setIsFocused] = useState(true);

  // Track screen focus to re-establish subscriptions when returning to inbox
  useFocusEffect(
    useCallback(() => {
      console.log('📱 [GlobalTyping] Screen focused, triggering re-subscription');
      setIsFocused(true);
      
      return () => {
        console.log('📱 [GlobalTyping] Screen unfocused');
        setIsFocused(false);
      };
    }, [])
  );

  useEffect(() => {
    if (!user || conversationIds.length === 0 || !isFocused) {
      console.log('❌ [GlobalTyping] Cannot setup - no user, conversations, or not focused');
      return;
    }

    console.log('🔌 [GlobalTyping] Setting up typing subscriptions for', conversationIds.length, 'conversations:', conversationIds);

    // Immediate setup - no delay needed as Supabase handles channel conflicts
    const setupChannels = () => {
      // First, ensure any existing channels are removed
      if (channelsRef.current.length > 0) {
        console.log('🧹 [GlobalTyping] Removing existing channels before creating new ones');
        channelsRef.current.forEach((channel) => {
          supabase.removeChannel(channel);
        });
        channelsRef.current = [];
      }
      
      // Subscribe to each conversation's typing channel
      // Use "global-" prefix to avoid conflicts with chat detail subscriptions
      const channels = conversationIds.map((conversationId) => {
        console.log('🔌 [GlobalTyping] Creating channel for conversation:', conversationId);
        const channel = supabase
          .channel(`typing:${conversationId}`, {
            config: {
              broadcast: { self: false }, // Don't receive own broadcasts
              presence: { key: '' },
            },
          })
          .on('broadcast', { event: 'typing' }, (payload: any) => {
          console.log('📥 [GlobalTyping] Received typing broadcast for', conversationId, ':', payload);
          
          // Handle both formats: snake_case (user_id) and camelCase (userId)
          const payloadData = payload.payload;
          const user_id = payloadData.user_id || payloadData.userId;
          const is_typing = payloadData.is_typing !== undefined 
            ? payloadData.is_typing 
            : payloadData.isTyping !== undefined 
            ? payloadData.isTyping 
            : true;
          const timestamp = payloadData.timestamp;
          
          console.log('👤 [GlobalTyping] Typing event:', {
            user_id,
            is_typing,
            conversationId,
            timestamp,
          });
          
          if (!user_id) {
            console.log('❌ [GlobalTyping] Missing user_id');
            return;
          }
          
          // Ignore own typing events
          if (user_id === user.id) {
            console.log('⏭️ [GlobalTyping] Ignoring own typing event');
            return;
          }
          
          const now = Date.now();
          const age = now - timestamp;
          
          console.log('⏱️ [GlobalTyping] Timestamp age:', age, 'ms');
          
          const timeoutKey = `${conversationId}:${user_id}`;
          
          // Only show typing if timestamp is recent (within 5 seconds)
          if (is_typing && age < 5000) {
            console.log('✅ [GlobalTyping] Setting typing user:', user_id, 'for conversation:', conversationId);
            setTypingUser(conversationId, user_id, true);
            
            // Clear any existing timeout for this conversation + user
            if (typingTimeoutsRef.current[timeoutKey]) {
              clearTimeout(typingTimeoutsRef.current[timeoutKey]);
            }
            
            // Auto-clear after 4 seconds
            typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
              console.log('⏰ [GlobalTyping] Auto-clearing typing status for:', user_id, 'in', conversationId);
              setTypingUser(conversationId, user_id, false);
              delete typingTimeoutsRef.current[timeoutKey];
            }, 4000);
          } else {
            console.log('❌ [GlobalTyping] Clearing typing status immediately (stopped or too old)');
            
            // Immediately clear the typing status
            setTypingUser(conversationId, user_id, false);
            
            // Clear and remove timeout if user explicitly stopped
            if (typingTimeoutsRef.current[timeoutKey]) {
              clearTimeout(typingTimeoutsRef.current[timeoutKey]);
              delete typingTimeoutsRef.current[timeoutKey];
            }
          }
        })
        .subscribe((status) => {
          console.log('🔌 [GlobalTyping] Channel status for', conversationId, ':', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ [GlobalTyping] Successfully subscribed to', conversationId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [GlobalTyping] Channel error for', conversationId);
          } else if (status === 'TIMED_OUT') {
            console.error('⏰ [GlobalTyping] Subscription timeout for', conversationId);
          }
        });

        return channel;
      });

      channelsRef.current = channels;
      console.log('✅ [GlobalTyping] All channels created:', channels.length);
    };
    
    // Setup channels immediately
    setupChannels();

    // Cleanup
    return () => {
      console.log('🧹 [GlobalTyping] Cleaning up typing subscriptions for', conversationIds.length, 'conversations');
      
      // ✅ CRITICAL: Clear all typing statuses for these conversations before cleanup
      // Get current typing users from the timeout keys
      const timeoutKeys = Object.keys(typingTimeoutsRef.current);
      console.log('🧹 [GlobalTyping] Active typing timeouts:', timeoutKeys);
      
      timeoutKeys.forEach(key => {
        const [conversationId, userId] = key.split(':');
        if (conversationId && userId) {
          console.log('🧹 [GlobalTyping] Clearing typing for user:', userId, 'in conversation:', conversationId);
          setTypingUser(conversationId, userId, false);
        }
      });
      
      // Clear all timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      
      // Remove all channels
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user, conversationIds.join(','), isFocused, setTypingUser]); // Re-run when screen focus changes
}

