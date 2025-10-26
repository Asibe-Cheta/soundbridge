import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    const { id: playlistId } = await params;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch playlist details
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select(`
        id,
        name,
        description,
        cover_image_url,
        tracks_count,
        total_duration,
        followers_count,
        is_public,
        created_at,
        updated_at,
        creator:profiles!playlists_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq('id', playlistId)
      .single();

    if (playlistError) {
      console.error('Error fetching playlist:', playlistError);
      return NextResponse.json(
        { error: 'Playlist not found', details: playlistError.message },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch playlist tracks
    const { data: playlistTracks, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select(`
        id,
        position,
        added_at,
        track:audio_tracks!playlist_tracks_track_id_fkey(
          id,
          title,
          description,
          file_url,
          cover_art_url,
          duration,
          genre,
          play_count,
          likes_count,
          is_public,
          created_at,
          creator:profiles!audio_tracks_creator_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (tracksError) {
      console.error('Error fetching playlist tracks:', tracksError);
      return NextResponse.json(
        { error: 'Failed to fetch playlist tracks', details: tracksError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ Fetched playlist "${playlist.name}" with ${playlistTracks?.length || 0} tracks`);

    return NextResponse.json({
      success: true,
      playlist: {
        ...playlist,
        tracks: playlistTracks || []
      },
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error fetching playlist:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    }
  });
}
