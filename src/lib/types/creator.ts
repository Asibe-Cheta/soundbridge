export interface CreatorProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  role: 'creator' | 'listener';
  location: string | null;
  country: 'UK' | 'Nigeria' | null;
  social_links: Record<string, string>;
  created_at: string;
  updated_at: string;
  // Computed fields
  followers_count?: number;
  following_count?: number;
  tracks_count?: number;
  events_count?: number;
  is_following?: boolean;
}

export interface AudioTrack {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  file_url: string;
  cover_art_url: string | null;
  duration: number | null; // in seconds
  genre: string | null;
  tags: string[] | null;
  play_count: number;
  like_count: number;
  is_public: boolean;
  created_at: string;
  // Computed fields
  creator?: CreatorProfile;
  formatted_duration?: string;
  formatted_play_count?: string;
}

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
  category: 'Christian' | 'Secular' | 'Carnival' | 'Gospel' | 'Hip-Hop' | 'Afrobeat' | 'Jazz' | 'Classical' | 'Rock' | 'Pop' | 'Other';
  price_gbp: number | null;
  price_ngn: number | null;
  max_attendees: number | null;
  current_attendees: number;
  image_url: string | null;
  created_at: string;
  // Computed fields
  creator?: CreatorProfile;
  formatted_date?: string;
  formatted_price?: string;
  attendee_status?: 'attending' | 'interested' | 'not_going';
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'audio' | 'file' | 'collaboration';
  is_read: boolean;
  created_at: string;
  // Computed fields
  sender?: CreatorProfile;
  recipient?: CreatorProfile;
  formatted_timestamp?: string;
}

export interface CreatorStats {
  followers_count: number;
  following_count: number;
  tracks_count: number;
  events_count: number;
  total_plays: number;
  total_likes: number;
}

export interface CreatorSearchFilters {
  genre?: string;
  location?: string;
  country?: 'UK' | 'Nigeria';
  role?: 'creator' | 'listener';
  min_followers?: number;
  max_followers?: number;
  verified?: boolean;
}

export interface CreatorSearchResult {
  profile: CreatorProfile;
  stats: CreatorStats;
  recent_tracks: AudioTrack[];
  upcoming_events: Event[];
} 