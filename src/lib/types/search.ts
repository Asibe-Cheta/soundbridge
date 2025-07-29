// Search Types for SoundBridge

export interface SearchResult {
  music: AudioTrack[];
  creators: Profile[];
  events: Event[];
  podcasts: AudioTrack[];
  total_results: number;
  has_more: boolean;
}

export interface SearchFilters {
  query?: string;
  content_types?: ('music' | 'creators' | 'events' | 'podcasts')[];
  genre?: string;
  category?: string;
  location?: string;
  country?: 'UK' | 'Nigeria';
  date_range?: 'all' | 'today' | 'week' | 'month' | 'next-month';
  price_range?: 'all' | 'free' | 'low' | 'medium' | 'high';
  sort_by?: 'relevance' | 'trending' | 'latest' | 'popular' | 'nearest';
  radius_km?: number;
  latitude?: number;
  longitude?: number;
}

export interface SearchSuggestion {
  type: 'trending' | 'music' | 'creator' | 'event' | 'podcast';
  text: string;
  count: number;
}

export interface AudioTrack {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  file_url: string;
  cover_art_url?: string;
  duration: number;
  genre?: string;
  tags?: string[];
  play_count: number;
  like_count: number;
  is_public: boolean;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    location?: string;
    country?: string;
  };
  formatted_duration?: string;
  formatted_play_count?: string;
  formatted_like_count?: string;
  creator_name?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  event_date: string;
  location: string;
  venue?: string;
  latitude?: number;
  longitude?: number;
  category: string;
  price_gbp?: number;
  price_ngn?: number;
  max_attendees?: number;
  current_attendees: number;
  image_url?: string;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    location?: string;
    country?: string;
  };
  formatted_date?: string;
  formatted_price?: string;
  attendee_count?: number;
  creator_name?: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  role: 'creator' | 'listener';
  location?: string;
  country?: 'UK' | 'Nigeria';
  social_links?: Record<string, string>;
  created_at: string;
  updated_at: string;
  followers_count?: number;
  tracks_count?: number;
}

export interface SearchAnalytics {
  query: string;
  filters: SearchFilters;
  results_count: number;
  search_time_ms: number;
  user_id?: string;
  timestamp: string;
}

export interface TrendingSearch {
  query: string;
  count: number;
  trend_direction: 'up' | 'down' | 'stable';
  previous_count: number;
}

export interface SearchMetrics {
  total_searches: number;
  unique_users: number;
  average_results: number;
  popular_queries: TrendingSearch[];
  search_success_rate: number;
}

export interface LocationSearch {
  latitude: number;
  longitude: number;
  radius_km: number;
  content_types?: ('music' | 'creators' | 'events' | 'podcasts')[];
}

export interface SearchPagination {
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  suggestions: SearchSuggestion[];
  pagination: SearchPagination;
}

export interface SearchAction {
  type: 'SET_QUERY' | 'SET_FILTERS' | 'SET_RESULTS' | 'SET_LOADING' | 'SET_ERROR' | 'SET_SUGGESTIONS' | 'SET_PAGINATION' | 'CLEAR_RESULTS';
  payload?: any;
}

export interface SearchContextType {
  state: SearchState;
  dispatch: React.Dispatch<SearchAction>;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  getSuggestions: (query: string) => Promise<void>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
}

// Filter option types
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface GenreFilter extends FilterOption {
  category?: string;
}

export interface LocationFilter extends FilterOption {
  country?: 'UK' | 'Nigeria';
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface DateRangeFilter extends FilterOption {
  start_date?: string;
  end_date?: string;
}

export interface PriceRangeFilter extends FilterOption {
  min_price?: number;
  max_price?: number;
  currency?: 'GBP' | 'NGN';
}

export interface SortOption extends FilterOption {
  field: string;
  direction: 'asc' | 'desc';
}

// Search result item types
export interface SearchResultItem {
  id: string;
  type: 'music' | 'creator' | 'event' | 'podcast';
  title: string;
  subtitle?: string;
  image_url?: string;
  metadata: Record<string, any>;
  relevance_score?: number;
  match_type?: 'exact' | 'partial' | 'fuzzy';
}

// Advanced search types
export interface AdvancedSearchFilters {
  text_search: {
    query: string;
    fields: string[];
    operator: 'AND' | 'OR';
  };
  filters: SearchFilters;
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination: SearchPagination;
}

export interface SearchFacets {
  genres: Array<{ value: string; count: number }>;
  locations: Array<{ value: string; count: number }>;
  categories: Array<{ value: string; count: number }>;
  date_ranges: Array<{ value: string; count: number }>;
  price_ranges: Array<{ value: string; count: number }>;
}

export interface SearchResponse {
  results: SearchResult;
  facets: SearchFacets;
  pagination: SearchPagination;
  search_time_ms: number;
  total_results: number;
} 