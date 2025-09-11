import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    console.log('🔥 Trending tracks API called');
    
    const supabase = createRouteHandlerClient({ cookies });

    // Get trending tracks ordered by play count
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
      .eq('is_public', true)
      .not('genre', 'eq', 'podcast')
      .not('genre', 'eq', 'Podcast')
      .not('genre', 'eq', 'PODCAST')
      .order('play_count', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error fetching trending tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trending tracks', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Fetched trending tracks:', tracks?.length);
    if (tracks && tracks.length > 0) {
      tracks.forEach((track, index) => {
        console.log(`🔥 Track ${index + 1}: "${track.title}" - Plays: ${track.play_count}`);
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

    console.log('✅ Returning formatted trending tracks:', formattedTracks.length);

    return NextResponse.json({
      success: true,
      tracks: formattedTracks
    });

  } catch (error) {
    console.error('❌ Unexpected error in trending tracks API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
