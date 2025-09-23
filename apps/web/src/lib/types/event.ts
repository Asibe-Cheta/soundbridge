export interface Event {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  event_date: string;
  location: string;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  category: EventCategory;
  price_gbp: number | null;
  price_ngn: number | null;
  max_attendees: number | null;
  current_attendees: number;
  image_url: string | null;
  created_at: string;

  // Computed fields
  attendeeCount?: number;
  isAttending?: boolean;
  isInterested?: boolean;
  formattedDate?: string;
  formattedPrice?: string;
  isFeatured?: boolean;
  rating?: number;
  userStatus?: 'attending' | 'interested' | 'not_going';

  // Relations
  creator?: Profile;
  attendees?: EventAttendee[];
  attendingUsers?: EventAttendee[];
  interestedUsers?: EventAttendee[];
}

export interface EventAttendee {
  event_id: string;
  user_id: string;
  status: 'attending' | 'interested' | 'not_going';
  created_at: string;
  updated_at: string;

  // Relations
  user?: Profile;
}

export interface EventFilters {
  search?: string;
  category?: EventCategory | 'all';
  location?: string | 'all';
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'next-month';
  priceRange?: 'all' | 'free' | 'low' | 'medium' | 'high';
  includePast?: boolean;
  sortBy?: 'date' | 'price' | 'attendees' | 'rating';
  limit?: number;
  offset?: number;
}

export interface EventCreateData {
  title: string;
  description?: string;
  event_date: string;
  location: string;
  venue?: string;
  latitude?: number;
  longitude?: number;
  category: EventCategory;
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  image_url?: string;
}

export interface EventUpdateData extends Partial<EventCreateData> {
  id: string;
}

export interface EventStats {
  totalEvents: number;
  attendingEvents: number;
  createdEvents: number;
  pastEvents: number;
  totalAttendees: number;
  averageRating: number;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  social_links?: Record<string, string>;
}

export type EventCategory =
  | 'Christian'
  | 'Secular'
  | 'Carnival'
  | 'Gospel'
  | 'Hip-Hop'
  | 'Afrobeat'
  | 'Jazz'
  | 'Classical'
  | 'Rock'
  | 'Pop'
  | 'Other';

export type AttendeeStatus = 'attending' | 'interested' | 'not_going';

export interface EventSearchResult {
  events: Event[];
  total: number;
  hasMore: boolean;
}

export interface EventDashboardData {
  attending: Event[];
  created: Event[];
  past: Event[];
  stats: EventStats;
}

export interface NearbyEvent extends Event {
  distance: number; // in kilometers
}

export interface EventFormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  venue: string;
  category: EventCategory;
  price_gbp: number | null;
  price_ngn: number | null;
  max_attendees: number | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface EventRSVPData {
  eventId: string;
  status: AttendeeStatus;
  userId: string;
}

export interface EventLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
}

export interface EventAnalytics {
  eventId: string;
  views: number;
  uniqueViews: number;
  rsvps: number;
  attending: number;
  interested: number;
  conversionRate: number;
  topReferrers: Array<{ source: string; count: number }>;
  dailyStats: Array<{ date: string; views: number; rsvps: number }>;
} 