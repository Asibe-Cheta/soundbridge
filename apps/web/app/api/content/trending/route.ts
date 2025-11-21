import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

/**
 * GET /api/content/trending?limit=20
 * 
 * Server-side trending content endpoint
 * Much faster than client-side queries due to server-to-server connection
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Server-side trending content fetch starting...');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const results = {
      music: [],
      creators: [],
      events: [],
      podcasts: [],
      services: [],
      venues: [],
      total_results: 0,
      has_more: false,
    };

    // Run all queries in parallel for maximum performance
    const [
      musicResult,
      eventsResult,
      providersResult,
      venuesResult
    ] = await Promise.all([
      // Trending music
      supabase
        .from('audio_tracks')
        .select(`
          id,
          title,
          genre,
          duration,
          play_count,
          like_count,
          cover_art_url,
          file_url,
          created_at,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
        .limit(limit)
        .then(res => {
          const elapsed = Date.now() - startTime;
          console.log(`✅ Music: ${res.data?.length || 0} tracks (${elapsed}ms)`);
          return res;
        })
        .catch(err => {
          console.error('❌ Music query failed:', err);
          return { data: [], error: err };
        }),

      // Trending events
      supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_date,
          location,
          price_gbp,
          price_ngn,
          current_attendees,
          max_attendees,
          image_url,
          created_at,
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url,
            country
          )
        `)
        .gte('event_date', new Date().toISOString())
        .order('current_attendees', { ascending: false })
        .limit(limit)
        .then(res => {
          const elapsed = Date.now() - startTime;
          console.log(`✅ Events: ${res.data?.length || 0} events (${elapsed}ms)`);
          return res;
        })
        .catch(err => {
          console.error('❌ Events query failed:', err);
          return { data: [], error: err };
        }),

      // Trending service providers
      supabase
        .from('service_provider_profiles')
        .select(`
          user_id,
          display_name,
          headline,
          bio,
          categories,
          default_rate,
          rate_currency,
          average_rating,
          review_count,
          status,
          is_verified,
          created_at,
          updated_at
        `)
        .eq('status', 'active')
        .order('review_count', { ascending: false })
        .limit(limit)
        .then(res => {
          const elapsed = Date.now() - startTime;
          console.log(`✅ Providers: ${res.data?.length || 0} providers (${elapsed}ms)`);
          return res;
        })
        .catch(err => {
          console.error('❌ Providers query failed:', err);
          return { data: [], error: err };
        }),

      // Active venues
      supabase
        .from('venues')
        .select(`
          id,
          owner_id,
          name,
          description,
          address,
          capacity,
          amenities,
          status,
          created_at
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit)
        .then(res => {
          const elapsed = Date.now() - startTime;
          console.log(`✅ Venues: ${res.data?.length || 0} venues (${elapsed}ms)`);
          return res;
        })
        .catch(err => {
          console.error('❌ Venues query failed:', err);
          return { data: [], error: err };
        })
    ]);

    // Format duration helper
    const formatDuration = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Format count helper
    const formatCount = (count: number): string => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
      return count.toString();
    };

    // Format event date
    const formatEventDate = (dateString: string): string => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    };

    // Format event price
    const formatEventPrice = (priceGbp: number | null, priceNgn: number | null, country: string | null): string => {
      if (country === 'Nigeria' && priceNgn) return `₦${priceNgn.toLocaleString()}`;
      if (priceGbp) return `£${priceGbp.toLocaleString()}`;
      return 'Free';
    };

    // Process results
    if (musicResult.data && Array.isArray(musicResult.data)) {
      results.music = musicResult.data.map((track: any) => ({
        ...track,
        formatted_duration: formatDuration(track.duration || 0),
        formatted_play_count: formatCount(track.play_count || 0),
        formatted_like_count: formatCount(track.like_count || 0),
        creator_name: track.creator?.display_name || 'Unknown Artist'
      }));
    }

    if (eventsResult.data && Array.isArray(eventsResult.data)) {
      results.events = eventsResult.data.map((event: any) => ({
        ...event,
        formatted_date: formatEventDate(event.event_date),
        formatted_price: formatEventPrice(event.price_gbp, event.price_ngn, event.creator?.country),
        attendee_count: event.current_attendees || 0,
        creator_name: event.creator?.display_name || 'Unknown Organizer'
      }));
    }

    if (providersResult.data && Array.isArray(providersResult.data)) {
      results.services = providersResult.data;
    }

    if (venuesResult.data && Array.isArray(venuesResult.data)) {
      results.venues = venuesResult.data;
    }

    results.total_results =
      results.music.length +
      results.creators.length +
      results.events.length +
      results.podcasts.length +
      results.services.length +
      results.venues.length;

    const totalTime = Date.now() - startTime;
    console.log(`✅ Server-side trending content complete in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      data: results,
      loadTime: totalTime,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Server-side trending content failed after ${totalTime}ms:`, error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to load trending content',
        loadTime: totalTime 
      },
      { status: 500 }
    );
  }
}

