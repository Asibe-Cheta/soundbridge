import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

// CORS headers for mobile app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST - Add track(s) to playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { id: playlistId } = await params;
    const body = await request.json();
    const { track_id, track_ids, position } = body;

    // Verify playlist exists and user owns it
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
        { error: 'Unauthorized: You can only add tracks to your own playlists' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Support both single track_id and array of track_ids
    const trackIds = track_ids || (track_id ? [track_id] : []);

    if (!trackIds || trackIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one track_id is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get current max position in playlist
    const { data: existingTracks } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);

    let nextPosition = position !== undefined ? position : ((existingTracks?.[0]?.position || -1) + 1);

    // Verify all tracks exist
    const { data: tracks, error: tracksError } = await supabase
      .from('audio_tracks')
      .select('id')
      .in('id', trackIds);

    if (tracksError || !tracks || tracks.length !== trackIds.length) {
      return NextResponse.json(
        { error: 'One or more tracks not found' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Insert tracks into playlist
    const tracksToInsert = trackIds.map((tid: string, index: number) => ({
      playlist_id: playlistId,
      track_id: tid,
      position: nextPosition + index
    }));

    const { data: insertedTracks, error: insertError } = await supabase
      .from('playlist_tracks')
      .insert(tracksToInsert)
      .select();

    if (insertError) {
      // Handle duplicate track error gracefully
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'One or more tracks are already in this playlist' },
          { status: 400, headers: corsHeaders }
        );
      }
      console.error('Error adding tracks to playlist:', insertError);
      return NextResponse.json(
        { error: 'Failed to add tracks to playlist', details: insertError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update playlist tracks_count
    const { error: updateError } = await supabase.rpc('increment', {
      table_name: 'playlists',
      column_name: 'tracks_count',
      row_id: playlistId,
      increment_value: insertedTracks.length
    });

    if (updateError) {
      console.error('Error updating tracks_count:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      tracks: insertedTracks,
      message: `Added ${insertedTracks.length} track(s) to playlist`
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Add tracks to playlist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE - Remove track from playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { id: playlistId } = await params;
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get('track_id');

    if (!trackId) {
      return NextResponse.json(
        { error: 'track_id query parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify playlist exists and user owns it
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
        { error: 'Unauthorized: You can only remove tracks from your own playlists' },
        { status: 403, headers: corsHeaders }
      );
    }

    // Remove track from playlist
    const { error: deleteError } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId);

    if (deleteError) {
      console.error('Error removing track from playlist:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove track from playlist', details: deleteError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update playlist tracks_count
    const { error: updateError } = await supabase.rpc('increment', {
      table_name: 'playlists',
      column_name: 'tracks_count',
      row_id: playlistId,
      increment_value: -1
    });

    if (updateError) {
      console.error('Error updating tracks_count:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Track removed from playlist'
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Remove track from playlist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

