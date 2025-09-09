import { useEffect, useRef } from 'react';
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

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    // Clean up existing channel first
    if (channelRef.current) {
      console.log(`🔗 Cleaning up existing real-time subscription for ${table}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Skip if table is not provided
    if (!table) {
      console.warn('🔗 No table provided for real-time subscription');
      return;
    }

    console.log(`🔗 Setting up real-time subscription for table: ${table}, filter: ${filter}`);
    
    try {
      // Create channel with unique name to avoid conflicts
      const channelName = `realtime-${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter && { filter }),
          },
          (payload) => {
            try {
              console.log(`🔗 Real-time event received for ${table}:`, payload.eventType, payload);
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
                default:
                  console.warn(`🔗 Unknown event type: ${payload.eventType}`);
              }
            } catch (err) {
              console.error(`🔗 Error handling real-time event for ${table}:`, err);
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔗 Real-time subscription status for ${table}:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`🔗 Successfully subscribed to ${table} real-time updates`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`🔗 Error subscribing to ${table} real-time updates`);
            // Attempt to reconnect after a delay
            setTimeout(() => {
              console.log(`🔗 Attempting to reconnect to ${table} real-time updates...`);
              if (channelRef.current) {
                try {
                  supabase.removeChannel(channelRef.current);
                  channelRef.current = null;
                } catch (err) {
                  console.error(`🔗 Error removing failed channel:`, err);
                }
              }
            }, 5000);
          } else if (status === 'TIMED_OUT') {
            console.error(`🔗 Real-time subscription timed out for ${table}`);
          } else if (status === 'CLOSED') {
            console.log(`🔗 Real-time subscription closed for ${table}`);
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.error(`🔗 Failed to set up real-time subscription for ${table}:`, err);
    }

    return () => {
      console.log(`🔗 Cleaning up real-time subscription for ${table}`);
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (err) {
          console.error(`🔗 Error removing channel for ${table}:`, err);
        }
        channelRef.current = null;
      }
    };
  }, [table, filter]); // Only depend on table and filter, not callbacks

  return channelRef.current;
}

// Specific hooks for different features
export function useChatRealtime(conversationId: string, onNewMessage: (message: any) => void) {
  console.log('🔗 Setting up chat real-time for conversation:', conversationId);
  return useRealtime({
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
    onInsert: (payload) => {
      console.log('🔗 Real-time message insert received:', payload);
      onNewMessage(payload);
    },
    onUpdate: (payload) => {
      console.log('🔗 Real-time message update received:', payload);
      onNewMessage(payload); // Handle read receipts and status updates
    },
  });
}

export function useListingsRealtime(onListingUpdate: (listing: any) => void) {
  console.log('🔗 Setting up listings real-time subscription');
  return useRealtime({
    table: 'listings',
    // Remove the filter to listen to all changes, then filter in the callback
    onInsert: async (payload) => {
      console.log('🔗 Real-time listing insert:', payload);
      
      // Only process active listings
      if (payload.status !== 'active') {
        console.log('🔗 Skipping non-active listing:', payload.status);
        return;
      }
      
      // Fetch the complete listing data with joins for new listings
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            *,
            profiles(*),
            categories(*)
          `)
          .eq('id', payload.id)
          .eq('status', 'active') // Ensure we only get active listings
          .single();
        
        if (!error && data) {
          console.log('🔗 Fetched complete listing data:', data);
          onListingUpdate(data);
        } else {
          console.warn('🔗 Failed to fetch complete listing data:', error);
          // Only fallback if the listing is active
          if (payload.status === 'active') {
            onListingUpdate(payload);
          }
        }
      } catch (err) {
        console.error('🔗 Error fetching listing data:', err);
        // Only fallback if the listing is active
        if (payload.status === 'active') {
          onListingUpdate(payload);
        }
      }
    },
    onUpdate: async (payload) => {
      console.log('🔗 Real-time listing update:', payload);
      
      // Process both active and inactive listings (for removal)
      try {
        if (payload.status === 'active') {
          // Fetch complete data for active listings
          const { data, error } = await supabase
            .from('listings')
            .select(`
              *,
              profiles(*),
              categories(*)
            `)
            .eq('id', payload.id)
            .eq('status', 'active')
            .single();
          
          if (!error && data) {
            console.log('🔗 Fetched updated listing data:', data);
            onListingUpdate(data);
          } else {
            console.warn('🔗 Failed to fetch updated listing data:', error);
            onListingUpdate(payload);
          }
        } else {
          // For inactive listings, pass the payload to allow removal from UI
          console.log('🔗 Listing became inactive, removing from UI:', payload.id);
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
  return useRealtime({
    table: 'posts',
    onInsert: async (payload) => {
      console.log('🔗 Real-time post insert:', payload);
      // Fetch the complete post data with joins for new posts
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles(*),
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
            profiles(*),
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
  });
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