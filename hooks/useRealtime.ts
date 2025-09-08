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

    console.log(`🔗 Setting up real-time subscription for table: ${table}, filter: ${filter}`);
    
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
          filter,
        },
        (payload) => {
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
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔗 Real-time subscription status for ${table}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log(`🔗 Successfully subscribed to ${table} real-time updates`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`🔗 Error subscribing to ${table} real-time updates`);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log(`🔗 Cleaning up real-time subscription for ${table}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
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
  });
}

export function useListingsRealtime(onListingUpdate: (listing: any) => void) {
  return useRealtime({
    table: 'listings',
    filter: 'status=eq.active',
    onInsert: async (payload) => {
      // Fetch the complete listing data with joins for new listings
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            *,
            profiles!listings_user_id_fkey(*),
            categories!listings_category_id_fkey(*)
          `)
          .eq('id', payload.id)
          .single();
        
        if (!error && data) {
          onListingUpdate(data);
        } else {
          // Fallback to the raw payload if fetch fails
          onListingUpdate(payload);
        }
      } catch (err) {
        // Fallback to the raw payload if fetch fails
        onListingUpdate(payload);
      }
    },
    onUpdate: async (payload) => {
      // Fetch the complete listing data with joins for updated listings
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            *,
            profiles!listings_user_id_fkey(*),
            categories!listings_category_id_fkey(*)
          `)
          .eq('id', payload.id)
          .single();
        
        if (!error && data) {
          onListingUpdate(data);
        } else {
          // Fallback to the raw payload if fetch fails
          onListingUpdate(payload);
        }
      } catch (err) {
        // Fallback to the raw payload if fetch fails
        onListingUpdate(payload);
      }
    },
  });
}

export function useCommunityRealtime(onPostUpdate: (post: any) => void) {
  return useRealtime({
    table: 'posts',
    onInsert: async (payload) => {
      // Fetch the complete post data with joins for new posts
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles!posts_user_id_fkey(*),
            listings!posts_listing_id_fkey(*)
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
            listings!posts_listing_id_fkey(*)
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
        // Fallback to the raw payload if fetch fails
        onPostUpdate(payload);
      }
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