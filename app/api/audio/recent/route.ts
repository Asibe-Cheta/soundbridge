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
    // Exclude podcasts (genre = 'podcast') - podcasts should only appear in the podcasts section
    const { data: tracks, error } = await supabase
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
      .not('genre', 'eq', 'podcast')
      .not('genre', 'eq', 'Podcast')
      .not('genre', 'eq', 'PODCAST')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching recent tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent tracks', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Fetched tracks (excluding podcasts):', tracks?.length);
    console.log('✅ Track genres:', tracks?.map(t => t.genre));
    if (tracks && tracks.length > 0) {
      tracks.forEach((track, index) => {
        console.log(`🎵 Track ${index + 1}: "${track.title}" - File URL: ${track.file_url}`);
        console.log(`🎵 Track ${index + 1} creator data:`, {
          creator_id: track.creator_id,
          creator: track.creator,
          display_name: track.creator?.display_name
        });
      });
    }

    // Format the tracks for the frontend
    const formattedTracks = tracks.map(track => ({
      id: track.id,
      title: track.title,
      artist: track.creator?.display_name || track.artist_name || 'Unknown Artist',
      coverArt: track.cover_art_url,
      url: track.file_url,
      duration: track.duration || 0,
      plays: track.play_count || 0,
      likes: track.like_count || 0,
      creator: {
        id: track.creator_id,
        name: track.creator?.display_name || track.artist_name || 'Unknown Artist',
        username: track.creator?.username || 'unknown',
        avatar: track.creator?.avatar_url || null
      }
    }));

    console.log('✅ Returning formatted tracks:', formattedTracks.length);
    if (formattedTracks && formattedTracks.length > 0) {
      formattedTracks.forEach((track, index) => {
        console.log(`🎵 Formatted Track ${index + 1}:`, {
          id: track.id,
          title: track.title,
          artist: track.artist,
          creator_name: track.creator.name
        });
      });
    }

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
