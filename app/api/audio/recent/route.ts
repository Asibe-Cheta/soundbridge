import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get recent tracks from all creators, ordered by creation date
    const { data: tracks, error } = await supabase
      .from('audio_tracks')
      .select(`
        id,
        title,
        description,
        genre,
        play_count,
        likes_count,
        created_at,
        cover_art_url,
        duration,
        creator_id
      `)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Error fetching recent tracks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent tracks', details: error.message },
        { status: 500 }
      );
    }

    // Format the tracks for the frontend
    const formattedTracks = tracks.map(track => ({
      id: track.id,
      title: track.title,
      description: track.description,
      genre: track.genre,
      plays: track.play_count || 0,
      likes: track.likes_count || 0,
      duration: track.duration,
      coverArt: track.cover_art_url,
      uploadedAt: track.created_at,
      creator: {
        id: track.creator_id,
        name: 'Unknown Artist', // We'll add creator info later
        username: 'unknown',
        avatar: null
      }
    }));

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
