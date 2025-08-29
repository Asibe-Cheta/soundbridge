import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trackId, action } = body; // action: 'like' or 'unlike'

    if (!trackId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current like count
    const { data: track, error: fetchError } = await supabase
      .from('audio_tracks')
      .select('like_count')
      .eq('id', trackId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      );
    }

    const currentLikes = track.like_count || 0;
    const newLikeCount = action === 'like' ? currentLikes + 1 : Math.max(0, currentLikes - 1);

    // Update the like count
    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update({ like_count: newLikeCount })
      .eq('id', trackId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update like count' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      newLikeCount
    });

  } catch (error) {
    console.error('Error updating like count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
