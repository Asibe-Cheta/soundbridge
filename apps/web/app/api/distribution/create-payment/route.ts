import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { addStripePaymentIntentIdToMetadata } from '@/src/lib/stripe-payment-intent-metadata';
import {
  paymentIntentCustomerOptions,
  getOrCreateStripeCustomer,
  type StripePayerProfile,
} from '@/src/lib/stripe-payment-sheet-customer';

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
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const body = await request.json();
    const trackId = body.trackId ?? body.track_id;
    const artistName = String(body.artistName ?? body.artist_name ?? '').trim();
    const trackTitle = String(body.trackTitle ?? body.track_title ?? '').trim();
    const genre = body.genre != null ? String(body.genre) : null;
    const isrcCode = body.isrcCode ?? body.isrc_code ?? null;
    const featuredArtists = body.featuredArtists ?? body.featured_artists ?? null;
    const explicitContent = Boolean(body.explicitContent ?? body.explicit_content);
    const requestedReleaseDate = parseReleaseDate(body.requestedReleaseDate ?? body.requested_release_date);
    const creatorEmail = String(body.creatorEmail ?? body.creator_email ?? user.email ?? '').trim();
    const amountPaid = Number(body.amountPaid ?? body.amount_paid ?? 75);
    const amountOwedToPartner = Number(body.amountOwedToPartner ?? body.amount_owed_to_partner ?? 60);
    const soundbridgeMargin = Number(body.soundbridgeMargin ?? body.soundbridge_margin ?? 15);

    if (!trackId || !UUID_RE.test(String(trackId))) {
      return NextResponse.json({ error: 'Invalid trackId' }, { status: 400, headers: corsHeaders });
    }
    if (!artistName || !trackTitle || !creatorEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }
    if (!requestedReleaseDate) {
      return NextResponse.json({ error: 'Invalid requestedReleaseDate' }, { status: 400, headers: corsHeaders });
    }
    if (requestedReleaseDate < minReleaseDate()) {
      return NextResponse.json(
        { error: 'Requested release date must be at least 7 days from today' },
        { status: 400, headers: corsHeaders },
      );
    }
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return NextResponse.json({ error: 'Invalid amountPaid' }, { status: 400, headers: corsHeaders });
    }

    const { data: track, error: trackErr } = await supabase
      .from('audio_tracks')
      .select('id, creator_id, title')
      .eq('id', trackId)
      .maybeSingle();

    if (trackErr || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404, headers: corsHeaders });
    }
    if (track.creator_id !== user.id) {
      return NextResponse.json({ error: 'You can only distribute your own tracks' }, { status: 403, headers: corsHeaders });
    }

    const amountMinor = Math.round(amountPaid * 100);
    const payer: StripePayerProfile = {
      soundbridgeUserId: user.id,
      email: user.email,
      displayName: artistName,
    };
    const customerId = await getOrCreateStripeCustomer(stripe, payer);

    const metadata: Record<string, string> = {
      charge_type: 'distribution',
      platform_fee_amount: String(Math.round(soundbridgeMargin * 100)),
      platform_fee_percent: '0',
      creator_payout_amount: String(Math.round(amountOwedToPartner * 100)),
      creator_id: user.id,
      track_id: String(trackId),
      distribution_artist: artistName,
      distribution_track_title: trackTitle,
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: 'gbp',
      customer: customerId,
      ...paymentIntentCustomerOptions(customerId),
      metadata,
      description: `MBG Sonics distribution — ${trackTitle}`,
    });

    await addStripePaymentIntentIdToMetadata(stripe, paymentIntent.id, metadata);

    const service = createServiceClient();
    const { data: row, error: insertErr } = await service
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
        requested_release_date: requestedReleaseDate,
        creator_email: creatorEmail,
        stripe_payment_id: paymentIntent.id,
        amount_paid: amountPaid,
        amount_owed_to_partner: amountOwedToPartner,
        soundbridge_margin: soundbridgeMargin,
        track_status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr || !row) {
      console.error('[distribution/create-payment] insert failed:', insertErr);
      return NextResponse.json({ error: 'Failed to create distribution request' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        requestId: row.id,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[distribution/create-payment]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
