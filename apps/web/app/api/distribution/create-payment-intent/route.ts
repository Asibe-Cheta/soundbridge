import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import {
  createDistributionPaymentIntent,
  DISTRIBUTION_UUID_RE,
} from '@/src/lib/distribution-payment-intent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/** POST /api/distribution/create-payment-intent — mobile Payment Sheet (£15.79) */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const creatorId = String(body.creatorId ?? body.creator_id ?? '').trim();
    const trackId = String(body.trackId ?? body.track_id ?? '').trim();

    if (!creatorId || !DISTRIBUTION_UUID_RE.test(creatorId)) {
      return NextResponse.json({ error: 'Invalid creatorId' }, { status: 400, headers: corsHeaders });
    }
    if (!trackId || !DISTRIBUTION_UUID_RE.test(trackId)) {
      return NextResponse.json({ error: 'Invalid trackId' }, { status: 400, headers: corsHeaders });
    }

    const result = await createDistributionPaymentIntent({
      stripe,
      supabase,
      userId: user.id,
      userEmail: user.email,
      creatorId,
      trackId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status, headers: corsHeaders });
    }

    return NextResponse.json(
      { clientSecret: result.clientSecret, paymentIntentId: result.paymentIntentId },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[distribution/create-payment-intent]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
