// =============================================
// COMMUNITY EVENTS CONSTANTS
// =============================================

import { EventTypeInfo, EventCategoryInfo } from '@/types/events';

// Event types with metadata
export const EVENT_TYPES: EventTypeInfo[] = [
  {
    id: 'general',
    name: 'General Event',
    description: 'General community events and gatherings',
    icon: 'calendar',
    color: '#6366F1',
    default_duration: 2,
    typical_attendees: 50,
  },
  {
    id: 'meetup',
    name: 'Meetup',
    description: 'Networking and professional meetups',
    icon: 'users',
    color: '#10B981',
    default_duration: 2,
    typical_attendees: 30,
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Educational workshops and training sessions',
    icon: 'book-open',
    color: '#F59E0B',
    default_duration: 3,
    typical_attendees: 25,
  },
  {
    id: 'social',
    name: 'Social Event',
    description: 'Social gatherings and entertainment events',
    icon: 'party-popper',
    color: '#EC4899',
    default_duration: 4,
    typical_attendees: 100,
  },
  {
    id: 'business',
    name: 'Business Event',
    description: 'Business conferences and corporate events',
    icon: 'briefcase',
    color: '#8B5CF6',
    default_duration: 6,
    typical_attendees: 200,
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Educational seminars and learning events',
    icon: 'graduation-cap',
    color: '#06B6D4',
    default_duration: 2,
    typical_attendees: 40,
  },
];

// Event categories with metadata
export const EVENT_CATEGORIES: EventCategoryInfo[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General events and activities',
    icon: 'calendar',
    color: '#6B7280',
    popular_tags: ['community', 'general', 'local'],
  },
  {
    id: 'electronics',
    name: 'Electronics & Tech',
    description: 'Technology, gadgets, and electronics events',
    icon: 'smartphone',
    color: '#3B82F6',
    popular_tags: ['tech', 'electronics', 'gadgets', 'innovation', 'startup'],
  },
  {
    id: 'fashion',
    name: 'Fashion & Beauty',
    description: 'Fashion shows, beauty events, and style workshops',
    icon: 'shirt',
    color: '#EC4899',
    popular_tags: ['fashion', 'beauty', 'style', 'design', 'runway'],
  },
  {
    id: 'home',
    name: 'Home & Garden',
    description: 'Home improvement, gardening, and interior design',
    icon: 'home',
    color: '#10B981',
    popular_tags: ['home', 'garden', 'interior', 'decor', 'diy'],
  },
  {
    id: 'automotive',
    name: 'Automotive',
    description: 'Car shows, automotive events, and vehicle exhibitions',
    icon: 'car',
    color: '#F59E0B',
    popular_tags: ['cars', 'automotive', 'vehicles', 'motor', 'racing'],
  },
  {
    id: 'food',
    name: 'Food & Dining',
    description: 'Food festivals, cooking classes, and culinary events',
    icon: 'utensils',
    color: '#EF4444',
    popular_tags: ['food', 'cooking', 'restaurant', 'culinary', 'taste'],
  },
  {
    id: 'sports',
    name: 'Sports & Fitness',
    description: 'Sports events, fitness classes, and athletic competitions',
    icon: 'dumbbell',
    color: '#22C55E',
    popular_tags: ['sports', 'fitness', 'gym', 'athletic', 'health'],
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Educational seminars, courses, and learning events',
    icon: 'book-open',
    color: '#8B5CF6',
    popular_tags: ['education', 'learning', 'course', 'seminar', 'training'],
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Business conferences, networking, and professional events',
    icon: 'briefcase',
    color: '#6366F1',
    popular_tags: ['business', 'networking', 'conference', 'professional', 'entrepreneur'],
  },
];

// Popular event tags
export const POPULAR_EVENT_TAGS = [
  'networking',
  'workshop',
  'meetup',
  'conference',
  'seminar',
  'exhibition',
  'festival',
  'show',
  'competition',
  'training',
  'social',
  'business',
  'tech',
  'fashion',
  'food',
  'sports',
  'education',
  'entertainment',
  'community',
  'local',
  'free',
  'paid',
  'online',
  'offline',
];

// Ghana regions and cities
export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Brong-Ahafo',
  'Western North',
  'Ahafo',
  'Bono',
  'Bono East',
  'Oti',
  'Savannah',
  'North East',
];

export const GHANA_CITIES = {
  'Greater Accra': [
    'Accra',
    'Tema',
    'Kumasi',
    'Tamale',
    'Sekondi-Takoradi',
    'Sunyani',
    'Cape Coast',
    'Koforidua',
    'Ho',
    'Bolgatanga',
    'Wa',
    'Techiman',
    'Nkawkaw',
    'Kintampo',
    'Savelugu',
  ],
  'Ashanti': [
    'Kumasi',
    'Obuasi',
    'Konongo',
    'Ejisu',
    'Mampong',
    'Offinso',
    'Bekwai',
    'Asante Mampong',
  ],
  'Western': [
    'Sekondi-Takoradi',
    'Tarkwa',
    'Prestea',
    'Bogoso',
    'Axim',
    'Half Assini',
  ],
  'Eastern': [
    'Koforidua',
    'Nkawkaw',
    'Mpraeso',
    'Begoro',
    'Kibi',
    'Akosombo',
  ],
  'Central': [
    'Cape Coast',
    'Kasoa',
    'Winneba',
    'Swedru',
    'Saltpond',
    'Mankessim',
  ],
  'Volta': [
    'Ho',
    'Keta',
    'Hohoe',
    'Kpando',
    'Anloga',
    'Sogakope',
  ],
  'Northern': [
    'Tamale',
    'Yendi',
    'Savelugu',
    'Tolon',
    'Kumbungu',
    'Gushegu',
  ],
  'Upper East': [
    'Bolgatanga',
    'Navrongo',
    'Bawku',
    'Paga',
    'Zebilla',
    'Sandema',
  ],
  'Upper West': [
    'Wa',
    'Lawra',
    'Jirapa',
    'Nandom',
    'Tumu',
    'Funsi',
  ],
  'Brong-Ahafo': [
    'Sunyani',
    'Techiman',
    'Kintampo',
    'Berekum',
    'Bechem',
    'Atebubu',
  ],
};

