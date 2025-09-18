// =============================================
// EVENTS STORE
// =============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Event, EventFilters, CreateEventData, EventStats } from '@/types/events';

interface EventsState {
  // State
  events: Event[];
  userEvents: Event[];
  attendingEvents: Event[];
  createdEvents: Event[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  filters: EventFilters;
  stats: EventStats | null;
  
  // Actions
  fetchEvents: (filters?: EventFilters) => Promise<void>;
  fetchUserEvents: (userId: string, type?: 'created' | 'attending' | 'all') => Promise<void>;
  createEvent: (eventData: CreateEventData) => Promise<{ success: boolean; error?: string; event?: Event }>;
  updateEvent: (eventId: string, eventData: Partial<CreateEventData>) => Promise<{ success: boolean; error?: string }>;
  deleteEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  registerForEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  cancelEventRegistration: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  likeEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  unlikeEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  shareEvent: (eventId: string, platform?: string) => Promise<{ success: boolean; error?: string }>;
  refreshEvents: () => Promise<void>;
  setFilters: (filters: EventFilters) => void;
  clearError: () => void;
  fetchEventStats: (userId: string) => Promise<void>;
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      // Initial state
      events: [],
      userEvents: [],
      attendingEvents: [],
      createdEvents: [],
      loading: false,
      refreshing: false,
      error: null,
      filters: {
        limit: 20,
        offset: 0,
        status: 'active',
        visibility: 'public',
      },
      stats: null,

      // Fetch events with filters
      fetchEvents: async (filters?: EventFilters) => {
        try {
          set({ loading: true, error: null });
          
          const currentFilters = { ...get().filters, ...filters };
          set({ filters: currentFilters });

          const { data, error } = await supabase.rpc('get_events', {
            p_limit: currentFilters.limit || 20,
            p_offset: currentFilters.offset || 0,
            p_event_type: currentFilters.event_type || null,
            p_category: currentFilters.category || null,
            p_city: currentFilters.city || null,
            p_region: currentFilters.region || null,
            p_is_online: currentFilters.is_online || null,
            p_is_free: currentFilters.is_free || null,
            p_status: currentFilters.status || 'active',
            p_visibility: currentFilters.visibility || 'public',
          });

          if (error) throw error;

          set({ events: data || [] });
        } catch (error: any) {
          console.error('Error fetching events:', error);
          set({ error: error.message || 'Failed to fetch events' });
        } finally {
          set({ loading: false });
        }
      },

      // Fetch user's events
      fetchUserEvents: async (userId: string, type: 'created' | 'attending' | 'all' = 'all') => {
        try {
          set({ loading: true, error: null });

          const { data, error } = await supabase.rpc('get_user_events', {
            p_user_id: userId,
            p_event_type: type,
            p_status: 'active',
          });

          if (error) throw error;

          const events = data || [];
          
          if (type === 'created') {
            set({ createdEvents: events });
          } else if (type === 'attending') {
            set({ attendingEvents: events });
          } else {
            set({ userEvents: events });
          }
        } catch (error: any) {
          console.error('Error fetching user events:', error);
          set({ error: error.message || 'Failed to fetch user events' });
        } finally {
          set({ loading: false });
        }
      },

      // Create new event
      createEvent: async (eventData: CreateEventData) => {
        try {
          set({ loading: true, error: null });

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('events')
            .insert({
              ...eventData,
              organizer_id: user.id,
              current_attendees: 0,
            })
            .select()
            .single();

          if (error) throw error;

          // Add to local state
          const newEvent = {
            ...data,
            organizer_name: 'You', // Will be updated when fetched
            organizer_avatar: null,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
            is_attending: false,
          };

          set(state => ({
            events: [newEvent, ...state.events],
            createdEvents: [newEvent, ...state.createdEvents],
          }));

          return { success: true, event: newEvent };
        } catch (error: any) {
          console.error('Error creating event:', error);
          const errorMessage = error.message || 'Failed to create event';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        } finally {
          set({ loading: false });
        }
      },

      // Update event
      updateEvent: async (eventId: string, eventData: Partial<CreateEventData>) => {
        try {
          set({ loading: true, error: null });

          const { data, error } = await supabase
            .from('events')
            .update({
              ...eventData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', eventId)
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set(state => ({
            events: state.events.map(event => 
              event.id === eventId ? { ...event, ...data } : event
            ),
            createdEvents: state.createdEvents.map(event => 
              event.id === eventId ? { ...event, ...data } : event
            ),
          }));

          return { success: true };
        } catch (error: any) {
          console.error('Error updating event:', error);
          const errorMessage = error.message || 'Failed to update event';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        } finally {
          set({ loading: false });
        }
      },

      // Delete event
      deleteEvent: async (eventId: string) => {
        try {
          set({ loading: true, error: null });

          const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

          if (error) throw error;

          // Remove from local state
          set(state => ({
            events: state.events.filter(event => event.id !== eventId),
            createdEvents: state.createdEvents.filter(event => event.id !== eventId),
            attendingEvents: state.attendingEvents.filter(event => event.id !== eventId),
          }));

          return { success: true };
        } catch (error: any) {
          console.error('Error deleting event:', error);
          const errorMessage = error.message || 'Failed to delete event';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        } finally {
          set({ loading: false });
        }
      },

      // Register for event
      registerForEvent: async (eventId: string) => {
        try {
          set({ loading: true, error: null });

          const { data, error } = await supabase.rpc('register_for_event', {
            p_event_id: eventId,
          });

          if (error) throw error;

          if (!data.success) {
            throw new Error(data.error || 'Failed to register for event');
          }

          // Update local state
          set(state => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    is_attending: true, 
                    user_attendance_status: 'registered',
                    current_attendees: event.current_attendees + 1
                  } 
                : event
            ),
            attendingEvents: state.events.filter(event => event.id === eventId),
          }));

          return { success: true };
        } catch (error: any) {
          console.error('Error registering for event:', error);
          const errorMessage = error.message || 'Failed to register for event';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        } finally {
          set({ loading: false });
        }
      },

      // Cancel event registration
      cancelEventRegistration: async (eventId: string) => {
        try {
          set({ loading: true, error: null });

          const { data, error } = await supabase.rpc('cancel_event_registration', {
            p_event_id: eventId,
          });

          if (error) throw error;

          if (!data.success) {
            throw new Error(data.error || 'Failed to cancel registration');
          }

          // Update local state
          set(state => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { 
                    ...event, 
                    is_attending: false, 
                    user_attendance_status: 'cancelled',
                    current_attendees: Math.max(0, event.current_attendees - 1)
                  } 
                : event
            ),
            attendingEvents: state.attendingEvents.filter(event => event.id !== eventId),
          }));

          return { success: true };
        } catch (error: any) {
          console.error('Error cancelling event registration:', error);
          const errorMessage = error.message || 'Failed to cancel registration';
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        } finally {
          set({ loading: false });
        }
      },

      // Like event
      likeEvent: async (eventId: string) => {
        try {
          const { error } = await supabase
            .from('event_likes')
            .insert({ event_id: eventId });

          if (error) throw error;

          // Update local state
          set(state => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { ...event, likes_count: event.likes_count + 1 } 
                : event
            ),
          }));

          return { success: true };
        } catch (error: any) {
          console.error('Error liking event:', error);
          return { success: false, error: error.message };
        }
      },

      // Unlike event
      unlikeEvent: async (eventId: string) => {
        try {
          const { error } = await supabase
            .from('event_likes')
            .delete()
            .eq('event_id', eventId);

          if (error) throw error;

          // Update local state
          set(state => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { ...event, likes_count: Math.max(0, event.likes_count - 1) } 
                : event
            ),
          }));

          return { success: true };
        } catch (error: any) {
          console.error('Error unliking event:', error);
          return { success: false, error: error.message };
        }
      },

      // Share event
      shareEvent: async (eventId: string, platform?: string) => {
        try {
          const { error } = await supabase
            .from('event_shares')
            .insert({ event_id: eventId, platform });

          if (error) throw error;

          // Update local state
          set(state => ({
            events: state.events.map(event => 
              event.id === eventId 
                ? { ...event, shares_count: event.shares_count + 1 } 
                : event
            ),
          }));

          return { success: true };
        } catch (error: any) {
          console.error('Error sharing event:', error);
          return { success: false, error: error.message };
        }
      },

      // Refresh events
      refreshEvents: async () => {
        try {
          set({ refreshing: true, error: null });
          await get().fetchEvents();
        } catch (error: any) {
          console.error('Error refreshing events:', error);
          set({ error: error.message || 'Failed to refresh events' });
        } finally {
          set({ refreshing: false });
        }
      },

      // Set filters
      setFilters: (filters: EventFilters) => {
        set({ filters: { ...get().filters, ...filters } });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Fetch event stats
      fetchEventStats: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select(`
              id,
              status,
              start_date,
              current_attendees,
              organizer_id,
              event_attendees!inner(user_id)
            `)
            .or(`organizer_id.eq.${userId},event_attendees.user_id.eq.${userId}`);

          if (error) throw error;

          const now = new Date();
          const totalEvents = data.length;
          const upcomingEvents = data.filter(event => new Date(event.start_date) > now).length;
          const pastEvents = totalEvents - upcomingEvents;
          const eventsAttending = data.filter(event => 
            event.event_attendees.some((attendee: any) => attendee.user_id === userId)
          ).length;
          const eventsCreated = data.filter(event => event.organizer_id === userId).length;
          const totalAttendees = data.reduce((sum, event) => sum + event.current_attendees, 0);

          set({
            stats: {
              total_events: totalEvents,
              upcoming_events: upcomingEvents,
              past_events: pastEvents,
              events_attending: eventsAttending,
              events_created: eventsCreated,
              total_attendees: totalAttendees,
            }
          });
        } catch (error: any) {
          console.error('Error fetching event stats:', error);
        }
      },
    }),
    {
      name: 'events-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        filters: state.filters,
        stats: state.stats,
      }),
    }
  )
);
