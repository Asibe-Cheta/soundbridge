import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { withQueryTimeout, logPerformance, createErrorResponse } from '@/lib/api-helpers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('🔥 Trending tracks API called');

    const supabase = createRouteHandlerClient({ cookies });

    // OPTIMIZED: Split query to avoid slow JOIN
    // First, get trending track IDs
    const { data: trackIds, error: idsError } = await withQueryTimeout(
      supabase
        .from('audio_tracks')
        .select('id, title, artist_name, cover_art_url, file_url, duration, play_count, like_count, creator_id')
        .eq('is_public', true)
        .not('genre', 'in', '("podcast","Podcast","PODCAST")')
        .order('play_count', { ascending: false })
        .limit(5),
      12000 // 12s timeout to match client-side 15s timeout
    ) as any;

    if (idsError || !trackIds || trackIds.length === 0) {
      console.warn('⚠️ No trending tracks found');
      logPerformance('/api/audio/trending', startTime);
      return NextResponse.json(
        { success: true, tracks: [] },
        { headers: corsHeaders }
      );
    }

    console.log('✅ Fetched trending tracks:', trackIds.length);

    // Then, get creator details separately (faster than JOIN)
    const creatorIds = [...new Set(trackIds.map((t: any) => t.creator_id))];
    const { data: creators } = await withQueryTimeout(
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', creatorIds),
      8000 // 8s timeout for creator lookup
    ) as any;

    // Map creators to tracks
    const creatorsMap = new Map((creators || []).map((c: any) => [c.id, c]));

    // Format the tracks for the frontend
    const formattedTracks = trackIds.map((track: any) => {
      const creator = creatorsMap.get(track.creator_id);
      return {
        id: track.id,
        title: track.title,
        artist: creator?.display_name || track.artist_name || 'Unknown Artist',
        coverArt: track.cover_art_url,
        url: track.file_url,
        duration: track.duration || 0,
        plays: track.play_count || 0,
        likes: track.like_count || 0,
        creator: {
          id: track.creator_id,
          name: creator?.display_name || track.artist_name || 'Unknown Artist',
          username: creator?.username || 'unknown',
          avatar: creator?.avatar_url || null
        }
      };
    });

    console.log('✅ Returning formatted trending tracks:', formattedTracks.length);
    logPerformance('/api/audio/trending', startTime);

    return NextResponse.json(
      {
        success: true,
        tracks: formattedTracks
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Unexpected error in trending tracks API:', error);
    logPerformance('/api/audio/trending', startTime);
    return NextResponse.json(
      createErrorResponse('Failed to fetch trending tracks', { tracks: [] }),
      { status: 200, headers: corsHeaders }
    );
  }
}
