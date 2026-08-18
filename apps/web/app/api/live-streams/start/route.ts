import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { checkLiveStreamEligibility, LIVE_STREAM_INELIGIBLE_MESSAGE } from '@/src/lib/live-stream-eligibility';
import { createLiveInput } from '@/src/lib/cloudflare-stream';
import { notifyFollowersLiveStreamStarted } from '@/src/lib/live-stream-notifications';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const GENERIC_ERROR_MESSAGE =
  'We are currently running some improvements to our live feature. Please bear with us and try again shortly.';

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  let body: { title?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : null;

  const supabase = createServiceClient();

  try {
    const eligibility = await checkLiveStreamEligibility(supabase, user.id);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: LIVE_STREAM_INELIGIBLE_MESSAGE, eligible: false },
        { status: 403, headers: corsHeaders },
      );
    }

    const { data: existingActive } = await supabase
      .from('live_streams')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (existingActive) {
      return NextResponse.json(
        { error: "You're already live. End your current stream before starting a new one.", liveStreamId: existingActive.id },
        { status: 409, headers: corsHeaders },
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .maybeSingle();
    const creatorName = profile?.display_name || profile?.username || 'A creator you follow';

    const { liveInput, rtmpUrl, streamKey, hlsPlaybackUrl } = await createLiveInput({
      name: `${user.id}-${Date.now()}`,
    });

    const { data: liveStream, error: insertError } = await supabase
      .from('live_streams')
      .insert({
        user_id: user.id,
        cloudflare_stream_id: liveInput.uid,
        status: 'active',
        title,
      })
      .select('id, started_at')
      .single();

    if (insertError || !liveStream) {
      console.error('[live-streams/start] insert failed:', insertError);
      return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500, headers: corsHeaders });
    }

    // Fire-and-forget — never let a push failure affect the stream actually starting.
    void notifyFollowersLiveStreamStarted(supabase, {
      creatorId: user.id,
      creatorName,
      liveStreamId: liveStream.id,
    });

    return NextResponse.json(
      {
        success: true,
        liveStreamId: liveStream.id,
        startedAt: liveStream.started_at,
        rtmpUrl,
        streamKey,
        hlsPlaybackUrl,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[live-streams/start] failed:', error);
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500, headers: corsHeaders });
  }
}
