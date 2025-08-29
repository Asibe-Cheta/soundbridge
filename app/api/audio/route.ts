import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Audio API called with params:', request.url);
    
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const recent = searchParams.get('recent');

    console.log('📊 Search params:', { recent });

    // If recent parameter is set, return recent tracks from all creators
    if (recent === 'true') {
      console.log('🎵 Fetching recent tracks...');
      
      // Start with basic columns that we know exist
      const { data: tracks, error } = await supabase
        .from('audio_tracks')
        .select('id, title, creator_id, cover_art_url')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('📊 Query result:', { tracks: tracks?.length, error });

      if (error) {
        console.error('❌ Error fetching recent tracks:', error);
        return NextResponse.json(
          { error: 'Failed to fetch recent tracks', details: error.message },
          { status: 500 }
        );
      }

      // Format the tracks for the frontend
      const formattedTracks = tracks.map(track => ({
        id: track.id,
        title: track.title,
        coverArt: track.cover_art_url,
        plays: 0,
        likes: 0,
        creator: {
          id: track.creator_id,
          name: 'Unknown Artist',
          username: 'unknown',
          avatar: null
        }
      }));

      console.log('✅ Returning formatted tracks:', formattedTracks.length);

      return NextResponse.json({
        success: true,
        tracks: formattedTracks
      });
    }

    // Default response
    return NextResponse.json({
      success: true,
      tracks: []
    });

  } catch (error) {
    console.error('❌ Audio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 