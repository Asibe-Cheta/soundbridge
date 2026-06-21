import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';
import { sendCreatorLiveEmailForRequest } from '@/src/lib/distribution-email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Called by Supabase DB trigger when admin marks track_status = live */
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = String(body.requestId ?? body.request_id ?? '').trim();
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    const service = createServiceClient();
    const sent = await sendCreatorLiveEmailForRequest(service, requestId);

    return NextResponse.json({ ok: sent });
  } catch (e) {
    console.error('[distribution/on-track-live]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
