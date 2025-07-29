import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const suggestions = [];

    // Get trending searches (mock data for now)
    const trendingSearches = [
      { query: 'afrobeats', count: 1250 },
      { query: 'gospel', count: 890 },
      { query: 'uk drill', count: 670 },
      { query: 'lagos', count: 540 },
      { query: 'london events', count: 420 }
    ];

    // Add trending searches that match the query
    const matchingTrending = trendingSearches
      .filter(search => search.query.toLowerCase().includes(query.toLowerCase()))
      .map(search => ({
        type: 'trending' as const,
        text: search.query,
        count: search.count
      }));

    suggestions.push(...matchingTrending);

    // Search for matching music titles
    const { data: musicTitles } = await supabase
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
    const { data: creatorNames } = await supabase
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
    const { data: eventTitles } = await supabase
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

    // Search for matching genres
    const { data: genres } = await supabase
      .from('audio_tracks')
      .select('genre')
      .ilike('genre', `%${query}%`)
      .not('genre', 'is', null)
      .limit(limit);

    if (genres) {
      const uniqueGenres = [...new Set(genres.map(g => g.genre))];
      suggestions.push(...uniqueGenres.map(genre => ({
        type: 'genre' as const,
        text: genre,
        count: 1
      })));
    }

    // Search for matching locations
    const { data: locations } = await supabase
      .from('profiles')
      .select('location')
      .ilike('location', `%${query}%`)
      .not('location', 'is', null)
      .limit(limit);

    if (locations) {
      const uniqueLocations = [...new Set(locations.map(l => l.location))];
      suggestions.push(...uniqueLocations.map(location => ({
        type: 'location' as const,
        text: location,
        count: 1
      })));
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) =>
        index === self.findIndex(s => s.text === suggestion.text)
      )
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: uniqueSuggestions
    });

  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
} 