import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { LIVE_INTEREST_AVAILABILITY_OPTIONS } from '@/src/lib/discovery-intelligence';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

const ALLOWED_PREFS = LIVE_INTEREST_AVAILABILITY_OPTIONS.map((o) => o.id);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/live-interest
 * Submit live interest for a track (syncs track_quality_signals via DB trigger).
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { trackId, respondedYes, availabilityPreference } = body;

    if (!trackId) {
      return NextResponse.json({ error: 'trackId is required' }, { status: 400, headers: corsHeaders });
    }

    const { data: track, error: trackError } = await supabase
      .from('audio_tracks')
      .select('live_interest_enabled, is_mixtape, content_type')
      .eq('id', trackId)
      .maybeSingle();

    if (trackError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404, headers: corsHeaders });
    }

    const isMusic =
      !track.is_mixtape &&
      (track.content_type === 'music' || track.content_type == null);

    if (!isMusic || track.live_interest_enabled === false) {
      return NextResponse.json(
        { error: 'Live interest is not enabled for this track' },
        { status: 400, headers: corsHeaders },
      );
    }

    const pref =
      typeof availabilityPreference === 'string' && ALLOWED_PREFS.includes(availabilityPreference)
        ? availabilityPreference
        : null;

    const { data, error } = await supabase
      .from('live_interest_responses')
      .upsert(
        {
          track_id: trackId,
          user_id: user.id,
          responded_yes: Boolean(respondedYes),
          availability_preference: pref,
        },
        { onConflict: 'track_id,user_id' },
      )
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, id: data?.id }, { headers: corsHeaders });
  } catch (e) {
    console.error('[live-interest]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
