import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
      console.log(`🔗 Channel already exists for ${tableRef.current}, skipping setup`);
      return;
    }

    const currentTable = tableRef.current;
    const currentFilter = filterRef.current;

    try {
      // Create channel with unique name to avoid conflicts
      const channelName = `realtime-${currentTable}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🔗 Creating new channel: ${channelName}`, currentFilter ? `with filter: ${currentFilter}` : 'no filter');
      
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
            console.log(`🔗 ${currentTable} event received:`, payload.eventType, payload);
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
              console.error(`🔗 Error processing ${currentTable} event:`, err);
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔗 Channel ${channelName} status:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Successfully subscribed to ${currentTable} changes`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Channel error for ${currentTable}, scheduling reconnection`);
            // Schedule reconnection
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectChannel();
            }, 5000);
          } else if (status === 'TIMED_OUT') {
            console.error(`⏱️ Channel timeout for ${currentTable}, scheduling reconnection`);
            // Schedule reconnection
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectChannel();
            }, 5000);
          } else if (status === 'CLOSED') {
            console.warn(`🔒 Channel closed for ${currentTable}`);
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
    
    console.log(`🔗 Reconnecting channel for ${tableRef.current}`);
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
      console.error(`🔗 Reconnection failed for ${tableRef.current}:`, error);
      
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
      console.log('🔗 No table provided, skipping setup');
      return;
    }

    console.log(`🔗 Initializing realtime for table: ${table}`);
    setupChannel();

    return () => {
      console.log(`🔗 Cleaning up realtime for table: ${table}`);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (channelRef.current) {
        try {
          console.log(`🔗 Removing channel for ${table}`);
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          console.error(`🔗 Error removing channel for ${table}:`, err);
        }
        channelRef.current = null;
      }
    };
  }, [table, filter]); // Removed setupChannel from dependencies to prevent re-subscription

  // App state handling for reconnection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log(`🔗 App became active, checking channel state for ${tableRef.current}`);
        // Check if channel is still active
        if (channelRef.current) {
          const status = channelRef.current.state;
          console.log(`🔗 Current channel state: ${status}`);
          
          if (status === 'closed' || status === 'errored') {
            console.log(`🔗 Channel is ${status}, reconnecting...`);
            reconnectChannel();
          }
        } else {
          console.log('🔗 No active channel, setting up new one...');
          setupChannel();
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [reconnectChannel, setupChannel]); // Only depend on stable functions

  return channelRef.current;
}

// Specific hooks for different features
export function useChatRealtime(conversationId: string, onNewMessage: (message: any) => void) {
  console.log('🔗 Setting up chat real-time for conversation:', conversationId);
  return useRealtime({
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
    onInsert: async (payload) => {
      console.log('🔗 Real-time message insert received:', payload);
      
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
          console.log('🔗 Fetched complete message data:', data);
          onNewMessage(data);
        } else {
          console.warn('🔗 Failed to fetch complete message data:', error);
          // Fallback to the raw payload if fetch fails
          onNewMessage(payload);
        }
      } catch (err) {
        console.error('🔗 Error fetching message data:', err);
        // Fallback to the raw payload if fetch fails
        onNewMessage(payload);
      }
    },
    onUpdate: async (payload) => {
      console.log('🔗 Real-time message update received:', payload);
      
      // Fetch the complete message data for updates as well (for read receipts, status changes, etc.)
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
          console.log('🔗 Fetched updated message data:', data);
          onNewMessage(data);
        } else {
          console.warn('🔗 Failed to fetch updated message data:', error);
          // Fallback to the raw payload if fetch fails
          onNewMessage(payload);
        }
      } catch (err) {
        console.error('🔗 Error fetching updated message data:', err);
        // Fallback to the raw payload if fetch fails
        onNewMessage(payload);
      }
    },
  });
}