// Event duration options (in hours)
export const EVENT_DURATION_OPTIONS = [
  { label: '30 minutes', value: 0.5 },
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
  { label: '3 hours', value: 3 },
  { label: '4 hours', value: 4 },
  { label: '6 hours', value: 6 },
  { label: '8 hours', value: 8 },
  { label: 'All day', value: 12 },
  { label: 'Multi-day', value: 24 },
];

// Event capacity options
export const EVENT_CAPACITY_OPTIONS = [
  { label: 'No limit', value: null },
  { label: '10 people', value: 10 },
  { label: '25 people', value: 25 },
  { label: '50 people', value: 50 },
  { label: '100 people', value: 100 },
  { label: '200 people', value: 200 },
  { label: '500 people', value: 500 },
  { label: '1000+ people', value: 1000 },
];

// Ticket price ranges
export const TICKET_PRICE_RANGES = [
  { label: 'Free', value: 0 },
  { label: 'GHS 5 - 20', value: { min: 5, max: 20 } },
  { label: 'GHS 20 - 50', value: { min: 20, max: 50 } },
  { label: 'GHS 50 - 100', value: { min: 50, max: 100 } },
  { label: 'GHS 100 - 200', value: { min: 100, max: 200 } },
  { label: 'GHS 200+', value: { min: 200, max: null } },
];

// Event visibility options
export const EVENT_VISIBILITY_OPTIONS = [
  {
    id: 'public',
    name: 'Public',
    description: 'Anyone can see and join this event',
    icon: 'globe',
  },
  {
    id: 'private',
    name: 'Private',
    description: 'Only invited people can see this event',
    icon: 'lock',
  },
  {
    id: 'invite_only',
    name: 'Invite Only',
    description: 'Only people with the link can see this event',
    icon: 'link',
  },
];

// Event status options
export const EVENT_STATUS_OPTIONS = [
  {
    id: 'active',
    name: 'Active',
    description: 'Event is live and accepting registrations',
    color: '#10B981',
  },
  {
    id: 'cancelled',
    name: 'Cancelled',
    description: 'Event has been cancelled',
    color: '#EF4444',
  },
  {
    id: 'completed',
    name: 'Completed',
    description: 'Event has finished',
    color: '#6B7280',
  },
  {
    id: 'postponed',
    name: 'Postponed',
    description: 'Event has been postponed',
    color: '#F59E0B',
  },
];

// Event reminder options
export const EVENT_REMINDER_OPTIONS = [
  {
    id: '1_hour',
    name: '1 hour before',
    description: 'Get reminded 1 hour before the event',
    value: 1,
  },
  {
    id: '1_day',
    name: '1 day before',
    description: 'Get reminded 1 day before the event',
    value: 24,
  },
  {
    id: '1_week',
    name: '1 week before',
    description: 'Get reminded 1 week before the event',
    value: 168,
  },
];

// Event sharing platforms
export const EVENT_SHARING_PLATFORMS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'message-circle',
    color: '#25D366',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
  },
  {
    id: 'copy_link',
    name: 'Copy Link',
    icon: 'link',
    color: '#6B7280',
  },
];

// Event notification types
export const EVENT_NOTIFICATION_TYPES = [
  {
    id: 'event_reminder',
    name: 'Event Reminder',
    description: 'Reminder about upcoming events',
    icon: 'bell',
  },
  {
    id: 'event_cancelled',
    name: 'Event Cancelled',
    description: 'Notification when an event is cancelled',
    icon: 'x-circle',
  },
  {
    id: 'event_updated',
    name: 'Event Updated',
    description: 'Notification when event details are updated',
    icon: 'edit',
  },
  {
    id: 'new_attendee',
    name: 'New Attendee',
    description: 'Notification when someone joins your event',
    icon: 'user-plus',
  },
  {
    id: 'event_starting',
    name: 'Event Starting',
    description: 'Notification when an event is about to start',
    icon: 'play',
  },
];

// Helper functions
export const getEventTypeInfo = (type: string): EventTypeInfo | undefined => {
  return EVENT_TYPES.find(t => t.id === type);
};

export const getEventCategoryInfo = (category: string): EventCategoryInfo | undefined => {
  return EVENT_CATEGORIES.find(c => c.id === category);
};

export const getCitiesByRegion = (region: string): string[] => {
  return GHANA_CITIES[region as keyof typeof GHANA_CITIES] || [];
};

export const formatEventDuration = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  } else if (hours === 1) {
    return '1 hour';
  } else if (hours < 24) {
    return `${hours} hours`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
    }
  }
};

export const formatEventCapacity = (capacity: number | null): string => {
  if (capacity === null) {
    return 'No limit';
  } else if (capacity >= 1000) {
    return '1000+ people';
  } else {
    return `${capacity} people`;
  }
};

export const formatTicketPrice = (price: number, currency: string = 'GHS'): string => {
  if (price === 0) {
    return 'Free';
  } else {
    return `${currency} ${price.toFixed(2)}`;
  }
};
