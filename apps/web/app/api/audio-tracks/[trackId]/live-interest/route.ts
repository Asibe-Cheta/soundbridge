import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { trackId: string } },
) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401, headers: corsHeaders },
      );
    }

    const trackId = params.trackId;
    const body = await request.json();
    if (typeof body.live_interest_enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'live_interest_enabled must be a boolean' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('creator_id, is_mixtape, content_type')
      .eq('id', trackId)
      .maybeSingle();

    if (trackError || !track) {
      return NextResponse.json(
        { success: false, message: 'Track not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    if (track.creator_id !== user.id) {
      return NextResponse.json(
        { success: false, message: 'You can only update your own tracks' },
        { status: 403, headers: corsHeaders },
      );
    }

    const isMusic =
      !track.is_mixtape &&
      (track.content_type === 'music' || track.content_type == null);

    if (!isMusic) {
      return NextResponse.json(
        { success: false, message: 'Live interest applies to music tracks only' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { error: updateError } = await supabase
      .from('audio_tracks')
      .update({ live_interest_enabled: body.live_interest_enabled })
      .eq('id', trackId);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message || 'Failed to update live interest' },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        live_interest_enabled: body.live_interest_enabled,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[audio-tracks/live-interest]', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
