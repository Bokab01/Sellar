import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { router } from 'expo-router';
import {
  Text,
  SafeAreaWrapper,
  AppHeader,
  Button,
  EmptyState,
  LoadingSkeleton,
} from '@/components';
import { Calendar, MapPin, Users, Clock, Plus } from 'lucide-react-native';

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees_count: number;
  max_attendees?: number;
  image?: string;
  organizer: {
    name: string;
    avatar?: string;
  };
  is_attending: boolean;
  category: 'meetup' | 'workshop' | 'sale' | 'networking' | 'other';
}

export default function CommunityEventsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'attending'>('upcoming');

  useEffect(() => {
    // Simulate loading and populate with sample events
    setTimeout(() => {
      setEvents([
        {
          id: '1',
          title: 'Weekend Marketplace',
          description: 'Join us for a weekend marketplace where local sellers showcase their best products. Great deals and networking opportunities!',
          date: '2024-02-15',
          time: '10:00 AM',
          location: 'Accra Mall, Accra',
          attendees_count: 45,
          max_attendees: 100,
          organizer: {
            name: 'Sellar Team',
            avatar: undefined,
          },
          is_attending: false,
          category: 'sale',
        },
        {
          id: '2',
          title: 'Digital Marketing Workshop',
          description: 'Learn how to effectively market your products online. Perfect for small business owners and entrepreneurs.',
          date: '2024-02-20',
          time: '2:00 PM',
          location: 'Tech Hub, Kumasi',
          attendees_count: 28,
          max_attendees: 50,
          organizer: {
            name: 'Marketing Experts GH',
            avatar: undefined,
          },
          is_attending: true,
          category: 'workshop',
        },
        {
          id: '3',
          title: 'Sellers Networking Meetup',
          description: 'Connect with other sellers, share experiences, and build valuable business relationships.',
          date: '2024-02-25',
          time: '6:00 PM',
          location: 'Community Center, Tema',
          attendees_count: 67,
          organizer: {
            name: 'Ghana Sellers Union',
            avatar: undefined,
          },
          is_attending: false,
          category: 'networking',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleAttendToggle = (eventId: string) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { 
            ...event, 
            is_attending: !event.is_attending,
            attendees_count: event.is_attending 
              ? event.attendees_count - 1 
              : event.attendees_count + 1
          }
        : event
    ));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'meetup': return theme.colors.primary;
      case 'workshop': return theme.colors.success;
      case 'sale': return theme.colors.warning;
      case 'networking': return theme.colors.info;
      default: return theme.colors.text.muted;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'meetup': return 'Meetup';
      case 'workshop': return 'Workshop';
      case 'sale': return 'Sale Event';
      case 'networking': return 'Networking';
      default: return 'Event';
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'attending') return event.is_attending;
    if (filter === 'upcoming') return new Date(event.date) >= new Date();
    return true;
  });

  return (
    <SafeAreaWrapper>
      <AppHeader
        title="Community Events"
        showBackButton
        onBackPress={() => router.back()}
        rightActions={[
          <Button
            key="create-event"
            variant="icon"
            icon={<Plus size={20} color={theme.colors.text.primary} />}
            onPress={() => {
              // TODO: Create event screen
              console.log('Create event - Coming soon!');
            }}
          />,
        ]}
      />

      <View style={{ flex: 1 }}>
        {/* Filter Tabs */}
        <View
          style={{
            flexDirection: 'row',
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'all', label: 'All Events' },
            { key: 'attending', label: 'Attending' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilter(tab.key as any)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.borderRadius.md,
                backgroundColor: filter === tab.key ? theme.colors.primary : 'transparent',
                marginHorizontal: theme.spacing.xs,
              }}
            >
              <Text
                variant="body"
                weight="medium"
                style={{
                  textAlign: 'center',
                  color: filter === tab.key ? '#FFF' : theme.colors.text.primary,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ScrollView
            contentContainerStyle={{
              padding: theme.spacing.lg,
            }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton
                key={index}
                width="100%"
                height={180}
                borderRadius={theme.borderRadius.lg}
                style={{ marginBottom: theme.spacing.lg }}
              />
            ))}
          </ScrollView>
        ) : filteredEvents.length > 0 ? (
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
            {filteredEvents.map((event) => (
              <View
                key={event.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.borderRadius.lg,
                  padding: theme.spacing.lg,
                  marginBottom: theme.spacing.lg,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                {/* Category Badge */}
                <View
                  style={{
                    position: 'absolute',
                    top: theme.spacing.md,
                    right: theme.spacing.md,
                    backgroundColor: getCategoryColor(event.category),
                    borderRadius: theme.borderRadius.sm,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xs,
                  }}
                >
                  <Text variant="caption" style={{ color: '#FFF', fontSize: 10 }}>
                    {getCategoryLabel(event.category)}
                  </Text>
                </View>

                {/* Event Title */}
                <Text variant="h4" weight="semibold" style={{ marginBottom: theme.spacing.sm, marginRight: 80 }}>
                  {event.title}
                </Text>

                {/* Event Description */}
                <Text variant="body" color="muted" style={{ marginBottom: theme.spacing.md }}>
                  {event.description}
                </Text>

                {/* Event Details */}
                <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Calendar size={16} color={theme.colors.text.muted} />
                    <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MapPin size={16} color={theme.colors.text.muted} />
                    <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
                      {event.location}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Users size={16} color={theme.colors.text.muted} />
                    <Text variant="body" style={{ marginLeft: theme.spacing.sm }}>
                      {event.attendees_count} attending
                      {event.max_attendees && ` • ${event.max_attendees - event.attendees_count} spots left`}
                    </Text>
                  </View>
                </View>

                {/* Organizer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                  <Text variant="caption" color="muted">
                    Organized by {event.organizer.name}
                  </Text>
                </View>

                {/* Action Button */}
                <Button
                  variant={event.is_attending ? "outline" : "primary"}
                  size="sm"
                  onPress={() => handleAttendToggle(event.id)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {event.is_attending ? 'Cancel Attendance' : 'Attend Event'}
                </Button>
              </View>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon={<Calendar size={64} color={theme.colors.text.muted} />}
            title={filter === 'attending' ? 'No Events Attending' : 'No Events Found'}
            description={
              filter === 'attending' 
                ? 'You haven\'t signed up for any events yet. Explore upcoming events!'
                : 'No community events scheduled at the moment. Check back soon!'
            }
            action={{
              text: filter === 'attending' ? 'Browse Events' : 'Create Event',
              onPress: () => {
                if (filter === 'attending') {
                  setFilter('upcoming');
                } else {
                  console.log('Create event - Coming soon!');
                }
              },
            }}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
