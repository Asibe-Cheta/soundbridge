import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '8');

    console.log('🔍 Enhanced search for:', query, 'with limit:', limit);

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: {
          creators: [],
          music: [],
          events: [],
          podcasts: []
        }
      });
    }

    const searchQuery = query.toLowerCase().trim();
    const results = {
      creators: [] as any[],
      music: [] as any[],
      events: [] as any[],
      podcasts: [] as any[]
    };

    // Enhanced creator search with multiple matching strategies
    const creatorSearchQueries = [
      // Exact username match (highest priority)
      supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          country,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .eq('username', searchQuery)
        .limit(limit),

      // Display name starts with query (high priority)
      supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          country,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .ilike('display_name', `${searchQuery}%`)
        .limit(limit),

      // Username starts with query (high priority)
      supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          country,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .ilike('username', `${searchQuery}%`)
        .limit(limit),

      // Display name contains query
      supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          country,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .ilike('display_name', `%${searchQuery}%`)
        .limit(limit),

      // Username contains query
      supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          country,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .ilike('username', `%${searchQuery}%`)
        .limit(limit),

      // Bio contains query
      supabase
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          banner_url,
          location,
          country,
          role,
          created_at
        `)
        .eq('role', 'creator')
        .ilike('bio', `%${searchQuery}%`)
        .limit(limit)
    ];

    // Execute creator searches with priority ordering
    const creatorPromises = creatorSearchQueries.map(query => query);
    const creatorResults = await Promise.all(creatorPromises);

    // Combine and deduplicate creator results with priority scoring
    const creatorMap = new Map();
    creatorResults.forEach((result, index) => {
      if (result.data) {
        result.data.forEach((creator: any) => {
          if (!creatorMap.has(creator.id)) {
            creatorMap.set(creator.id, {
              ...creator,
              priority: index + 1 // Lower index = higher priority
            });
          }
        });
      }
    });

    results.creators = Array.from(creatorMap.values())
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);

    // Enhanced music search
    const musicQueries = [
      // Title starts with query
      supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .not('genre', 'eq', 'podcast')
        .not('genre', 'eq', 'Podcast')
        .not('genre', 'eq', 'PODCAST')
        .ilike('title', `${searchQuery}%`)
        .limit(limit),

      // Title contains query
      supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .not('genre', 'eq', 'podcast')
        .not('genre', 'eq', 'Podcast')
        .not('genre', 'eq', 'PODCAST')
        .ilike('title', `%${searchQuery}%`)
        .limit(limit),

      // Genre contains query
      supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .not('genre', 'eq', 'podcast')
        .not('genre', 'eq', 'Podcast')
        .not('genre', 'eq', 'PODCAST')
        .ilike('genre', `%${searchQuery}%`)
        .limit(limit),

      // Creator name contains query
      supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .not('genre', 'eq', 'podcast')
        .not('genre', 'eq', 'Podcast')
        .not('genre', 'eq', 'PODCAST')
        .ilike('creator.display_name', `%${searchQuery}%`)
        .limit(limit)
    ];

    const musicPromises = musicQueries.map(query => query);
    const musicResults = await Promise.all(musicPromises);

    const musicMap = new Map();
    musicResults.forEach((result, index) => {
      if (result.data) {
        result.data.forEach((track: any) => {
          if (!musicMap.has(track.id)) {
            musicMap.set(track.id, {
              ...track,
              priority: index + 1
            });
          }
        });
      }
    });

    results.music = Array.from(musicMap.values())
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);

    // Enhanced event search
    const eventQueries = [
      // Title starts with query
      supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .ilike('title', `${searchQuery}%`)
        .limit(limit),

      // Title contains query
      supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .ilike('title', `%${searchQuery}%`)
        .limit(limit),

      // Location contains query
      supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_organizer_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .or(`venue.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
        .limit(limit)
    ];

    const eventPromises = eventQueries.map(query => query);
    const eventResults = await Promise.all(eventPromises);

    const eventMap = new Map();
    eventResults.forEach((result, index) => {
      if (result.data) {
        result.data.forEach((event: any) => {
          if (!eventMap.has(event.id)) {
            eventMap.set(event.id, {
              ...event,
              priority: index + 1
            });
          }
        });
      }
    });

    results.events = Array.from(eventMap.values())
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);

    // Enhanced podcast search
    const podcastQueries = [
      // Title starts with query
      supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .or(`genre.ilike.%podcast%,genre.ilike.%Podcast%,genre.ilike.%PODCAST%`)
        .ilike('title', `${searchQuery}%`)
        .limit(limit),

      // Title contains query
      supabase
        .from('audio_tracks')
        .select(`
          *,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .or(`genre.ilike.%podcast%,genre.ilike.%Podcast%,genre.ilike.%PODCAST%`)
        .ilike('title', `%${searchQuery}%`)
        .limit(limit)
    ];

    const podcastPromises = podcastQueries.map(query => query);
    const podcastResults = await Promise.all(podcastPromises);

    const podcastMap = new Map();
    podcastResults.forEach((result, index) => {
      if (result.data) {
        result.data.forEach((podcast: any) => {
          if (!podcastMap.has(podcast.id)) {
            podcastMap.set(podcast.id, {
              ...podcast,
              priority: index + 1
            });
          }
        });
      }
    });

    results.podcasts = Array.from(podcastMap.values())
      .sort((a, b) => a.priority - b.priority)
      .slice(0, limit);

    console.log('✅ Enhanced search results:', {
      creators: results.creators.length,
      music: results.music.length,
      events: results.events.length,
      podcasts: results.podcasts.length
    });

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ Enhanced search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Enhanced search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
