import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { getLiveInputCredentials } from '@/src/lib/cloudflare-stream';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Re-fetches RTMP URL + stream key from Cloudflare for a stream the caller
 * owns — e.g. if the app was killed and reopened mid-stream and needs to
 * reconnect the broadcast. Never stored in our own DB; always sourced live
 * from Cloudflare and scoped to the owning creator only.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const supabase = createServiceClient();
  const { data: stream } = await supabase
    .from('live_streams')
    .select('id, user_id, cloudflare_stream_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!stream || stream.user_id !== user.id) {
    return NextResponse.json({ error: 'Stream not found' }, { status: 404, headers: corsHeaders });
  }
  if (stream.status !== 'active') {
    return NextResponse.json({ error: 'This stream has already ended' }, { status: 409, headers: corsHeaders });
  }

  try {
    const credentials = await getLiveInputCredentials(stream.cloudflare_stream_id);
    if (!credentials) {
      return NextResponse.json(
        { error: 'We are currently running some improvements to our live feature. Please bear with us and try again shortly.' },
        { status: 500, headers: corsHeaders },
      );
    }
    return NextResponse.json(
      { rtmpUrl: credentials.rtmpUrl, streamKey: credentials.streamKey, hlsPlaybackUrl: credentials.hlsPlaybackUrl },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[live-streams/credentials] failed:', error);
    return NextResponse.json(
      { error: 'We are currently running some improvements to our live feature. Please bear with us and try again shortly.' },
      { status: 500, headers: corsHeaders },
    );
  }
}
