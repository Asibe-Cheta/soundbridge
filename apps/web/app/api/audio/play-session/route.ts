import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { isValidPlayDuration } from '@/src/lib/discovery-intelligence';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/audio/play-session
 * Records a valid play (≥30s or ≥50% duration) into play_sessions + track_quality_signals.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getSupabaseRouteClient(request, false);
    const body = await request.json();
    const { trackId, durationListened, totalDuration, completed } = body;

    if (!trackId || durationListened === undefined || totalDuration === undefined) {
      return NextResponse.json(
        { error: 'trackId, durationListened, and totalDuration are required' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (!isValidPlayDuration(Number(durationListened), Number(totalDuration))) {
      return NextResponse.json(
        { success: true, recorded: false, reason: 'below_minimum_listen_threshold' },
        { headers: corsHeaders },
      );
    }

    const service = createServiceClient();
    const { error } = await service.rpc('record_valid_play_session', {
      p_track_id: trackId,
      p_user_id: user?.id || null,
      p_play_duration_seconds: Math.round(Number(durationListened)),
      p_completed: Boolean(completed),
    });

    if (error) {
      console.error('[play-session]', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, recorded: true }, { headers: corsHeaders });
  } catch (e) {
    console.error('[play-session]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
