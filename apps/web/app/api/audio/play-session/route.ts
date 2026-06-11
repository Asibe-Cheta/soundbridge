import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || null;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * POST /api/audio/play-session
 * Records a play via record_play_session RPC (fraud rules + play_count).
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getSupabaseRouteClient(request, false);
    const body = await request.json();
    const { trackId, durationListened, totalDuration, completed } = body;

    if (!trackId || durationListened === undefined) {
      return NextResponse.json(
        { error: 'trackId and durationListened are required' },
        { status: 400, headers: corsHeaders },
      );
    }

    const service = createServiceClient();
    const { data, error } = await service.rpc('record_play_session', {
      p_track_id: trackId,
      p_user_id: user?.id || null,
      p_play_duration_seconds: Math.round(Number(durationListened)),
      p_completed: Boolean(completed),
      p_ip_address: clientIp(request),
    });

    if (error) {
      console.error('[play-session]', error);
      const { error: legacyError } = await service.rpc('record_valid_play_session', {
        p_track_id: trackId,
        p_user_id: user?.id || null,
        p_play_duration_seconds: Math.round(Number(durationListened)),
        p_completed: Boolean(completed),
      });
      if (legacyError) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
      return NextResponse.json(
        { success: true, recorded: true, legacy: true, totalDuration: totalDuration ?? null },
        { headers: corsHeaders },
      );
    }

    const result = (data ?? {}) as {
      is_valid?: boolean;
      is_suspicious?: boolean;
      is_rejected?: boolean;
      fraud_reason?: string | null;
      play_count?: number | null;
    };

    return NextResponse.json(
      {
        success: true,
        recorded: Boolean(result.is_valid && !result.is_rejected),
        ...result,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[play-session]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
