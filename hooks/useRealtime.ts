import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useBlockStore } from '@/store/useBlockStore';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReconnectingRef = useRef(false);
  const tableRef = useRef(table);
  const filterRef = useRef(filter);

  // Update refs when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
    tableRef.current = table;
    filterRef.current = filter;
  }, [onInsert, onUpdate, onDelete, table, filter]);

  // Setup channel function - stable, doesn't depend on changing values
  const setupChannel = useCallback(async () => {
    if (channelRef.current) {
      return;
    }

    const currentTable = tableRef.current;
    const currentFilter = filterRef.current;

    try {
      // Create channel with unique name to avoid conflicts
      const channelName = `realtime-${currentTable}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: currentTable,
            ...(currentFilter && { filter: currentFilter }),
          },
          (payload) => {
            try {
              switch (payload.eventType) {
                case 'INSERT':
                  callbacksRef.current.onInsert?.(payload.new);
                  break;
                case 'UPDATE':
                  callbacksRef.current.onUpdate?.(payload.new);
                  break;
                case 'DELETE':
                  callbacksRef.current.onDelete?.(payload.old);
                  break;
              }
            } catch (err) {
              console.error(`❌ Error processing ${currentTable} event:`, err);
            }
          }
        )
        .subscribe((status) => {
          // Only reconnect on actual errors, not on CLOSED (which is normal cleanup)
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectChannel();
            }, 5000);
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error(`🔗 Error setting up ${currentTable} channel:`, err);
    }
  }, []); // Empty dependencies - stable function

  // Reconnection function - also stable
  const reconnectChannel = useCallback(async () => {
    if (isReconnectingRef.current) return;
    
    isReconnectingRef.current = true;
    
    try {
      // Clean up existing channel
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recreate the subscription
      await setupChannel();
    } catch (error) {
      console.error(`❌ Reconnection failed for ${tableRef.current}:`, error);
      
      // Schedule another reconnection attempt
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        isReconnectingRef.current = false;
        reconnectChannel();
      }, 5000);
    } finally {
      isReconnectingRef.current = false;
    }
  }, [setupChannel]); // Only depends on stable setupChannel

  // Initial setup
  useEffect(() => {
    if (!table) {
      return;
    }

    setupChannel();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          console.error(`❌ Error removing channel for ${table}:`, err);
        }
        channelRef.current = null;
      }
    };
  }, [table, filter]); // Removed setupChannel from dependencies to prevent re-subscription

  // App state handling for reconnection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // Add a small delay to allow useAppResume to finish channel cleanup
        setTimeout(() => {
          // Check if channel is still active
          if (channelRef.current) {
            const status = channelRef.current.state;
            
            if (status === 'closed' || status === 'errored') {
              reconnectChannel();
            }
          } else {
            setupChannel();
          }
        }, 1500); // Wait 1.5 seconds for useAppResume to finish
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [reconnectChannel, setupChannel]); // Only depend on stable functions

  // Periodic health check - DISABLED to prevent unnecessary reconnections
  // Channels will naturally reconnect on app resume via AppState listener
  // useEffect(() => {
  //   const healthCheckInterval = setInterval(() => {
  //     // Only check if we expect to have a channel
  //     if (tableRef.current && !channelRef.current) {
  //       setupChannel();
  //     } else if (channelRef.current) {
  //       const status = channelRef.current.state;
  //       if (status === 'closed' || status === 'errored') {
  //         reconnectChannel();
  //       }
  //     }
  //   }, 5000); // Check every 5 seconds

  //   return () => {
  //     clearInterval(healthCheckInterval);
  //   };
  // }, [setupChannel, reconnectChannel]);

  return channelRef.current;
}

// Specific hooks for different features
export function useChatRealtime(conversationId: string, onNewMessage: (message: any) => void) {
  return useRealtime({
    table: conversationId ? 'messages' : '', // Only subscribe if we have a conversation ID
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    onInsert: async (payload) => {
      // Edge Case: Block messages from blocked users
      // Get latest blockedUserIds from store (avoid stale closure)
      const { blockedUserIds } = useBlockStore.getState();
      
      console.log('🔍 [useChatRealtime] New message received:', {
        messageId: payload.id,
        senderId: payload.sender_id,
        blockedUserIds: Array.from(blockedUserIds),
        isBlocked: blockedUserIds.has(payload.sender_id),
      });
      
      if (blockedUserIds.has(payload.sender_id)) {
        console.log('🚫 [useChatRealtime] BLOCKED message from blocked user:', payload.sender_id);
        return; // Don't process messages from blocked users
      }
      
      // Fetch the complete message data with joins to ensure we have all related data
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(*),
            offers(*)
          `)
          .eq('id', payload.id)
          .single();
        
        if (!error && data) {
          // Double-check sender isn't blocked (get latest state again)
          const { blockedUserIds: latestBlockedIds } = useBlockStore.getState();
          if (latestBlockedIds.has(data.sender_id)) {
            console.log('🚫 Blocked message from blocked user (post-fetch):', data.sender_id);
            return;
          }
          onNewMessage(data);
        } else {
          // Fallback to the raw payload if fetch fails
          onNewMessage(payload);
        }
      } catch (err) {
        console.error('❌ Error fetching message data:', err);
        // Fallback to the raw payload if fetch fails
        onNewMessage(payload);
      }
    },
    onUpdate: async (payload) => {
      // Fetch the complete message data for updates as well (for read receipts, status changes, etc.)
      try {
        const { data, error} = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(*),
            offers(*)
          `)
          .eq('id', payload.id)
          .single();
        
        if (!error && data) {
          onNewMessage(data);
        } else {
          // Fallback to the raw payload if fetch fails
          onNewMessage(payload);
        }
      } catch (err) {
        console.error('❌ Error fetching updated message data:', err);
        // Fallback to the raw payload if fetch fails
        onNewMessage(payload);
      }
    },
  });
}

export function useConversationsRealtime(userId: string, onConversationUpdate: () => void) {
  // Set up messages subscription to detect new messages in any conversation
  // Only subscribe if we have a valid userId
  const messagesSubscription = useRealtime({
    table: userId ? 'messages' : '', // Empty table prevents subscription
    // Listen for messages where user is participant
    onInsert: async (payload) => {
      // Trigger conversation list refresh
      onConversationUpdate();
    },
    onUpdate: async (payload) => {
      // Trigger conversation list refresh (for read status updates)
      onConversationUpdate();
    },
  });

  // Set up conversations subscription to detect conversation changes
  // Only subscribe if we have a valid userId
  const conversationsSubscription = useRealtime({
    table: userId ? 'conversations' : '', // Empty table prevents subscription
    filter: userId ? `participant1_id=eq.${userId},participant2_id=eq.${userId}` : undefined,
    onInsert: async (payload) => {
      onConversationUpdate();
    },
    onUpdate: async (payload) => {
      onConversationUpdate();
    },
    onDelete: async (payload) => {
      onConversationUpdate();
    },
  });

  return { messagesSubscription, conversationsSubscription };
}

export function useListingsRealtime(onListingUpdate: (listing: any) => void) {

  return useRealtime({
    table: 'listings',
    // Remove the filter to listen to all changes, then filter in the callback
    onInsert: async (payload) => {
    
      
      // Only process active and reserved listings
      if (payload.status !== 'active' && payload.status !== 'reserved') {
      
        return;
      }
      
      // Fetch the complete listing data with joins for new listings
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            *,
            profiles!posts_user_id_fkey(*),
            categories(*)
          `)
          .eq('id', payload.id)
          .in('status', ['active', 'reserved']) // Get active and reserved listings
          .single();
        
        if (!error && data) {
        
          onListingUpdate(data);
        } else {
        
          // Fallback if the listing is active or reserved
          if (payload.status === 'active' || payload.status === 'reserved') {
            onListingUpdate(payload);
          }
        }
      } catch (err) {
        console.error('🔗 Error fetching listing data:', err);
        // Fallback if the listing is active or reserved
        if (payload.status === 'active' || payload.status === 'reserved') {
          onListingUpdate(payload);
        }
      }
    },
    onUpdate: async (payload) => {
    
      
      // Process active, reserved, and inactive listings (for removal)
      try {
        if (payload.status === 'active' || payload.status === 'reserved') {
          // Fetch complete data for active and reserved listings
          const { data, error } = await supabase
            .from('listings')
            .select(`
              *,
              profiles!posts_user_id_fkey(*),
              categories(*)
            `)
            .eq('id', payload.id)
            .in('status', ['active', 'reserved'])
            .single();
          
          if (!error && data) {
          
            onListingUpdate(data);
          } else {
          
            onListingUpdate(payload);
          }
        } else {
          // For inactive listings (sold, suspended, etc.), remove from UI
        
          onListingUpdate({ ...payload, _shouldRemove: true });
        }
      } catch (err) {
        console.error('🔗 Error fetching updated listing data:', err);
        onListingUpdate(payload);
      }
    },
    onDelete: (payload) => {
    
      // Pass delete event to allow removal from UI
      onListingUpdate({ ...payload, _shouldRemove: true });
    },
  });
}

