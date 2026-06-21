import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { sendPartnerDistributionEmailForRequest } from '@/src/lib/distribution-email-service';
import {
  DISTRIBUTION_FEE_GBP,
  DISTRIBUTION_MIN_RELEASE_DAYS,
  DISTRIBUTION_STRIPE_METADATA_TYPE,
} from '@/src/lib/distribution-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseReleaseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return value;
}

function minReleaseDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + DISTRIBUTION_MIN_RELEASE_DAYS);
  return d.toISOString().slice(0, 10);
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** POST /api/distribution/confirm — after Payment Sheet succeeds */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const paymentIntentId = String(body.paymentIntentId ?? body.payment_intent_id ?? '').trim();
    const trackId = String(body.trackId ?? body.track_id ?? '').trim();
    const artistName = String(body.artistName ?? body.artist_name ?? '').trim();
    const trackTitle = String(body.trackTitle ?? body.track_title ?? '').trim();
    const genre = body.genre != null ? String(body.genre) : null;
    const isrcCode = body.isrcCode ?? body.isrc_code ?? null;
    const featuredArtists = body.featuredArtists ?? body.featured_artists ?? null;
    const explicitContent = Boolean(body.explicitContent ?? body.explicit_content);
    const rightsConfirmed = Boolean(body.rightsConfirmed ?? body.rights_confirmed);
    const requestedReleaseDate = parseReleaseDate(body.requestedReleaseDate ?? body.requested_release_date);
    const creatorEmail = String(body.creatorEmail ?? body.creator_email ?? user.email ?? '').trim();
    const distributionCoverArtUrl =
      body.distributionCoverArtUrl ?? body.distribution_cover_art_url ?? null;

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400, headers: corsHeaders });
    }
    if (!trackId || !UUID_RE.test(trackId)) {
      return NextResponse.json({ error: 'Invalid trackId' }, { status: 400, headers: corsHeaders });
    }
    if (!artistName || !trackTitle || !creatorEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }
    if (!rightsConfirmed) {
      return NextResponse.json({ error: 'Rights confirmation is required' }, { status: 400, headers: corsHeaders });
    }
    if (!requestedReleaseDate) {
      return NextResponse.json({ error: 'Invalid requestedReleaseDate' }, { status: 400, headers: corsHeaders });
    }
    if (requestedReleaseDate < minReleaseDate()) {
      return NextResponse.json(
        { error: `Requested release date must be at least ${DISTRIBUTION_MIN_RELEASE_DAYS} days from today` },
        { status: 400, headers: corsHeaders },
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not succeeded yet', status: paymentIntent.status },
        { status: 400, headers: corsHeaders },
      );
    }

    const meta = paymentIntent.metadata ?? {};
    if (meta.type && meta.type !== DISTRIBUTION_STRIPE_METADATA_TYPE) {
      return NextResponse.json({ error: 'Invalid payment type' }, { status: 400, headers: corsHeaders });
    }
    const metaCreator = meta.creator_id || meta.creatorId;
    const metaTrack = meta.track_id || meta.trackId;
    if (metaCreator && metaCreator !== user.id) {
      return NextResponse.json({ error: 'Payment creator mismatch' }, { status: 403, headers: corsHeaders });
    }
    if (metaTrack && metaTrack !== trackId) {
      return NextResponse.json({ error: 'Payment track mismatch' }, { status: 400, headers: corsHeaders });
    }

    const service = createServiceClient();

    const { data: existing } = await service
      .from('distribution_requests')
      .select('id, requested_release_date, email_sent_to_partner')
      .eq('stripe_payment_id', paymentIntentId)
      .maybeSingle();

    if (existing) {
      if (!existing.email_sent_to_partner) {
        await sendPartnerDistributionEmailForRequest(service, existing.id);
      }
      return NextResponse.json(
        {
          requestId: existing.id,
          releaseDate: existing.requested_release_date,
        },
        { headers: corsHeaders },
      );
    }

    const { data: track } = await service
      .from('audio_tracks')
      .select('id, creator_id')
      .eq('id', trackId)
      .maybeSingle();

    if (!track || track.creator_id !== user.id) {
      return NextResponse.json({ error: 'Track not found or not owned by you' }, { status: 403, headers: corsHeaders });
    }

    const { data: inserted, error: insertErr } = await service
      .from('distribution_requests')
      .insert({
        creator_id: user.id,
        track_id: trackId,
        artist_name: artistName,
        track_title: trackTitle,
        genre,
        isrc_code: isrcCode ? String(isrcCode) : null,
        featured_artists: featuredArtists ? String(featuredArtists) : null,
        explicit_content: explicitContent,
        rights_confirmed: rightsConfirmed,
        requested_release_date: requestedReleaseDate,
        creator_email: creatorEmail,
        distribution_cover_art_url: distributionCoverArtUrl ? String(distributionCoverArtUrl) : null,
        stripe_payment_id: paymentIntentId,
        amount_paid: DISTRIBUTION_FEE_GBP,
        payment_status: 'paid',
        track_status: 'submitted',
      })
      .select('id, requested_release_date')
      .single();

    if (insertErr || !inserted) {
      console.error('[distribution/confirm] insert failed:', insertErr);
      return NextResponse.json({ error: 'Failed to create distribution request' }, { status: 500, headers: corsHeaders });
    }

    const emailSent = await sendPartnerDistributionEmailForRequest(service, inserted.id);
    if (!emailSent) {
      console.error('[distribution/confirm] partner email failed for request', inserted.id);
    }

    return NextResponse.json(
      {
        requestId: inserted.id,
        releaseDate: inserted.requested_release_date,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[distribution/confirm]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
