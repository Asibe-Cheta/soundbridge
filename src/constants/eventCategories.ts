// Event categories for push notification preferences
// These categories are used for filtering events and personalizing notifications

export interface EventCategory {
  id: string;
  name: string;
  icon: string; // Ionicons name
  description: string;
  color: string; // Hex color for UI
}

// Realistic event categories (not music genres)
// These align with real-world event types that users actually attend
export const EVENT_CATEGORIES: EventCategory[] = [
  // Entertainment Events
  {
    id: 'concerts_live_music',
    name: 'Concerts & Live Music',
    icon: 'musical-notes-outline',
    description: 'Music concerts, live performances, band shows',
    color: '#DC2626',
  },
  {
    id: 'festivals_carnivals',
    name: 'Festivals & Carnivals',
    icon: 'flag-outline',
    description: 'Cultural festivals, street carnivals, celebrations',
    color: '#FFB84D',
  },
  {
    id: 'comedy_entertainment',
    name: 'Comedy & Entertainment',
    icon: 'happy-outline',
    description: 'Stand-up comedy, comedy shows, entertainment nights',
    color: '#F39C12',
  },
  
  // Social Events
  {
    id: 'parties_celebrations',
    name: 'Parties & Celebrations',
    icon: 'gift-outline',
    description: 'Birthday parties, celebrations, social gatherings',
    color: '#FF6B9D',
  },
  {
    id: 'networking_meetups',
    name: 'Networking & Meetups',
    icon: 'people-outline',
    description: 'Professional networking, social meetups, community gatherings',
    color: '#4ECDC4',
  },
  
  // Religious & Spiritual
  {
    id: 'religious_spiritual',
    name: 'Religious & Spiritual',
    icon: 'heart-outline',
    description: 'Church services, worship events, spiritual gatherings',
    color: '#3498DB',
  },
  
  // Professional & Educational
  {
    id: 'conferences_seminars',
    name: 'Conferences & Seminars',
    icon: 'document-text-outline',
    description: 'Professional conferences, industry seminars, summits',
    color: '#16A085',
  },
  {
    id: 'workshops_training',
    name: 'Workshops & Training',
    icon: 'school-outline',
    description: 'Educational workshops, skill training, learning sessions',
    color: '#E74C3C',
  },
  {
    id: 'business_entrepreneurship',
    name: 'Business & Entrepreneurship',
    icon: 'briefcase-outline',
    description: 'Business events, startup pitches, entrepreneur meetups',
    color: '#2C3E50',
  },
  
  // Arts & Culture
  {
    id: 'arts_exhibitions',
    name: 'Arts & Exhibitions',
    icon: 'color-palette-outline',
    description: 'Art galleries, exhibitions, creative showcases',
    color: '#D35400',
  },
  {
    id: 'theater_performances',
    name: 'Theater & Performances',
    icon: 'film-outline',
    description: 'Theater shows, stage performances, dramatic arts',
    color: '#9B59B6',
  },
  
  // Special Interest
  {
    id: 'sports_fitness',
    name: 'Sports & Fitness',
    icon: 'fitness-outline',
    description: 'Sports events, fitness activities, athletic competitions',
    color: '#27AE60',
  },
  {
    id: 'food_dining',
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    description: 'Food festivals, dining experiences, culinary events',
    color: '#EA580C',
  },
  {
    id: 'charity_fundraising',
    name: 'Charity & Fundraising',
    icon: 'heart-circle-outline',
    description: 'Charity events, fundraisers, community service',
    color: '#E91E63',
  },
  
  // Technology & Innovation
  {
    id: 'tech_innovation',
    name: 'Tech & Innovation',
    icon: 'hardware-chip-outline',
    description: 'Tech meetups, hackathons, product launches',
    color: '#0EA5E9',
  },
  
  // Catch-all
  {
    id: 'other_events',
    name: 'Other Events',
    icon: 'ellipsis-horizontal-outline',
    description: 'Other event types not listed above',
    color: '#64748B',
  },
];

// Notification radius options (in kilometers)
export const NOTIFICATION_RADIUS_OPTIONS = [
  { value: 5, label: '5 km', description: 'Very local events' },
  { value: 10, label: '10 km', description: 'Nearby events' },
  { value: 25, label: '25 km', description: 'City-wide events' },
  { value: 50, label: '50 km', description: 'Regional events' },
  { value: 100, label: '100 km', description: 'State-wide events' },
  { value: 200, label: '200 km', description: 'National events' },
];

// Notification advance notice options (how far in advance to notify)
export const NOTIFICATION_ADVANCE_OPTIONS = [
  { value: 1, label: '1 day before', unit: 'day' },
  { value: 3, label: '3 days before', unit: 'day' },
  { value: 7, label: '1 week before', unit: 'week' },
  { value: 14, label: '2 weeks before', unit: 'week' },
  { value: 30, label: '1 month before', unit: 'month' },
];

// Notification styles for dynamic rendering
export const NOTIFICATION_STYLES = [
  'organizer_focus', // "Powercity church has an event in [location] next month"
  'event_type_focus', // "There's a workshop for entrepreneurs in [location] next week"
  'catchphrase', // Use featured event catchphrase/description
  'standard', // Standard format: "[Event Name] - [Date] at [Location]"
];

// Maximum notifications per week (business strategy decision)
export const MAX_NOTIFICATIONS_PER_WEEK = 3;

// Quiet hours default (no notifications between these hours)
export const DEFAULT_QUIET_HOURS = {
  start: '22:00', // 10 PM
  end: '08:00', // 8 AM
};

// Helper function to get category by ID
export const getCategoryById = (id: string): EventCategory | undefined => {
  return EVENT_CATEGORIES.find(cat => cat.id === id);
};

// Helper function to get category name
export const getCategoryName = (id: string): string => {
  const category = getCategoryById(id);
  return category ? category.name : id;
};

// Helper function to get multiple categories
export const getCategoriesByIds = (ids: string[]): EventCategory[] => {
  return EVENT_CATEGORIES.filter(cat => ids.includes(cat.id));
};

