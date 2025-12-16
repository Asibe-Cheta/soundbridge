import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/src/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/playlists/:playlistId/tracks
 * Add track to playlist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {}
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { playlistId } = params;
    const body = await request.json();
    const { track_id, position } = body;

    if (!track_id) {
      return NextResponse.json(
        { error: 'track_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('creator_id')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (playlist.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only add tracks to your own playlists' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Verify track exists and is public
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('id, is_public')
      .eq('id', track_id)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Determine position if not provided
    let finalPosition = position;
    if (!finalPosition) {
      // Get the next available position
      const { data: existingTracks } = await supabase
        .from('playlist_tracks')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      finalPosition = existingTracks && existingTracks.length > 0
        ? existingTracks[0].position + 1
        : 1;
    }

    // Add track to playlist
    const { data: playlistTrack, error: insertError } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlistId,
        track_id: track_id,
        position: finalPosition,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding track to playlist:', insertError);

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Track is already in this playlist or position is taken' },
          { status: 409, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add track to playlist', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: playlistTrack },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in POST /api/playlists/:playlistId/tracks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
