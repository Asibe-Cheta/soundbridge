// ============================================================================
// UNIFIED EVENT CATEGORIES - TYPE DEFINITIONS
// Date: October 16, 2025
// Aligned with Mobile Team
// ============================================================================

/**
 * Event Category IDs
 * These represent the PRIMARY type of event (what kind of event it is)
 */
export const EVENT_CATEGORIES = [
  // Entertainment Events
  'concerts_live_music',
  'festivals_carnivals',
  'comedy_entertainment',
  
  // Social Events
  'parties_celebrations',
  'networking_meetups',
  
  // Religious & Spiritual
  'religious_spiritual',
  
  // Professional & Educational
  'conferences_seminars',
  'workshops_training',
  'business_entrepreneurship',
  
  // Arts & Culture
  'arts_exhibitions',
  'theater_performances',
  
  // Special Interest
  'sports_fitness',
  'food_dining',
  'charity_fundraising',
  
  // Catch-all
  'other_events',
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];

/**
 * Music Genre IDs
 * These represent the music style for music events (optional)
 */
export const MUSIC_GENRES = [
  'gospel',
  'afrobeat',
  'jazz',
  'hip_hop',
  'classical',
  'rock',
  'pop',
  'r_b',
  'reggae',
  'soul',
  'blues',
  'electronic',
  'country',
  'other',
] as const;

export type MusicGenre = typeof MUSIC_GENRES[number];

/**
 * Event Category Definitions
 * Full metadata for each event category
 */
export interface EventCategoryDefinition {
  id: EventCategory;
  name: string;
  description: string;
  icon: string;
  examples: string[];
  sortOrder: number;
}

export const UNIFIED_EVENT_CATEGORIES: EventCategoryDefinition[] = [
  // Entertainment Events
  {
    id: 'concerts_live_music',
    name: 'Concerts & Live Music',
    description: 'Music concerts, live performances, band shows',
    icon: 'musical-notes',
    examples: ['Gospel concerts', 'Afrobeat shows', 'Jazz nights', 'Rock concerts'],
    sortOrder: 1,
  },
  {
    id: 'festivals_carnivals',
    name: 'Festivals & Carnivals',
    description: 'Cultural festivals, street carnivals, celebrations',
    icon: 'flag',
    examples: ['Cultural festivals', 'Street parties', 'Carnival celebrations'],
    sortOrder: 2,
  },
  {
    id: 'comedy_entertainment',
    name: 'Comedy & Entertainment',
    description: 'Stand-up comedy, comedy shows, entertainment nights',
    icon: 'happy',
    examples: ['Stand-up comedy', 'Comedy clubs', 'Entertainment shows'],
    sortOrder: 3,
  },
  
  // Social Events
  {
    id: 'parties_celebrations',
    name: 'Parties & Celebrations',
    description: 'Birthday parties, celebrations, social gatherings',
    icon: 'gift',
    examples: ['Birthday parties', 'Anniversary celebrations', 'Get-togethers'],
    sortOrder: 4,
  },
  {
    id: 'networking_meetups',
    name: 'Networking & Meetups',
    description: 'Professional networking, social meetups, community gatherings',
    icon: 'people',
    examples: ['Business networking', 'Professional meetups', 'Community events'],
    sortOrder: 5,
  },
  
  // Religious & Spiritual
  {
    id: 'religious_spiritual',
    name: 'Religious & Spiritual',
    description: 'Church services, worship events, spiritual gatherings',
    icon: 'heart',
    examples: ['Church services', 'Prayer meetings', 'Gospel events', 'Worship nights'],
    sortOrder: 6,
  },
  
  // Professional & Educational
  {
    id: 'conferences_seminars',
    name: 'Conferences & Seminars',
    description: 'Professional conferences, industry seminars, summits',
    icon: 'document-text',
    examples: ['Tech conferences', 'Business summits', 'Industry seminars'],
    sortOrder: 7,
  },
  {
    id: 'workshops_training',
    name: 'Workshops & Training',
    description: 'Educational workshops, skill training, learning sessions',
    icon: 'school',
    examples: ['Skill workshops', 'Training sessions', 'Educational seminars'],
    sortOrder: 8,
  },
  {
    id: 'business_entrepreneurship',
    name: 'Business & Entrepreneurship',
    description: 'Business events, startup pitches, entrepreneur meetups',
    icon: 'briefcase',
    examples: ['Startup events', 'Business launches', 'Entrepreneur forums'],
    sortOrder: 9,
  },
  
  // Arts & Culture
  {
    id: 'arts_exhibitions',
    name: 'Arts & Exhibitions',
    description: 'Art galleries, exhibitions, creative showcases',
    icon: 'color-palette',
    examples: ['Art galleries', 'Photo exhibitions', 'Creative showcases'],
    sortOrder: 10,
  },
  {
    id: 'theater_performances',
    name: 'Theater & Performances',
    description: 'Theater shows, stage performances, dramatic arts',
    icon: 'film',
    examples: ['Theater plays', 'Stage performances', 'Drama shows'],
    sortOrder: 11,
  },
  
  // Special Interest
  {
    id: 'sports_fitness',
    name: 'Sports & Fitness',
    description: 'Sports events, fitness activities, athletic competitions',
    icon: 'fitness',
    examples: ['Sports tournaments', 'Fitness classes', 'Athletic events'],
    sortOrder: 12,
  },
  {
    id: 'food_dining',
    name: 'Food & Dining',
    description: 'Food festivals, dining experiences, culinary events',
    icon: 'restaurant',
    examples: ['Food festivals', 'Wine tasting', 'Chef dinners'],
    sortOrder: 13,
  },
  {
    id: 'charity_fundraising',
    name: 'Charity & Fundraising',
    description: 'Charity events, fundraisers, community service',
    icon: 'heart-circle',
    examples: ['Charity galas', 'Fundraising events', 'Community service'],
    sortOrder: 14,
  },
  
  // Catch-all
  {
    id: 'other_events',
    name: 'Other Events',
    description: 'Other event types not listed above',
    icon: 'ellipsis-horizontal',
    examples: ['Miscellaneous events'],
    sortOrder: 15,
  },
];

