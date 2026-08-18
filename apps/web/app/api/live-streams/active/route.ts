import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { buildHlsPlaybackUrl } from '@/src/lib/cloudflare-stream';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/live-streams/active?userId=<creatorId>
 * Used by: web's public creator profile (live indicator badge), web's own
 * dashboard "Live" tab, and the mobile app's profile screens / viewer entry
 * point. No auth required for the badge use case (matches the "Authenticated
 * users can read active streams" RLS policy's public-viewer intent) — but we
 * still require a session, consistent with every other route in this app,
 * since SoundBridge has no fully-anonymous read paths today.
 */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400, headers: corsHeaders });
  }

  const supabase = createServiceClient();
  const { data: stream, error } = await supabase
    .from('live_streams')
    .select('id, cloudflare_stream_id, title, started_at, viewer_count')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[live-streams/active] failed:', error);
    return NextResponse.json(
      { error: 'We are currently running some improvements to our live feature. Please bear with us and try again shortly.' },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!stream) {
    return NextResponse.json({ live: false }, { headers: corsHeaders });
  }

  return NextResponse.json(
    {
      live: true,
      liveStreamId: stream.id,
      title: stream.title,
      startedAt: stream.started_at,
      viewerCount: stream.viewer_count,
      hlsPlaybackUrl: buildHlsPlaybackUrl(stream.cloudflare_stream_id),
    },
    { headers: corsHeaders },
  );
}
