import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { endLiveStream } from '@/src/lib/live-stream-lifecycle';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error: authError } = await getSupabaseRouteClient(request, true);
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const supabase = createServiceClient();

  const { data: stream } = await supabase
    .from('live_streams')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!stream || stream.user_id !== user.id) {
    return NextResponse.json({ error: 'Stream not found' }, { status: 404, headers: corsHeaders });
  }

  try {
    await endLiveStream(supabase, id, 'creator_ended');
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('[live-streams/end] failed:', error);
    return NextResponse.json(
      { error: 'We are currently running some improvements to our live feature. Please bear with us and try again shortly.' },
      { status: 500, headers: corsHeaders },
    );
  }
}
