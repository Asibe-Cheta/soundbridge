/**
 * POST /api/gigs/:id/respond — Provider accept/decline; update gig_responses, record rate limit
 * WEB_TEAM_URGENT_GIGS_BACKEND_REQUIREMENTS.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: CORS });
    }

    const { id: gigId } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action === 'accept' ? 'accept' : 'decline';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : null;

    const service = createServiceClient();

    const { data: responseRow, error: respErr } = await service
      .from('gig_responses')
      .select('id, provider_id, status, notified_at')
      .eq('gig_id', gigId)
      .eq('provider_id', user.id)
      .single();

    if (respErr || !responseRow) {
      return NextResponse.json({ success: false, error: 'Response not found' }, { status: 404, headers: CORS });
    }
    if (responseRow.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Already responded' }, { status: 400, headers: CORS });
    }

    const respondedAt = new Date();
    const notifiedAt = responseRow.notified_at ? new Date(responseRow.notified_at) : null;
    const responseTimeSeconds = notifiedAt ? Math.round((respondedAt.getTime() - notifiedAt.getTime()) / 1000) : null;

    const { error: updateErr } = await service
      .from('gig_responses')
      .update({
        status: action === 'accept' ? 'accepted' : 'declined',
        responded_at: respondedAt.toISOString(),
        response_time_seconds: responseTimeSeconds,
        message: message || null,
      })
      .eq('id', responseRow.id);

    if (updateErr) {
      console.error('gig_responses update:', updateErr);
      return NextResponse.json({ success: false, error: 'Failed to update response' }, { status: 500, headers: CORS });
    }

    await service.from('notification_rate_limits').insert({
      user_id: user.id,
      notification_type: 'urgent_gig',
      sent_at: respondedAt.toISOString(),
      gig_id: gigId,
      action: action === 'accept' ? 'accepted' : 'declined',
    });

    if (action === 'accept') {
      const { data: gig } = await service.from('opportunity_posts').select('user_id, skill_required').eq('id', gigId).single();
      if (gig?.user_id) {
        await service.from('notifications').insert({
          user_id: gig.user_id,
          type: 'gig_accepted',
          title: 'Provider accepted your gig',
          body: `${user.id} accepted your urgent gig`,
          related_id: gigId,
          related_type: 'opportunity_post',
          metadata: { gig_id: gigId, response_id: responseRow.id },
        });
      }
    }

    return NextResponse.json({ success: true }, { headers: CORS });
  } catch (e) {
    console.error('POST /api/gigs/[id]/respond:', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
