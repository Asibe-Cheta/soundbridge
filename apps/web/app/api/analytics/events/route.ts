import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

/**
 * POST /api/analytics/events
 *
 * Generic client-side analytics event ingestion. Consumed by the mobile
 * app's event queue (flushEvents), starting with the "Vote for SoundBridge"
 * campaign engagement events. Requires authentication — matches the
 * mobile client's existing behaviour of only flushing queued events once
 * the user is signed in.
 *
 * Request body:
 * {
 *   "events": [
 *     { "category": "User Action", "action": "vote_now_tapped", "label"?: string,
 *       "value"?: number, "properties"?: object, "timestamp": "2026-10-22T10:00:00.000Z" }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getSupabaseRouteClient(request, true);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const events = Array.isArray(body?.events) ? body.events : null;
  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'events must be a non-empty array' }, { status: 400 });
  }

  const rows = events
    .filter((e: any) => e && typeof e.category === 'string' && typeof e.action === 'string')
    .slice(0, 200)
    .map((e: any) => ({
      user_id: user.id,
      category: e.category,
      action: e.action,
      label: typeof e.label === 'string' ? e.label : null,
      value: typeof e.value === 'number' ? e.value : null,
      properties: e.properties && typeof e.properties === 'object' ? e.properties : {},
      client_timestamp: typeof e.timestamp === 'string' ? e.timestamp : null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid events in payload' }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await serviceClient.from('analytics_events').insert(rows);

  if (error) {
    console.error('Error inserting analytics events:', error);
    return NextResponse.json({ error: 'Failed to record events' }, { status: 500 });
  }

  return NextResponse.json({ success: true, recorded: rows.length });
}
