import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/src/lib/supabase';
import { extractClientIp } from '@/src/lib/digital-card-auth';
import { hashIp, checkSurveyRateLimit } from '@/src/lib/survey-rate-limit';
import { SURVEY_KEY, validateSurveyAnswers } from '@/src/lib/survey-notifications-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANON_ID_MAX_LENGTH = 100;

/**
 * Public, write-only endpoint for the notifications-interest survey. The
 * browser never reads or writes survey_responses directly (RLS has zero
 * policies); this route, using the service role, is the only path in.
 * No GET handler -- resuming is entirely client-side (localStorage), so
 * there is nothing for the server to serve back.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Honeypot: real users never see or fill this field. A bot that fills
    // every field hits it. Return a fake success so the bot learns nothing.
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({ ok: true });
    }

    const anonId = typeof body.anon_id === 'string' ? body.anon_id.trim() : '';
    if (!anonId || anonId.length > ANON_ID_MAX_LENGTH) {
      return NextResponse.json({ error: 'anon_id is required' }, { status: 400 });
    }

    const allowedTopLevelKeys = new Set([
      'anon_id',
      'answers',
      'ref',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'completed',
      'website',
    ]);
    for (const key of Object.keys(body)) {
      if (!allowedTopLevelKeys.has(key)) {
        return NextResponse.json({ error: `unknown field: ${key}` }, { status: 400 });
      }
    }

    const validation = validateSurveyAnswers(body.answers ?? {});
    if (validation.ok === false) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const ip = extractClientIp(request);
    const rateLimit = await checkSurveyRateLimit(serviceClient, { ipHash: hashIp(ip), anonId });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests, please slow down.' },
        { status: 429 },
      );
    }

    // Optional signed-in user -- the cookie-based client, not the service
    // client, is what actually knows who's signed in.
    let userId: string | null = null;
    try {
      const routeClient = createRouteHandlerClient({ cookies });
      const {
        data: { session },
      } = await routeClient.auth.getSession();
      userId = session?.user?.id || null;
    } catch (e) {
      console.warn('[survey/notifications] session lookup failed, treating as anonymous:', e);
    }

    const country = request.headers.get('x-vercel-ip-country') || null;

    const ref = typeof body.ref === 'string' && body.ref.trim() ? body.ref.trim().slice(0, 100) : null;
    const utmSource =
      typeof body.utm_source === 'string' && body.utm_source.trim() ? body.utm_source.trim().slice(0, 100) : null;
    const utmMedium =
      typeof body.utm_medium === 'string' && body.utm_medium.trim() ? body.utm_medium.trim().slice(0, 100) : null;
    const utmCampaign =
      typeof body.utm_campaign === 'string' && body.utm_campaign.trim()
        ? body.utm_campaign.trim().slice(0, 100)
        : null;

    // Columns omitted here are left untouched by Postgres on conflict (not
    // reset to null) -- started_at is deliberately never included, so the
    // first-insert default survives every later resume/update.
    const upsertPayload: Record<string, unknown> = {
      survey_key: SURVEY_KEY,
      anon_id: anonId,
      answers: validation.cleaned,
    };
    if (userId) upsertPayload.user_id = userId;
    if (country) upsertPayload.country = country;
    if (ref) upsertPayload.ref = ref;
    if (utmSource) upsertPayload.utm_source = utmSource;
    if (utmMedium) upsertPayload.utm_medium = utmMedium;
    if (utmCampaign) upsertPayload.utm_campaign = utmCampaign;
    if (body.completed === true) upsertPayload.completed_at = new Date().toISOString();

    const { error: upsertErr } = await serviceClient
      .from('survey_responses')
      .upsert(upsertPayload, { onConflict: 'survey_key,anon_id' });

    if (upsertErr) {
      console.error('[survey/notifications] upsert failed:', upsertErr);
      return NextResponse.json({ error: 'Could not save response' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[survey/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
