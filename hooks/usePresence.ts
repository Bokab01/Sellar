import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
    typing_in?: string; // conversation_id if typing
  }[];
}

export function usePresence() {
  const { user } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState() as PresenceState;
        const users = Object.keys(newState);
        setOnlineUsers(users);

        // Update typing indicators
        const typing: Record<string, string[]> = {};
        Object.entries(newState).forEach(([userId, presences]) => {
          presences.forEach(presence => {
            if (presence.typing_in) {
              if (!typing[presence.typing_in]) {
                typing[presence.typing_in] = [];
              }
              typing[presence.typing_in].push(userId);
            }
          });
        });
        setTypingUsers(typing);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User came online:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User went offline:', key);
      })
      .subscribe(async (status) => {
        console.log('🟢 [usePresence] Channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });

          console.log('🟢 [usePresence] Updating profile to online for user:', user.id);
          
          // Update database online status with timeout protection
          const updatePromise = supabase
            .from('profiles')
            .update({ 
              is_online: true, 
              last_seen: new Date().toISOString() 
            })
            .eq('id', user.id);
          
          const timeoutPromise = new Promise<{ error: any }>((resolve) => 
            setTimeout(() => resolve({ error: { message: 'Presence update timeout' } }), 3000)
          );
          
          const { error } = await Promise.race([updatePromise, timeoutPromise]);
          
          if (error) {
            console.warn('🟢 [usePresence] Error updating online status (non-critical):', error.message);
          } else {
            console.log('🟢 [usePresence] Successfully updated to online');
          }
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        console.log('🟢 [usePresence] Cleaning up, setting user offline:', user.id);
        
        // Update offline status
        supabase
          .from('profiles')
          .update({ 
            is_online: false, 
            last_seen: new Date().toISOString() 
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) {
              console.error('🟢 [usePresence] Error updating offline status:', error);
            } else {
              console.log('🟢 [usePresence] Successfully updated to offline');
            }
          });

        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  const setTypingStatus = async (conversationId: string, isTyping: boolean) => {
    if (!channelRef.current || !user) return;

    try {
      await channelRef.current.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        typing_in: isTyping ? conversationId : undefined,
      });
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.includes(userId);
  };

  const getTypingUsers = (conversationId: string) => {
    return typingUsers[conversationId] || [];
  };

  return {
    onlineUsers,
    typingUsers,
    setTypingStatus,
    isUserOnline,
    getTypingUsers,
  };
}