/**
 * Music Genre Definitions
 * Full metadata for each music genre
 */
export interface MusicGenreDefinition {
  id: MusicGenre;
  name: string;
  description: string;
  sortOrder: number;
}

export const MUSIC_GENRE_DEFINITIONS: MusicGenreDefinition[] = [
  { id: 'gospel', name: 'Gospel', description: 'Gospel music events', sortOrder: 1 },
  { id: 'afrobeat', name: 'Afrobeat', description: 'Afrobeat music events', sortOrder: 2 },
  { id: 'jazz', name: 'Jazz', description: 'Jazz music events', sortOrder: 3 },
  { id: 'hip_hop', name: 'Hip-Hop', description: 'Hip-Hop music events', sortOrder: 4 },
  { id: 'classical', name: 'Classical', description: 'Classical music events', sortOrder: 5 },
  { id: 'rock', name: 'Rock', description: 'Rock music events', sortOrder: 6 },
  { id: 'pop', name: 'Pop', description: 'Pop music events', sortOrder: 7 },
  { id: 'r_b', name: 'R&B', description: 'R&B music events', sortOrder: 8 },
  { id: 'reggae', name: 'Reggae', description: 'Reggae music events', sortOrder: 9 },
  { id: 'soul', name: 'Soul', description: 'Soul music events', sortOrder: 10 },
  { id: 'blues', name: 'Blues', description: 'Blues music events', sortOrder: 11 },
  { id: 'electronic', name: 'Electronic', description: 'Electronic/EDM music events', sortOrder: 12 },
  { id: 'country', name: 'Country', description: 'Country music events', sortOrder: 13 },
  { id: 'other', name: 'Other', description: 'Other music genres', sortOrder: 14 },
];

/**
 * Helper functions
 */
export function getEventCategoryName(id: EventCategory): string {
  return UNIFIED_EVENT_CATEGORIES.find(cat => cat.id === id)?.name || 'Unknown Category';
}

export function getMusicGenreName(id: MusicGenre): string {
  return MUSIC_GENRE_DEFINITIONS.find(genre => genre.id === id)?.name || 'Unknown Genre';
}

export function isValidEventCategory(value: string): value is EventCategory {
  return EVENT_CATEGORIES.includes(value as EventCategory);
}

export function isValidMusicGenre(value: string): value is MusicGenre {
  return MUSIC_GENRES.includes(value as MusicGenre);
}

/**
 * Migration mapping for backward compatibility
 * Maps old category values to new event_category values
 */
export const OLD_TO_NEW_CATEGORY_MAP: Record<string, EventCategory> = {
  // Music genres -> concerts_live_music
  'Gospel': 'concerts_live_music',
  'Afrobeat': 'concerts_live_music',
  'Jazz': 'concerts_live_music',
  'Classical': 'concerts_live_music',
  'Rock': 'concerts_live_music',
  'Pop': 'concerts_live_music',
  'Hip-Hop': 'concerts_live_music',
  'R&B': 'concerts_live_music',
  'Reggae': 'concerts_live_music',
  'Soul': 'concerts_live_music',
  'Blues': 'concerts_live_music',
  'Electronic': 'concerts_live_music',
  'Country': 'concerts_live_music',
  
  // Special categories
  'Christian': 'religious_spiritual',
  'Carnival': 'festivals_carnivals',
  'Secular': 'other_events',
  'Other': 'other_events',
};

/**
 * Get music genre from old category (for migration)
 */
export function getMusicGenreFromOldCategory(oldCategory: string): MusicGenre | null {
  const musicGenres = ['Gospel', 'Afrobeat', 'Jazz', 'Classical', 'Rock', 'Pop', 'Hip-Hop', 'R&B', 'Reggae', 'Soul', 'Blues', 'Electronic', 'Country'];
  
  if (musicGenres.includes(oldCategory)) {
    // Convert to snake_case ID
    return oldCategory.toLowerCase().replace('-', '_') as MusicGenre;
  }
  
  return null;
}