export function useConversationsRealtime(userId: string, onConversationUpdate: () => void) {
  console.log('🔗 Setting up conversations real-time for user:', userId);
  
  // Set up messages subscription to detect new messages in any conversation
  const messagesSubscription = useRealtime({
    table: 'messages',
    // Listen for messages where user is participant
    onInsert: async (payload) => {
      console.log('🔗 Real-time new message in conversations:', payload);
      // Trigger conversation list refresh
      onConversationUpdate();
    },
    onUpdate: async (payload) => {
      console.log('🔗 Real-time message update in conversations:', payload);
      // Trigger conversation list refresh (for read status updates)
      onConversationUpdate();
    },
  });

  // Set up conversations subscription to detect conversation changes
  const conversationsSubscription = useRealtime({
    table: 'conversations',
    filter: `participant1_id=eq.${userId},participant2_id=eq.${userId}`,
    onInsert: async (payload) => {
      console.log('🔗 Real-time new conversation:', payload);
      onConversationUpdate();
    },
    onUpdate: async (payload) => {
      console.log('🔗 Real-time conversation update:', payload);
      onConversationUpdate();
    },
    onDelete: async (payload) => {
      console.log('🔗 Real-time conversation delete:', payload);
      onConversationUpdate();
    },
  });

  return { messagesSubscription, conversationsSubscription };
}

export function useListingsRealtime(onListingUpdate: (listing: any) => void) {
  console.log('🔗 Setting up listings real-time subscription');
  return useRealtime({
    table: 'listings',
    // Remove the filter to listen to all changes, then filter in the callback
    onInsert: async (payload) => {
      console.log('🔗 Real-time listing insert:', payload);
      
      // Only process active and reserved listings
      if (payload.status !== 'active' && payload.status !== 'reserved') {
        console.log('🔗 Skipping non-active/reserved listing:', payload.status);
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
          console.log('🔗 Fetched complete listing data:', data);
          onListingUpdate(data);
        } else {
          console.warn('🔗 Failed to fetch complete listing data:', error);
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
      console.log('🔗 Real-time listing update:', payload);
      
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
            console.log('🔗 Fetched updated listing data:', data);
            onListingUpdate(data);
          } else {
            console.warn('🔗 Failed to fetch updated listing data:', error);
            onListingUpdate(payload);
          }
        } else {
          // For inactive listings (sold, suspended, etc.), remove from UI
          console.log('🔗 Listing became inactive, removing from UI:', payload.id, payload.status);
          onListingUpdate({ ...payload, _shouldRemove: true });
        }
      } catch (err) {
        console.error('🔗 Error fetching updated listing data:', err);
        onListingUpdate(payload);
      }
    },
    onDelete: (payload) => {
      console.log('🔗 Real-time listing delete:', payload);
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
      console.log('🔗 Real-time post insert:', payload);
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
          console.log('🔗 Fetched complete post data:', data);
          onPostUpdate(data);
        } else {
          console.warn('🔗 Failed to fetch complete post data:', error);
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
      console.log('🔗 Real-time post update:', payload);
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
          console.log('🔗 Fetched updated post data:', data);
          onPostUpdate(data);
        } else {
          console.warn('🔗 Failed to fetch updated post data:', error);
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
      console.log('🔗 Real-time post delete:', payload);
      // For deletes, we just need to remove the post from the UI
      // The payload.old contains the deleted post data
      onPostUpdate({ ...payload, _deleted: true });
    }
  });

  // Set up comments subscription to catch comment count changes
  const commentsSubscription = useRealtime({
    table: 'comments',
    onInsert: async (payload) => {
      console.log('🔗 Real-time comment insert for community feed:', payload);
      // When a comment is added, refresh the affected post to get updated counts
      if (payload.post_id) {
        try {
          console.log('🔗 Fetching updated post data for post_id:', payload.post_id);
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
            console.log('🔗 Fetched post with updated comment count:', {
              postId: data.id,
              newCount: data.comments_count
            });
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
      console.log('🔗 Real-time comment delete:', payload);
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
            console.log('🔗 Fetched post with updated comment count after deletion:', data);
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
      console.log('🔗 Real-time like insert:', payload);
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
            console.log('🔗 Fetched post with updated like count:', data);
            onPostUpdate(data);
          }
        } catch (err) {
          console.error('🔗 Error fetching post after like:', err);
        }
      }
    },
    onDelete: async (payload) => {
      console.log('🔗 Real-time like delete:', payload);
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
            console.log('🔗 Fetched post with updated like count after unlike:', data);
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
  console.log('🔗 Setting up offers real-time subscription for conversation:', conversationId);
  return useRealtime({
    table: 'offers',
    filter: `conversation_id=eq.${conversationId}`,
    onInsert: (payload) => {
      console.log('🔗 Real-time offer insert:', payload);
      onOfferUpdate(payload);
    },
    onUpdate: (payload) => {
      console.log('🔗 Real-time offer update:', payload);
      onOfferUpdate(payload);
    },
    onDelete: (payload) => {
      console.log('🔗 Real-time offer delete:', payload);
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