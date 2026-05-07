import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Assigns SoundBridge ISRC to an existing track.
 * Body: { trackId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const trackId = typeof body?.trackId === 'string' ? body.trackId.trim() : '';
    if (!trackId) {
      return NextResponse.json({ error: 'trackId is required' }, { status: 400 });
    }

    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('id, creator_id, is_cover, isrc_code')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 });
    }
    if (track.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (track.isrc_code) {
      return NextResponse.json({ isrc: track.isrc_code, message: 'Track already has ISRC' });
    }
    if (track.is_cover) {
      return NextResponse.json({ error: 'ISRC auto-assignment is disabled for cover tracks' }, { status: 400 });
    }

    const { data: isrc, error } = await supabase.rpc('assign_soundbridge_isrc', {
      p_track_id: trackId,
    });

    if (error) {
      console.error('ISRC generation error:', error);
      return NextResponse.json({ error: 'Failed to generate ISRC' }, { status: 500 });
    }

    return NextResponse.json({ isrc: isrc as string });
  } catch (err) {
    console.error('ISRC next API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
