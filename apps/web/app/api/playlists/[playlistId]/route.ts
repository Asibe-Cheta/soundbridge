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
 * GET /api/playlists/:playlistId
 * Get playlist details with tracks
 */
export async function GET(
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

    const { playlistId } = params;

    // Get playlist with creator info and tracks
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select(`
        *,
        creator:profiles!playlists_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        playlist_tracks(
          id,
          position,
          added_at,
          track:audio_tracks(
            id,
            title,
            cover_image_url,
            audio_url,
            duration,
            genre,
            play_count,
            like_count,
            is_public,
            created_at,
            creator:profiles!audio_tracks_creator_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        )
      `)
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Sort tracks by position
    if (playlist.playlist_tracks) {
      playlist.playlist_tracks.sort((a, b) => a.position - b.position);
    }

    return NextResponse.json(
      { data: playlist },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in GET /api/playlists/:playlistId:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT /api/playlists/:playlistId
 * Update playlist details
 */
export async function PUT(
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
    const { name, description, cover_image_url, is_public } = body;

    // Verify playlist ownership
    const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('creator_id')
      .eq('id', playlistId)
      .single();

    if (fetchError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (playlist.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only update your own playlists' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Update playlist
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data: updatedPlaylist, error: updateError } = await supabase
      .from('playlists')
      .update(updateData)
      .eq('id', playlistId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating playlist:', updateError);
      return NextResponse.json(
        { error: 'Failed to update playlist', details: updateError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { data: updatedPlaylist },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in PUT /api/playlists/:playlistId:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * DELETE /api/playlists/:playlistId
 * Delete playlist (cascade deletes playlist_tracks)
 */
export async function DELETE(
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

    // Verify playlist ownership
    const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('creator_id')
      .eq('id', playlistId)
      .single();

    if (fetchError || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (playlist.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only delete your own playlists' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Delete playlist (playlist_tracks will cascade delete)
    const { error: deleteError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (deleteError) {
      console.error('Error deleting playlist:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete playlist', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: 'Playlist deleted successfully' },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error in DELETE /api/playlists/:playlistId:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
