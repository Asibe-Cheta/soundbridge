import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID is required' },
        { status: 400 }
      );
    }

    // Get current play count
    const { data: track, error: fetchError } = await supabase
      .from('audio_tracks')
      .select('play_count')
      .eq('id', trackId)
      .single();

    if (fetchError) {
      console.error('Error fetching track:', fetchError);
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    const currentPlayCount = track.play_count || 0;
    const newPlayCount = currentPlayCount + 1;

    // Update play count
    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update({ play_count: newPlayCount })
      .eq('id', trackId);

    if (updateError) {
      console.error('Error updating play count:', updateError);
      return NextResponse.json(
        { error: 'Failed to update play count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      playCount: newPlayCount
    });

  } catch (error) {
    console.error('Error in update play count API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
