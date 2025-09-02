import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const contentTypes = searchParams.get('content_types')?.split(',') || [];
    const genre = searchParams.get('genre') || '';
    const category = searchParams.get('category') || '';
    const location = searchParams.get('location') || '';
    const country = searchParams.get('country') || '';
    const dateRange = searchParams.get('date_range') || '';
    const priceRange = searchParams.get('price_range') || '';
    const sortBy = searchParams.get('sort_by') || 'relevance';

    // Perform search based on content types
    const results: {
      music: unknown[];
      creators: unknown[];
      events: unknown[];
      podcasts: unknown[];
      total_results: number;
      has_more: boolean;
    } = {
      music: [],
      creators: [],
      events: [],
      podcasts: [],
      total_results: 0,
      has_more: false
    };

    const offset = (page - 1) * limit;

    // Search music tracks
    if (!contentTypes.length || contentTypes.includes('music')) {
      let musicQuery = supabase
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
        .not('genre', 'eq', 'podcast')
        .not('genre', 'eq', 'Podcast')
        .not('genre', 'eq', 'PODCAST');

      if (query) {
        musicQuery = musicQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,genre.ilike.%${query}%`);
      }

      if (genre && genre !== 'all') {
        musicQuery = musicQuery.eq('genre', genre);
      }

      if (location && location !== 'all') {
        musicQuery = musicQuery.ilike('creator.location', `%${location}%`);
      }

      if (country) {
        musicQuery = musicQuery.eq('creator.country', country);
      }

      // Apply sorting
      switch (sortBy) {
        case 'trending':
          musicQuery = musicQuery.order('play_count', { ascending: false });
          break;
        case 'latest':
          musicQuery = musicQuery.order('created_at', { ascending: false });
          break;
        case 'popular':
          musicQuery = musicQuery.order('like_count', { ascending: false });
          break;
        default:
          musicQuery = musicQuery.order('play_count', { ascending: false });
      }

      const { data: musicData, error: musicError } = await musicQuery
        .range(offset, offset + limit - 1);

      if (!musicError && musicData) {
        results.music = musicData.map(track => ({
          ...track,
          formatted_duration: formatDuration(track.duration),
          formatted_play_count: formatPlayCount(track.play_count),
          formatted_like_count: formatPlayCount(track.like_count),
          creator_name: track.creator?.display_name || 'Unknown Artist'
        }));
      }
    }

    // Search creators
    if (!contentTypes.length || contentTypes.includes('creators')) {
      let creatorQuery = supabase
        .from('profiles')
        .select(`
          *,
          followers:follows!follows_following_id_fkey(count),
          tracks:audio_tracks!audio_tracks_creator_id_fkey(count)
        `)
        .eq('role', 'creator');

      if (query) {
        creatorQuery = creatorQuery.or(`display_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`);
      }

      if (location && location !== 'all') {
        creatorQuery = creatorQuery.ilike('location', `%${location}%`);
      }

      if (country) {
        creatorQuery = creatorQuery.eq('country', country);
      }

      // Apply sorting
      switch (sortBy) {
        case 'trending':
          creatorQuery = creatorQuery.order('created_at', { ascending: false });
          break;
        case 'popular':
          creatorQuery = creatorQuery.order('created_at', { ascending: false });
          break;
        default:
          creatorQuery = creatorQuery.order('created_at', { ascending: false });
      }

      const { data: creatorData, error: creatorError } = await creatorQuery
        .range(offset, offset + limit - 1);

      if (!creatorError && creatorData) {
        console.log('🔍 API: Found creators:', creatorData.length, creatorData.map(c => ({ id: c.id, display_name: c.display_name, first_name: c.first_name, last_name: c.last_name, username: c.username })));
        results.creators = creatorData.map(creator => ({
          ...creator,
          followers_count: creator.followers?.[0]?.count || 0,
          tracks_count: creator.tracks?.[0]?.count || 0
        }));
      } else if (creatorError) {
        console.error('❌ API: Error searching creators:', creatorError);
      }
    }

    // Search events
    if (!contentTypes.length || contentTypes.includes('events')) {
      let eventQuery = supabase
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
        `);

      if (query) {
        eventQuery = eventQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,venue.ilike.%${query}%`);
      }

      if (category && category !== 'all') {
        eventQuery = eventQuery.eq('category', category);
      }

      if (location && location !== 'all') {
        eventQuery = eventQuery.ilike('location', `%${location}%`);
      }

      if (country) {
        eventQuery = eventQuery.eq('creator.country', country);
      }

      // Apply date range filter
      if (dateRange && dateRange !== 'all') {
        const validDateRanges = ['today', 'week', 'month', 'next-month'] as const;
        if (validDateRanges.includes(dateRange as any)) {
          const dateFilter = getDateRangeFilter(dateRange as 'today' | 'week' | 'month' | 'next-month');
          if (dateFilter) {
            eventQuery = eventQuery.gte('event_date', dateFilter.start);
            if (dateFilter.end) {
              eventQuery = eventQuery.lte('event_date', dateFilter.end);
            }
          }
        }
      }

      // Apply price range filter
      if (priceRange && priceRange !== 'all') {
        const validPriceRanges = ['free', 'low', 'medium', 'high'] as const;
        if (validPriceRanges.includes(priceRange as any)) {
          const priceFilter = getPriceRangeFilter(priceRange as 'free' | 'low' | 'medium' | 'high');
          if (priceFilter) {
            if (country === 'Nigeria') {
              eventQuery = eventQuery.gte('price_ngn', priceFilter.min);
              if (priceFilter.max) {
                eventQuery = eventQuery.lte('price_ngn', priceFilter.max);
              }
            } else {
              eventQuery = eventQuery.gte('price_gbp', priceFilter.min);
              if (priceFilter.max) {
                eventQuery = eventQuery.lte('price_gbp', priceFilter.max);
              }
            }
          }
        }
      }

      // Apply sorting
      switch (sortBy) {
        case 'trending':
          eventQuery = eventQuery.order('current_attendees', { ascending: false });
          break;
        case 'latest':
          eventQuery = eventQuery.order('event_date', { ascending: true });
          break;
        case 'nearest':
          eventQuery = eventQuery.order('event_date', { ascending: true });
          break;
        default:
          eventQuery = eventQuery.order('created_at', { ascending: false });
      }

      const { data: eventData, error: eventError } = await eventQuery
        .range(offset, offset + limit - 1);

      if (!eventError && eventData) {
        results.events = eventData.map(event => ({
          ...event,
          formatted_date: formatEventDate(event.event_date),
          formatted_price: formatEventPrice(event.price_gbp, event.price_ngn, event.creator?.country),
          attendee_count: event.attendees?.[0]?.count || 0,
          creator_name: event.creator?.display_name || 'Unknown Organizer'
        }));
      }
    }

    // Search podcasts (audio tracks with podcast genre)
    if (!contentTypes.length || contentTypes.includes('podcasts')) {
      let podcastQuery = supabase
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
        .in('genre', ['podcast', 'Podcast', 'PODCAST']);

      if (query) {
        podcastQuery = podcastQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }

      if (location && location !== 'all') {
        podcastQuery = podcastQuery.ilike('creator.location', `%${location}%`);
      }

      if (country) {
        podcastQuery = podcastQuery.eq('creator.country', country);
      }

      // Apply sorting
      switch (sortBy) {
        case 'trending':
          podcastQuery = podcastQuery.order('play_count', { ascending: false });
          break;
        case 'latest':
          podcastQuery = podcastQuery.order('created_at', { ascending: false });
          break;
        case 'popular':
          podcastQuery = podcastQuery.order('like_count', { ascending: false });
          break;
        default:
          podcastQuery = podcastQuery.order('play_count', { ascending: false });
      }

      const { data: podcastData, error: podcastError } = await podcastQuery
        .range(offset, offset + limit - 1);

      if (!podcastError && podcastData) {
        results.podcasts = podcastData.map(track => ({
          ...track,
          formatted_duration: formatDuration(track.duration),
          formatted_play_count: formatPlayCount(track.play_count),
          formatted_like_count: formatPlayCount(track.like_count),
          creator_name: track.creator?.display_name || 'Unknown Artist'
        }));
      }
    }

    // Calculate totals
    results.total_results = results.music.length + results.creators.length +
      results.events.length + results.podcasts.length;
    results.has_more = results.total_results >= limit;

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        has_next: results.has_more,
        has_previous: page > 1
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { query, filters, results_count } = body;

    // Record search analytics (in a real app, this would go to a search_analytics table)
    console.log('Search analytics:', {
      query,
      filters,
      results_count,
      user_id: user?.id,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Search analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record analytics' },
      { status: 500 }
    );
  }
}

// Utility functions
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatPlayCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatEventDate(dateString: string): string {
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

function formatEventPrice(priceGbp: number | null, priceNgn: number | null, country: string | null): string {
  if (country === 'Nigeria' && priceNgn) {
    return `₦${priceNgn.toLocaleString()}`;
  } else if (priceGbp) {
    return `£${priceGbp.toLocaleString()}`;
  }
  return 'Free';
}

function getDateRangeFilter(dateRange: 'today' | 'week' | 'month' | 'next-month'): { start: string; end?: string } | null {
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

function getPriceRangeFilter(priceRange: 'free' | 'low' | 'medium' | 'high'): { min: number; max?: number } | null {
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