import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('🎵 Recent tracks API called');
    
    const supabase = createRouteHandlerClient({ cookies });

    // First, test the connection
    const { data: testData, error: testError } = await supabase
      .from('audio_tracks')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Test query failed:', testError);
      return NextResponse.json(
        { error: 'Database connection failed', details: testError.message },
        { status: 500 }
      );
    }

    console.log('✅ Database connection successful');

    // Get recent tracks from all creators, ordered by creation date
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching recent tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent tracks', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Fetched tracks:', tracks?.length);

    // Format the tracks for the frontend
    const formattedTracks = tracks.map(track => ({
      id: track.id,
      title: track.title,
      coverArt: track.cover_art_url,
      url: track.file_url,
      duration: track.duration || 0,
      plays: track.play_count || 0,
      likes: track.likes_count || 0,
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

  } catch (error) {
    console.error('Error in recent tracks API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
