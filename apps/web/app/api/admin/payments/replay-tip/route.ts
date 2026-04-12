/**
 * POST /api/admin/payments/replay-tip
 *
 * Re-runs tip finalization (DB updates, wallet, creator_revenue, push) for a succeeded
 * Stripe PaymentIntent when webhooks were missed or confirm-tip failed.
 *
 * Auth: admin or super_admin (Bearer session or cookie).
 *
 * Body JSON: { "payment_intent_id": "pi_..." }
 *
 * Stripe-native replay (alternative): Developers → Webhooks → [your endpoint] →
 * Events → open payment_intent.succeeded → ⋮ Resend. That hits your webhook URL;
 * requires the deployed handler. This route uses the Stripe API + same finalize
 * logic and works even if webhooks are misconfigured (still needs tip rows in DB).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/src/lib/admin-auth';
import { stripe } from '@/src/lib/stripe';
import {
  finalizeTipFromSucceededPaymentIntent,
  isTipPaymentIntent,
} from '@/src/lib/tip-payment-intent-webhook';

const ADMIN_ROLES = ['admin', 'super_admin'] as const;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request, ADMIN_ROLES);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status, headers: CORS });
  }

  const raw = await request.text();
  let parsed: { payment_intent_id?: string };
  try {
    parsed = raw ? (JSON.parse(raw) as { payment_intent_id?: string }) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS });
  }

  const paymentIntentId = parsed.payment_intent_id?.trim();
  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    return NextResponse.json(
      { error: 'payment_intent_id is required (Stripe id starting with pi_)' },
      { status: 400, headers: CORS }
    );
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: CORS });
  }

  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Stripe error';
    return NextResponse.json({ error: msg }, { status: 400, headers: CORS });
  }

  if (pi.status !== 'succeeded') {
    return NextResponse.json(
      { error: 'PaymentIntent is not succeeded', stripe_status: pi.status },
      { status: 400, headers: CORS }
    );
  }

  if (!isTipPaymentIntent(pi)) {
    return NextResponse.json(
      {
        error: 'Not a tip PaymentIntent',
        detail: 'metadata.charge_type must be "tip" (as set by POST /api/payments/create-tip)',
      },
      { status: 400, headers: CORS }
    );
  }

  const result = await finalizeTipFromSucceededPaymentIntent(pi, admin.serviceClient);

  if (!result.ok) {
    const status = result.reason === 'no_tip_rows' ? 404 : 500;
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        hint:
          result.reason === 'no_tip_rows'
            ? 'No row in tips/creator_tips for this PI. create-tip may have failed after charge; insert pending rows from Stripe metadata or refund, then replay.'
            : undefined,
      },
      { status, headers: CORS }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      payment_intent_id: paymentIntentId,
      message: 'Tip finalization completed (idempotent if already done)',
    },
    { headers: CORS }
  );
}
