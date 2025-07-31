import { createBrowserClient } from './supabase';
import type {
  SearchResult,
  SearchFilters,
  SearchSuggestion,
  AudioTrack,
  Event,
  Profile,
  SearchAnalytics
} from './types/search';

export class SearchService {
  private supabase = createBrowserClient();

  /**
   * Perform full-text search across all content types
   */
  async searchContent(
    query: string,
    filters: SearchFilters = {},
    page = 1,
    limit = 20
  ): Promise<{ data: SearchResult | null; error: any }> {
    try {
      const offset = (page - 1) * limit;
      const results: SearchResult = {
        music: [],
        creators: [],
        events: [],
        podcasts: [],
        total_results: 0,
        has_more: false
      };

      // Search music tracks
      if (filters.content_types?.includes('music') || !filters.content_types) {
        const musicResults = await this.searchMusic(query, filters, offset, limit);
        results.music = musicResults.data || [];
      }

      // Search creators
      if (filters.content_types?.includes('creators') || !filters.content_types) {
        const creatorResults = await this.searchCreators(query, filters, offset, limit);
        results.creators = creatorResults.data || [];
      }

      // Search events
      if (filters.content_types?.includes('events') || !filters.content_types) {
        const eventResults = await this.searchEvents(query, filters, offset, limit);
        results.events = eventResults.data || [];
      }

      // Search podcasts (treated as audio tracks with podcast genre)
      if (filters.content_types?.includes('podcasts') || !filters.content_types) {
        const podcastResults = await this.searchPodcasts(query, filters, offset, limit);
        results.podcasts = podcastResults.data || [];
      }

      // Calculate totals
      results.total_results = results.music.length + results.creators.length +
        results.events.length + results.podcasts.length;
      results.has_more = results.total_results >= limit;

      return { data: results, error: null };
    } catch (error) {
      console.error('Error searching content:', error);
      return { data: null, error };
    }
  }

  /**
   * Search music tracks
   */
  private async searchMusic(
    query: string,
    filters: SearchFilters,
    offset: number,
    limit: number
  ): Promise<{ data: AudioTrack[] | null; error: any }> {
    try {
      let supabaseQuery = this.supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            location,
            country
          )
        `)
        .eq('is_public', true)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,genre.ilike.%${query}%`);

      // Apply filters
      if (filters.genre && filters.genre !== 'all') {
        supabaseQuery = supabaseQuery.eq('genre', filters.genre);
      }

      if (filters.location && filters.location !== 'all') {
        supabaseQuery = supabaseQuery.ilike('creator.location', `%${filters.location}%`);
      }

      if (filters.country) {
        supabaseQuery = supabaseQuery.eq('creator.country', filters.country);
      }

      if (filters.date_range && filters.date_range !== 'all') {
        const dateFilter = this.getDateRangeFilter(filters.date_range);
        if (dateFilter) {
          supabaseQuery = supabaseQuery.gte('created_at', dateFilter.start);
          if (dateFilter.end) {
            supabaseQuery = supabaseQuery.lte('created_at', dateFilter.end);
          }
        }
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'relevance';
      switch (sortBy) {
        case 'trending':
          supabaseQuery = supabaseQuery.order('play_count', { ascending: false });
          break;
        case 'latest':
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
          break;
        case 'popular':
          supabaseQuery = supabaseQuery.order('like_count', { ascending: false });
          break;
        default:
          // Relevance - order by play_count and created_at
          supabaseQuery = supabaseQuery.order('play_count', { ascending: false });
      }

      const { data, error } = await supabaseQuery
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error searching music:', error);
        return { data: null, error };
      }

      // Format tracks
      const formattedTracks: AudioTrack[] = (data || []).map(track => ({
        ...track,
        formatted_duration: this.formatDuration(track.duration),
        formatted_play_count: this.formatPlayCount(track.play_count),
        formatted_like_count: this.formatPlayCount(track.like_count),
        creator_name: track.creator?.display_name || 'Unknown Artist'
      }));