export function useCommunityRealtime(onPostUpdate: (post: any) => void) {
  // Set up posts subscription
  const postsSubscription = useRealtime({
    table: 'posts',
    onInsert: async (payload) => {
    
      // Fetch the complete post data with joins for new posts
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles!posts_user_id_fkey(*),
            listings(*)
          `)
          .eq('id', payload.id)
          .single();
        
        if (!error && data) {
        
          onPostUpdate(data);
        } else {
        
          // Fallback to the raw payload if fetch fails
          onPostUpdate(payload);
        }
      } catch (err) {
        console.error('🔗 Error fetching post data:', err);
        // Fallback to the raw payload if fetch fails
        onPostUpdate(payload);
      }
    },
    onUpdate: async (payload) => {
    
      // Fetch the complete post data with joins for updated posts
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles!posts_user_id_fkey(*),
            listings(*)
          `)
          .eq('id', payload.id)
          .single();
        
        if (!error && data) {
        
          onPostUpdate(data);
        } else {
        
          // Fallback to the raw payload if fetch fails
          onPostUpdate(payload);
        }
      } catch (err) {
        console.error('🔗 Error fetching updated post data:', err);
        // Fallback to the raw payload if fetch fails
        onPostUpdate(payload);
      }
    },
    onDelete: (payload) => {
    
      // For deletes, we just need to remove the post from the UI
      // The payload.old contains the deleted post data
      onPostUpdate({ ...payload, _deleted: true });
    }
  });

  // Set up comments subscription to catch comment count changes
  const commentsSubscription = useRealtime({
    table: 'comments',
    onInsert: async (payload) => {
    
      // When a comment is added, refresh the affected post to get updated counts
      if (payload.post_id) {
        try {
        
          const { data, error } = await supabase
            .from('posts')
            .select(`
              *,
              profiles!posts_user_id_fkey(*),
              listings(*)
            `)
            .eq('id', payload.post_id)
            .single();
          
          if (!error && data) {
            onPostUpdate(data);
          } else {
            console.error('🔗 Error fetching post after comment:', error);
          }
        } catch (err) {
          console.error('🔗 Exception fetching post after comment:', err);
        }
      }
    },
    onDelete: async (payload) => {
    
      // When a comment is deleted, refresh the affected post to get updated counts
      if (payload.post_id) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .select(`
              *,
              profiles!posts_user_id_fkey(*),
              listings(*)
            `)
            .eq('id', payload.post_id)
            .single();
          
          if (!error && data) {
          
            onPostUpdate(data);
          }
        } catch (err) {
          console.error('🔗 Error fetching post after comment deletion:', err);
        }
      }
    }
  });

  // Set up likes subscription to catch like count changes
  const likesSubscription = useRealtime({
    table: 'likes',
    onInsert: async (payload) => {
    
      // When a like is added, refresh the affected post to get updated counts
      if (payload.post_id) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .select(`
              *,
              profiles!posts_user_id_fkey(*),
              listings(*)
            `)
            .eq('id', payload.post_id)
            .single();
          
          if (!error && data) {
          
            onPostUpdate(data);
          }
        } catch (err) {
          console.error('🔗 Error fetching post after like:', err);
        }
      }
    },
    onDelete: async (payload) => {
    
      // When a like is removed, refresh the affected post to get updated counts
      if (payload.post_id) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .select(`
              *,
              profiles!posts_user_id_fkey(*),
              listings(*)
            `)
            .eq('id', payload.post_id)
            .single();
          
          if (!error && data) {
          
            onPostUpdate(data);
          }
        } catch (err) {
          console.error('🔗 Error fetching post after unlike:', err);
        }
      }
    }
  });

  return { postsSubscription, commentsSubscription, likesSubscription };
}

export function useOffersRealtime(conversationId: string, onOfferUpdate: (offer: any) => void) {

  return useRealtime({
    table: 'offers',
    filter: `conversation_id=eq.${conversationId}`,
    onInsert: (payload) => {
    
      onOfferUpdate(payload);
    },
    onUpdate: (payload) => {
    
      onOfferUpdate(payload);
    },
    onDelete: (payload) => {
    
      onOfferUpdate({ ...payload, _deleted: true });
    },
  });
}

export function usePresenceRealtime(userId: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        // Handle presence updates
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User came online
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // User went offline
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId]);

  return channelRef.current;
}
