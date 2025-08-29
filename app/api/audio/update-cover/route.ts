import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { trackId, coverArtUrl } = await request.json();

    if (!trackId || !coverArtUrl) {
      return NextResponse.json(
        { error: 'Track ID and cover art URL are required' },
        { status: 400 }
      );
    }

    // Verify the track belongs to the user
    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('id, creator_id')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    if (track.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own tracks' },
        { status: 403 }
      );
    }

    // Update the track with cover art URL
    const { data: updatedTrack, error: updateError } = await supabase
      .from('audio_tracks')
      .update({ cover_art_url: coverArtUrl })
      .eq('id', trackId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating track:', updateError);
      return NextResponse.json(
        { error: 'Failed to update track' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      track: updatedTrack
    });

  } catch (error) {
    console.error('Error in update-cover API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