      return { data: formattedTracks, error: null };
    } catch (error) {
      console.error('Unexpected error searching music:', error);
      return { data: null, error };
    }
  }

  /**
   * Search creators
   */
  private async searchCreators(
    query: string,
    filters: SearchFilters,
    offset: number,
    limit: number
  ): Promise<{ data: Profile[] | null; error: any }> {
    try {
      let supabaseQuery = this.supabase
        .from('profiles')
        .select(`
          *,
          followers:follows!follows_following_id_fkey(count),
          tracks:audio_tracks!audio_tracks_creator_id_fkey(count)
        `)
        .eq('role', 'creator')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`);

      // Apply filters
      if (filters.location && filters.location !== 'all') {
        supabaseQuery = supabaseQuery.ilike('location', `%${filters.location}%`);
      }

      if (filters.country) {
        supabaseQuery = supabaseQuery.eq('country', filters.country);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'relevance';
      switch (sortBy) {
        case 'trending':
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
          break;
        case 'popular':
          // Order by followers count (this would need a more complex query in production)
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
          break;
        default:
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
      }

      const { data, error } = await supabaseQuery
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error searching creators:', error);
        return { data: null, error };
      }

      // Format creators with stats
      const formattedCreators: Profile[] = (data || []).map(creator => ({
        ...creator,
        followers_count: creator.followers?.[0]?.count || 0,
        tracks_count: creator.tracks?.[0]?.count || 0
      }));

      return { data: formattedCreators, error: null };
    } catch (error) {
      console.error('Unexpected error searching creators:', error);
      return { data: null, error };
    }
  }

  /**
   * Search events
   */
  private async searchEvents(
    query: string,
    filters: SearchFilters,
    offset: number,
    limit: number
  ): Promise<{ data: Event[] | null; error: any }> {
    try {
      let supabaseQuery = this.supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            location,
            country
          ),
          attendees:event_attendees!event_attendees_event_id_fkey(count)
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,venue.ilike.%${query}%`);

      // Apply filters
      if (filters.category && filters.category !== 'all') {
        supabaseQuery = supabaseQuery.eq('category', filters.category);
      }

      if (filters.location && filters.location !== 'all') {
        supabaseQuery = supabaseQuery.ilike('location', `%${filters.location}%`);
      }

      if (filters.country) {
        supabaseQuery = supabaseQuery.eq('creator.country', filters.country);
      }

      if (filters.date_range && filters.date_range !== 'all') {
        const dateFilter = this.getDateRangeFilter(filters.date_range);
        if (dateFilter) {
          supabaseQuery = supabaseQuery.gte('event_date', dateFilter.start);
          if (dateFilter.end) {
            supabaseQuery = supabaseQuery.lte('event_date', dateFilter.end);
          }
        }
      }

      if (filters.price_range && filters.price_range !== 'all') {
        const priceFilter = this.getPriceRangeFilter(filters.price_range);
        if (priceFilter) {
          if (filters.country === 'Nigeria') {
            supabaseQuery = supabaseQuery.gte('price_ngn', priceFilter.min);
            if (priceFilter.max) {
              supabaseQuery = supabaseQuery.lte('price_ngn', priceFilter.max);
            }
          } else {
            supabaseQuery = supabaseQuery.gte('price_gbp', priceFilter.min);
            if (priceFilter.max) {
              supabaseQuery = supabaseQuery.lte('price_gbp', priceFilter.max);
            }
          }
        }
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'relevance';
      switch (sortBy) {
        case 'trending':
          supabaseQuery = supabaseQuery.order('current_attendees', { ascending: false });
          break;
        case 'latest':
          supabaseQuery = supabaseQuery.order('event_date', { ascending: true });
          break;
        case 'nearest':
          // This would need location-based sorting in production
          supabaseQuery = supabaseQuery.order('event_date', { ascending: true });
          break;
        default:
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
      }

      const { data, error } = await supabaseQuery
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error searching events:', error);
        return { data: null, error };
      }

      // Format events
      const formattedEvents: Event[] = (data || []).map(event => ({
        ...event,
        formatted_date: this.formatEventDate(event.event_date),
        formatted_price: this.formatEventPrice(event.price_gbp, event.price_ngn, event.creator?.country),
        attendee_count: event.attendees?.[0]?.count || 0,
        creator_name: event.creator?.display_name || 'Unknown Organizer'
      }));

      return { data: formattedEvents, error: null };
    } catch (error) {
      console.error('Unexpected error searching events:', error);
      return { data: null, error };
    }
  }

  /**
   * Search podcasts (audio tracks with podcast genre)
   */
  private async searchPodcasts(
    query: string,
    filters: SearchFilters,
    offset: number,
    limit: number
  ): Promise<{ data: AudioTrack[] | null; error: any }> {
    try {
      // Create podcast-specific filters
      const podcastFilters = {
        ...filters,
        genre: 'podcast' // Force genre to podcast
      };

      return await this.searchMusic(query, podcastFilters, offset, limit);
    } catch (error) {
      console.error('Unexpected error searching podcasts:', error);
      return { data: null, error };
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(query: string, limit = 5): Promise<{ data: SearchSuggestion[] | null; error: any }> {
    try {
      const suggestions: SearchSuggestion[] = [];

      // Get trending searches
      const { data: trendingSearches } = await this.getTrendingSearches(limit);
      if (trendingSearches) {
        suggestions.push(...trendingSearches.map(search => ({
          type: 'trending' as const,
          text: search.query,
          count: search.count
        })));
      }

      // Get content-based suggestions
      const { data: contentSuggestions } = await this.getContentSuggestions(query, limit);
      if (contentSuggestions) {
        suggestions.push(...contentSuggestions);
      }

      return { data: suggestions, error: null };
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return { data: null, error };
    }
  }

  /**
   * Get trending searches
   */
  private async getTrendingSearches(limit: number): Promise<{ data: any[] | null; error: any }> {
    try {
      // In a real implementation, this would query a search_analytics table
      // For now, return mock trending searches
      const mockTrendingSearches = [
        { query: 'afrobeats', count: 1250 },
        { query: 'gospel', count: 890 },
        { query: 'uk drill', count: 670 },
        { query: 'lagos', count: 540 },
        { query: 'london events', count: 420 }
      ];

      return { data: mockTrendingSearches.slice(0, limit), error: null };
    } catch (error) {
      console.error('Error getting trending searches:', error);
      return { data: null, error };
    }
  }

  /**
   * Get content-based suggestions
   */
  private async getContentSuggestions(query: string, limit: number): Promise<{ data: SearchSuggestion[] | null; error: any }> {
    try {
      const suggestions: SearchSuggestion[] = [];

      // Search for matching titles
      const { data: musicTitles } = await this.supabase
        .from('audio_tracks')
        .select('title')
        .ilike('title', `%${query}%`)
        .eq('is_public', true)
        .limit(limit);

      if (musicTitles) {
        suggestions.push(...musicTitles.map(track => ({
          type: 'music' as const,
          text: track.title,
          count: 1
        })));
      }

      // Search for matching creator names
      const { data: creatorNames } = await this.supabase
        .from('profiles')
        .select('display_name')
        .ilike('display_name', `%${query}%`)
        .eq('role', 'creator')
        .limit(limit);

      if (creatorNames) {
        suggestions.push(...creatorNames.map(creator => ({
          type: 'creator' as const,
          text: creator.display_name,
          count: 1
        })));
      }

      // Search for matching event titles
      const { data: eventTitles } = await this.supabase
        .from('events')
        .select('title')
        .ilike('title', `%${query}%`)
        .gte('event_date', new Date().toISOString())
        .limit(limit);

      if (eventTitles) {
        suggestions.push(...eventTitles.map(event => ({
          type: 'event' as const,
          text: event.title,
          count: 1
        })));
      }

      return { data: suggestions.slice(0, limit), error: null };
    } catch (error) {
      console.error('Error getting content suggestions:', error);
      return { data: null, error };
    }
  }

  /**
   * Get location-based discovery
   */
  async getNearbyContent(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    filters: SearchFilters = {}
  ): Promise<{ data: SearchResult | null; error: any }> {
    try {
      // This would use PostGIS functions in production
      // For now, return a mock implementation
      const results: SearchResult = {
        music: [],
        creators: [],
        events: [],
        podcasts: [],
        total_results: 0,
        has_more: false
      };

      // In production, this would call the get_nearby_events RPC function
      // and similar functions for other content types

      return { data: results, error: null };
    } catch (error) {
      console.error('Error getting nearby content:', error);
      return { data: null, error };
    }
  }

  /**
   * Get trending content
   */
  async getTrendingContent(limit = 20): Promise<{ data: SearchResult | null; error: any }> {
    try {
      const results: SearchResult = {
        music: [],
        creators: [],
        events: [],
        podcasts: [],
        total_results: 0,
        has_more: false
      };

      // Get trending music
      const { data: trendingMusic } = await this.supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            location,
            country
          )
        `)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(limit);

      if (trendingMusic) {
        results.music = trendingMusic.map(track => ({
          ...track,
          formatted_duration: this.formatDuration(track.duration),
          formatted_play_count: this.formatPlayCount(track.play_count),
          formatted_like_count: this.formatPlayCount(track.like_count),
          creator_name: track.creator?.display_name || 'Unknown Artist'
        }));
      }

      // Get trending events
      const { data: trendingEvents } = await this.supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            location,
            country
          )
        `)
        .gte('event_date', new Date().toISOString())
        .order('current_attendees', { ascending: false })
        .limit(limit);

      if (trendingEvents) {
        results.events = trendingEvents.map(event => ({
          ...event,
          formatted_date: this.formatEventDate(event.event_date),
          formatted_price: this.formatEventPrice(event.price_gbp, event.price_ngn, event.creator?.country),
          attendee_count: event.current_attendees || 0,
          creator_name: event.creator?.display_name || 'Unknown Organizer'
        }));
      }

      results.total_results = results.music.length + results.creators.length +
        results.events.length + results.podcasts.length;

      return { data: results, error: null };
    } catch (error) {
      console.error('Error getting trending content:', error);
      return { data: null, error };
    }
  }

  /**
   * Record search analytics
   */
  async recordSearchAnalytics(query: string, filters: SearchFilters, resultsCount: number): Promise<void> {
    try {
      // In a real implementation, this would insert into a search_analytics table
      console.log('Search analytics recorded:', { query, filters, resultsCount });
    } catch (error) {
      console.error('Error recording search analytics:', error);
    }
  }

  // Utility functions
  private getDateRangeFilter(dateRange: string): { start: string; end?: string } | null {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case 'today':
        return { start: today.toISOString() };
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: weekAgo.toISOString() };
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start: monthAgo.toISOString() };
      case 'next-month':
        const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        return { start: today.toISOString(), end: nextMonth.toISOString() };
      default:
        return null;
    }
  }

  private getPriceRangeFilter(priceRange: string): { min: number; max?: number } | null {
    switch (priceRange) {
      case 'free':
        return { min: 0, max: 0 };
      case 'low':
        return { min: 0, max: 20 };
      case 'medium':
        return { min: 20, max: 50 };
      case 'high':
        return { min: 50 };
      default:
        return null;
    }
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private formatPlayCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  private formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  private formatEventPrice(priceGbp: number | null, priceNgn: number | null, country: string | null): string {
    if (country === 'Nigeria' && priceNgn) {
      return `₦${priceNgn.toLocaleString()}`;
    } else if (priceGbp) {
      return `£${priceGbp.toLocaleString()}`;
    }
    return 'Free';
  }
}

export const searchService = new SearchService(); 