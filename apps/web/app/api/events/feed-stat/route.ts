import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const eventId = String(body.event_id ?? '').trim();
    const field = String(body.field ?? '').trim();

    if (!eventId || (field !== 'feed_impressions' && field !== 'feed_cta_taps')) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const service = createServiceClient();
    const { error } = await service.rpc('increment_event_feed_stat', {
      p_event_id: eventId,
      p_field: field,
    });

    if (error) {
      console.warn('[feed-stat] RPC failed:', error.message);
      return NextResponse.json({ success: false }, { status: 200 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[feed-stat] error:', err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
