import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import {
  type FeatureNudgeType,
  FEATURE_NUDGE_TYPES,
  evaluateAiAdviserNudge,
  ensureAiAdviserNudgeRow,
  getFirstUploadTrack,
  hasQualifyingAiAdviserActivity,
} from '@/src/lib/feature-nudge-conditions';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/** GET /api/feature-nudges — pending deferred nudges + data verification snapshot */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const service = createServiceClient();
    const aiStatus = await evaluateAiAdviserNudge(service, user.id);
    const activity = await hasQualifyingAiAdviserActivity(service, user.id);

    return NextResponse.json(
      {
        aiCareerAdviser: aiStatus,
        tracking: {
          playSessionsViaRpc: true,
          playCountSource: 'audio_tracks.play_count (via record_play_session)',
          tipsSource: 'tips.recipient_id where status=completed',
          repeatListenSource: 'track_quality_signals.repeat_listens + play_sessions duplicate user/track',
          ...activity,
        },
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[feature-nudges GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

/** POST /api/feature-nudges — register uploads, mark shown/dismissed */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '').trim();
    const service = createServiceClient();

    if (action === 'register_first_upload') {
      const trackId = String(body.trackId ?? body.track_id ?? '').trim();
      if (!trackId) {
        return NextResponse.json({ error: 'trackId is required' }, { status: 400, headers: corsHeaders });
      }

      const { data: track } = await service
        .from('audio_tracks')
        .select('id, created_at, creator_id')
        .eq('id', trackId)
        .maybeSingle();

      if (!track || track.creator_id !== user.id) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404, headers: corsHeaders });
      }

      const firstUpload = await getFirstUploadTrack(service, user.id);
      const isFirst = firstUpload?.trackId === trackId;

      if (isFirst && track.created_at) {
        await ensureAiAdviserNudgeRow(service, user.id, trackId, track.created_at);
      }

      return NextResponse.json({ ok: true, isFirstUpload: isFirst }, { headers: corsHeaders });
    }

    if (action === 'mark_shown' || action === 'mark_dismissed') {
      const nudgeType = String(body.nudgeType ?? body.nudge_type ?? '').trim() as FeatureNudgeType;
      if (!FEATURE_NUDGE_TYPES.includes(nudgeType)) {
        return NextResponse.json({ error: 'Invalid nudgeType' }, { status: 400, headers: corsHeaders });
      }

      const now = new Date().toISOString();
      const trackId = body.trackId ?? body.track_id ?? null;
      const relatedUserId = body.relatedUserId ?? body.related_user_id ?? null;
      const bookingId = body.bookingId ?? body.booking_id ?? null;
      const metadata = bookingId ? { booking_id: String(bookingId) } : {};

      const patch =
        action === 'mark_shown'
          ? { shown_at: now, updated_at: now }
          : { dismissed_at: now, updated_at: now };

      let query = service
        .from('creator_context_nudges')
        .select('id')
        .eq('user_id', user.id)
        .eq('nudge_type', nudgeType);

      if (trackId) query = query.eq('track_id', trackId);
      if (relatedUserId) query = query.eq('related_user_id', relatedUserId);
      if (bookingId) query = query.contains('metadata', { booking_id: String(bookingId) });

      const { data: existing } = await query.maybeSingle();

      if (existing?.id) {
        await service.from('creator_context_nudges').update(patch).eq('id', existing.id);
      } else {
        await service.from('creator_context_nudges').insert({
          user_id: user.id,
          nudge_type: nudgeType,
          track_id: trackId,
          related_user_id: relatedUserId,
          metadata,
          ...patch,
        });
      }

      return NextResponse.json({ ok: true }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error('[feature-nudges POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
