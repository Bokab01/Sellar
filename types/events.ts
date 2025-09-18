// =============================================
// COMMUNITY EVENTS TYPES
// =============================================

export type EventType = 'general' | 'meetup' | 'workshop' | 'social' | 'business' | 'educational';
export type EventCategory = 'electronics' | 'fashion' | 'home' | 'automotive' | 'food' | 'sports' | 'education' | 'business' | 'general';
export type EventStatus = 'active' | 'cancelled' | 'completed' | 'postponed';
export type EventVisibility = 'public' | 'private' | 'invite_only';
export type AttendanceStatus = 'registered' | 'attending' | 'cancelled' | 'waitlist';
export type NotificationType = 'event_reminder' | 'event_cancelled' | 'event_updated' | 'new_attendee' | 'event_starting';

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: EventType;
  category: EventCategory;
  location_name?: string;
  address?: string;
  city?: string;
  region?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  start_date: string;
  end_date?: string;
  is_online: boolean;
  online_link?: string;
  max_attendees?: number;
  current_attendees: number;
  registration_required: boolean;
  registration_deadline?: string;
  is_free: boolean;
  ticket_price: number;
  currency: string;
  organizer_id: string;
  organizer_name: string;
  organizer_avatar?: string;
  status: EventStatus;
  visibility: EventVisibility;
  tags: string[];
  image_url?: string;
  banner_url?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_attending: boolean;
  user_attendance_status?: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendanceStatus;
  registered_at: string;
  checked_in_at?: string;
  notes?: string;
}

export interface EventComment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  replies?: EventComment[];
}

export interface EventLike {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface EventShare {
  id: string;
  event_id: string;
  user_id: string;
  platform?: string;
  created_at: string;
}

export interface EventNotification {
  id: string;
  event_id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  scheduled_for?: string;
  sent_at?: string;
  created_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  event_type: EventType;
  category: EventCategory;
  location_name?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  start_date: string;
  end_date?: string;
  is_online: boolean;
  online_link?: string;
  max_attendees?: number;
  registration_required: boolean;
  registration_deadline?: string;
  is_free: boolean;
  ticket_price?: number;
  currency?: string;
  visibility: EventVisibility;
  tags: string[];
  image_url?: string;
  banner_url?: string;
}

export interface EventFilters {
  event_type?: EventType;
  category?: EventCategory;
  city?: string;
  region?: string;
  is_online?: boolean;
  is_free?: boolean;
  status?: EventStatus;
  visibility?: EventVisibility;
  limit?: number;
  offset?: number;
}

export interface EventStats {
  total_events: number;
  upcoming_events: number;
  past_events: number;
  events_attending: number;
  events_created: number;
  total_attendees: number;
}

// Event form validation
export interface EventFormErrors {
  title?: string;
  description?: string;
  event_type?: string;
  category?: string;
  location_name?: string;
  address?: string;
  city?: string;
  region?: string;
  start_date?: string;
  end_date?: string;
  max_attendees?: string;
  registration_deadline?: string;
  ticket_price?: string;
  online_link?: string;
}

// Event search and discovery
export interface EventSearchParams {
  query?: string;
  location?: string;
  date_range?: {
    start: string;
    end: string;
  };
  distance?: number; // in kilometers
  price_range?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

// Event analytics (for organizers)
export interface EventAnalytics {
  event_id: string;
  total_views: number;
  total_registrations: number;
  total_attendees: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  registration_rate: number;
  attendance_rate: number;
  engagement_rate: number;
  demographics: {
    age_groups: Record<string, number>;
    locations: Record<string, number>;
    interests: Record<string, number>;
  };
}

// Event reminders and notifications
export interface EventReminder {
  id: string;
  event_id: string;
  user_id: string;
  reminder_type: '1_hour' | '1_day' | '1_week';
  scheduled_for: string;
  is_sent: boolean;
  created_at: string;
}

// Event check-in system
export interface EventCheckIn {
  id: string;
  event_id: string;
  user_id: string;
  checked_in_at: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

// Event feedback and ratings
export interface EventFeedback {
  id: string;
  event_id: string;
  user_id: string;
  rating: number; // 1-5 stars
  comment?: string;
  would_recommend: boolean;
  created_at: string;
}

// Event categories with metadata
export interface EventCategoryInfo {
  id: EventCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  popular_tags: string[];
}

// Event types with metadata
export interface EventTypeInfo {
  id: EventType;
  name: string;
  description: string;
  icon: string;
  color: string;
  default_duration: number; // in hours
  typical_attendees: number;
}
