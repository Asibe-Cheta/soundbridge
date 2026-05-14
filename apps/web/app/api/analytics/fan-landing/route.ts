import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/src/lib/supabase';

const ALLOWED_EVENTS = new Set([
  'page_viewed',
  'track_played',
  'tip_button_tapped',
  'tip_completed',
  'app_download_cta_tapped',
  'web_signup_cta_tapped',
]);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Anonymous fan-landing analytics (service role insert). Best-effort; never blocks UX.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      creatorId?: string;
      eventType?: string;
      metadata?: Record<string, unknown>;
    } | null;

    const creatorId = typeof body?.creatorId === 'string' ? body.creatorId.trim() : '';
    const eventType = typeof body?.eventType === 'string' ? body.eventType.trim() : '';
    if (!creatorId || !eventType || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const supabase = createServerClient();
    const { data: exists } = await supabase.from('profiles').select('id').eq('id', creatorId).maybeSingle();
    if (!exists) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const { error } = await supabase.from('fan_landing_analytics_events').insert({
      creator_id: creatorId,
      event_type: eventType,
      metadata: (body?.metadata && typeof body.metadata === 'object' ? body.metadata : {}) as Record<
        string,
        unknown
      >,
    });
    if (error) {
      console.warn('[fan-landing analytics]', error.message);
    }
    return NextResponse.json({ ok: true, tracked: !error });
  } catch (e) {
    console.warn('[fan-landing analytics]', e);
    return NextResponse.json({ ok: true, tracked: false });
  }
}
