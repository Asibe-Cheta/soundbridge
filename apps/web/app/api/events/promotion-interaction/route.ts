import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import {
  isEventPromotionSource,
  recordEventPromotionInteraction,
} from '@/src/lib/event-promotion-tracking';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/events/promotion-interaction
 * Body: { event_id: string, source: notification|feed_card|shared_link|direct_search|other }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, supabase, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const eventId = String(body.event_id ?? body.eventId ?? '').trim();
    const source = String(body.source ?? '').trim().toLowerCase();

    if (!eventId) {
      return NextResponse.json({ error: 'event_id required' }, { status: 400, headers: corsHeaders });
    }
    if (!isEventPromotionSource(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400, headers: corsHeaders });
    }

    await recordEventPromotionInteraction(supabase, user.id, eventId, source);

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (err) {
    console.error('[events/promotion-interaction]', err);
    return NextResponse.json({ success: false }, { status: 500, headers: corsHeaders });
  }
}
