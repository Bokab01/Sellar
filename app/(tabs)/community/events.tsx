import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useEventsStore } from '@/store/useEventsStore';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  EmptyState,
  LoadingSkeleton,
  Button,
  SearchBar,
} from '@/components';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Filter, 
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Wifi,
  WifiOff
} from 'lucide-react-native';
import { Event, EventFilters } from '@/types/events';
import { EVENT_TYPES, EVENT_CATEGORIES, formatEventDuration, formatTicketPrice } from '@/constants/events';

export default function EventsScreen() {
  const { theme } = useTheme();
  const {
    events,
    loading,
    refreshing,
    error,
    filters,
    fetchEvents,
    refreshEvents,
    setFilters,
    clearError,
    registerForEvent,
    likeEvent,
    unlikeEvent,
    shareEvent,
  } = useEventsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: Partial<EventFilters>) => {
    setFilters(newFilters);
    fetchEvents({ ...filters, ...newFilters, offset: 0 });
  }, [filters, setFilters, fetchEvents]);

  // Handle event registration
  const handleRegisterForEvent = useCallback(async (event: Event) => {
    if (event.is_attending) {
      Alert.alert(
        'Cancel Registration',
        'Are you sure you want to cancel your registration for this event?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            style: 'destructive',
            onPress: async () => {
              const result = await registerForEvent(event.id);
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to cancel registration');
              }
            }
          }
        ]
      );
    } else {
      const result = await registerForEvent(event.id);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to register for event');
      }
    }
  }, [registerForEvent]);

  // Handle like event
  const handleLikeEvent = useCallback(async (event: Event) => {
    // TODO: Check if user has liked the event
    const result = await likeEvent(event.id);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to like event');
    }
  }, [likeEvent]);

  // Handle share event
  const handleShareEvent = useCallback(async (event: Event) => {
    const result = await shareEvent(event.id, 'copy_link');
    if (result.success) {
      Alert.alert('Success', 'Event link copied to clipboard');
    } else {
      Alert.alert('Error', result.error || 'Failed to share event');
    }
  }, [shareEvent]);

  // Navigate to event detail
  const navigateToEventDetail = useCallback((event: Event) => {
    router.push(`/(tabs)/community/events/${event.id}`);
  }, []);

  // Navigate to create event
  const navigateToCreateEvent = useCallback(() => {
    router.push('/(tabs)/community/events/create');
  }, []);

  // Get event type info
  const getEventTypeInfo = useCallback((type: string) => {
    return EVENT_TYPES.find(t => t.id === type);
  }, []);

  // Get event category info
  const getEventCategoryInfo = useCallback((category: string) => {
    return EVENT_CATEGORIES.find(c => c.id === category);
  }, []);

  // Format event date
  const formatEventDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Format event time
  const formatEventTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Check if event is upcoming
  const isEventUpcoming = useCallback((dateString: string) => {
    return new Date(dateString) > new Date();
  }, []);

  // Filter events based on search query
  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Events"
        showBackButton={false}
        rightActions={[
          <TouchableOpacity
            key="create-event"
            onPress={navigateToCreateEvent}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.borderRadius.full,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        ]}
      />

      <View style={{ flex: 1 }}>
        {/* Search and Filters */}
        <View style={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
          <SearchBar
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={{ marginBottom: theme.spacing.md }}
          />
          
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.borderRadius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Filter size={16} color={theme.colors.text.primary} />
              <Text variant="body" style={{ marginLeft: theme.spacing.xs }}>
                Filters
              </Text>
            </TouchableOpacity>

            {/* Quick filter buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                {['All', 'Online', 'Free', 'This Week', 'Near Me'].map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={{
                      backgroundColor: theme.colors.surface,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                      borderRadius: theme.borderRadius.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <Text variant="body">{filter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Events List */}
        {loading && !refreshing ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.lg,
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width="100%"
                height={200}
                borderRadius={theme.borderRadius.lg}
                style={{ marginBottom: theme.spacing.lg }}
              />
            ))}
          </ScrollView>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg }}>
            <Calendar size={64} color={theme.colors.text.muted} />
            <Text variant="h4" weight="semibold" style={{ marginTop: theme.spacing.md, textAlign: 'center' }}>
              Error Loading Events
            </Text>
            <Text variant="body" color="muted" style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              {error}
            </Text>
            <Button
              variant="primary"
              size="sm"
              style={{ marginTop: theme.spacing.lg }}
              onPress={() => {
                clearError();
                fetchEvents();
              }}
            >
              Try Again
            </Button>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg }}>
            <EmptyState
              icon={<Calendar size={64} color={theme.colors.text.muted} />}
              title="No Events Found"
              description={
                searchQuery 
                  ? "No events match your search criteria. Try adjusting your search or filters."
                  : "No events available at the moment. Be the first to create an event!"
              }
              action={{
                text: 'Create Event',
                onPress: navigateToCreateEvent,
              }}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {filteredEvents.map((event) => {
              const eventTypeInfo = getEventTypeInfo(event.event_type);
              const eventCategoryInfo = getEventCategoryInfo(event.category);
              const isUpcoming = isEventUpcoming(event.start_date);

              return (
                <TouchableOpacity
                  key={event.id}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
                    marginBottom: theme.spacing.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  onPress={() => navigateToEventDetail(event)}
                  activeOpacity={0.7}
                >
                  {/* Event Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing.xs }}>
                        {event.title}
                      </Text>
                      <Text variant="body" color="muted" numberOfLines={2}>
                        {event.description}
                      </Text>
                    </View>
                    
                    {/* Event Type Badge */}
                    {eventTypeInfo && (
                      <View
                        style={{
                          backgroundColor: eventTypeInfo.color + '20',
                          paddingHorizontal: theme.spacing.sm,
                          paddingVertical: theme.spacing.xs,
                          borderRadius: theme.borderRadius.sm,
                          marginLeft: theme.spacing.sm,
                        }}
                      >
                        <Text variant="caption" style={{ color: eventTypeInfo.color }}>
                          {eventTypeInfo.name}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Event Details */}
                  <View style={{ marginBottom: theme.spacing.md }}>
                    {/* Date and Time */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                      <Calendar size={16} color={theme.colors.text.muted} />
                      <Text variant="body" style={{ marginLeft: theme.spacing.xs }}>
                        {formatEventDate(event.start_date)} at {formatEventTime(event.start_date)}
                      </Text>
                    </View>

                    {/* Location */}
                    {event.is_online ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                        <Wifi size={16} color={theme.colors.primary} />
                        <Text variant="body" style={{ marginLeft: theme.spacing.xs, color: theme.colors.primary }}>
                          Online Event
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                        <MapPin size={16} color={theme.colors.text.muted} />
                        <Text variant="body" style={{ marginLeft: theme.spacing.xs }}>
                          {event.location_name || event.city || 'Location TBD'}
                        </Text>
                      </View>
                    )}

                    {/* Attendees */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
                      <Users size={16} color={theme.colors.text.muted} />
                      <Text variant="body" style={{ marginLeft: theme.spacing.xs }}>
                        {event.current_attendees} attending
                        {event.max_attendees && ` / ${event.max_attendees} max`}
                      </Text>
                    </View>

                    {/* Price */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="body" style={{ color: event.is_free ? theme.colors.success : theme.colors.text.primary }}>
                        {formatTicketPrice(event.ticket_price, event.currency)}
                      </Text>
                    </View>
                  </View>

                  {/* Event Actions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                      <TouchableOpacity
                        onPress={() => handleLikeEvent(event)}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Heart size={16} color={theme.colors.text.muted} />
                        <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                          {event.likes_count}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <MessageCircle size={16} color={theme.colors.text.muted} />
                        <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                          {event.comments_count}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleShareEvent(event)}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Share2 size={16} color={theme.colors.text.muted} />
                        <Text variant="caption" style={{ marginLeft: theme.spacing.xs }}>
                          {event.shares_count}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Register Button */}
                    {isUpcoming && (
                      <TouchableOpacity
                        onPress={() => handleRegisterForEvent(event)}
                        style={{
                          backgroundColor: event.is_attending ? theme.colors.error : theme.colors.primary,
                          paddingHorizontal: theme.spacing.md,
                          paddingVertical: theme.spacing.sm,
                          borderRadius: theme.borderRadius.md,
                        }}
                      >
                        <Text variant="body" style={{ color: '#FFF', fontWeight: '600' }}>
                          {event.is_attending ? 'Cancel' : 'Register'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaWrapper>
  );
}