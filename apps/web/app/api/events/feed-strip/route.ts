import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/feed-strip
 * Personalized events for horizontal feed strip (max 10, soonest first).
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const service = createServiceClient();
    const { data, error } = await service.rpc('get_personalized_events', {
      p_user_id: user.id,
      p_limit: 10,
      p_offset: 0,
    });

    if (error) {
      console.error('[feed-strip] get_personalized_events:', error);
      return NextResponse.json({ success: true, events: [] });
    }

    const events = [...(data ?? [])].sort((a: { event_date: string }, b: { event_date: string }) => {
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    });

    return NextResponse.json({
      success: true,
      events: events.slice(0, 10),
    });
  } catch (err: unknown) {
    console.error('[feed-strip] error:', err);
    return NextResponse.json({ success: true, events: [] });
  }
}
