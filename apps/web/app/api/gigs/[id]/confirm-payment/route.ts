/**
 * POST /api/gigs/:id/confirm-payment — Verify urgent gig payment and trigger matching/notifications
 * Mobile calls this immediately after the Stripe Payment Sheet succeeds.
 * Belt-and-suspenders with the Stripe webhook (payment_intent.succeeded / amount_capturable_updated).
 *
 * WEB_TEAM_OPPORTUNITY_PAYMENT_WEBHOOK_GAP.md — Urgent gigs section
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { stripe } from '@/src/lib/stripe';
import { runUrgentGigMatching } from '@/src/lib/urgent-gig-matching';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: CORS }
      );
    }

    const { id: gigId } = await params;
    if (!gigId) {
      return NextResponse.json(
        { success: false, error: 'Gig ID required' },
        { status: 400, headers: CORS }
      );
    }

    const service = createServiceClient();
    const { data: gig, error: gigErr } = await service
      .from('opportunity_posts')
      .select(
        'id, user_id, gig_type, title, payment_amount, payment_currency, payment_status, urgent_status, stripe_payment_intent_id'
      )
      .eq('id', gigId)
      .single();

    if (gigErr || !gig || gig.gig_type !== 'urgent') {
      return NextResponse.json(
        { success: false, error: 'Urgent gig not found' },
        { status: 404, headers: CORS }
      );
    }

    // Only requester (created_by/user_id) can confirm payment
    if (gig.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the requester can confirm payment' },
        { status: 403, headers: CORS }
      );
    }

    // Idempotent: if already escrowed, just return current gig payload
    if (gig.payment_status === 'escrowed') {
      return NextResponse.json({ success: true, data: gig }, { status: 200, headers: CORS });
    }

    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Payment system not configured' },
        { status: 500, headers: CORS }
      );
    }

    if (!gig.stripe_payment_intent_id) {
      return NextResponse.json(
        { success: false, error: 'No payment intent found for this gig' },
        { status: 400, headers: CORS }
      );
    }

    const pi = await stripe.paymentIntents.retrieve(gig.stripe_payment_intent_id);

    // Treat both requires_capture (authorized) and succeeded (already captured) as secured
    if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: `Payment is not authorized (status: ${pi.status})` },
        { status: 400, headers: CORS }
      );
    }

    // Ensure payment_status is escrowed and urgent_status searching
    await service
      .from('opportunity_posts')
      .update({
        payment_status: 'escrowed',
        urgent_status: gig.urgent_status ?? 'searching',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gig.id);

    // Trigger matching + provider notifications (idempotent inside runUrgentGigMatching)
    try {
      await runUrgentGigMatching(service as any, gig.stripe_payment_intent_id);
    } catch (matchErr) {
      console.error('confirm-payment urgent gig: matching error (non-fatal):', matchErr);
    }

    const { data: updated } = await service
      .from('opportunity_posts')
      .select(
        'id, user_id, gig_type, title, payment_amount, payment_currency, payment_status, urgent_status, stripe_payment_intent_id'
      )
      .eq('id', gigId)
      .maybeSingle();

    return NextResponse.json(
      { success: true, data: updated ?? gig },
      { status: 200, headers: CORS }
    );
  } catch (e) {
    console.error('POST /api/gigs/[id]/confirm-payment:', e);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: CORS }
    );
  }
}

