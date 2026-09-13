/**
 * POST /api/payments/confirm-gift-bundle-credit (WEB_TEAM_GIFT_BUNDLE.MD, Item 36)
 * Verifies the PaymentIntent succeeded, then credits the balance via
 * credit_gift_bundle. Idempotent: checks gift_bundle_transactions for an
 * existing row referencing this PaymentIntent before crediting again — same
 * idempotency shape as tipWalletAlreadyCredited in tip-payment-intent-webhook.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const raw = await request.text();
    let body: { paymentIntentId?: string };
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
    }

    const paymentIntentId = body.paymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400, headers: corsHeaders });
    }

    const meta = paymentIntent.metadata || {};
    if (meta.charge_type !== 'gift_bundle_credit') {
      return NextResponse.json({ error: 'Not a Gift Bundle credit payment' }, { status: 400, headers: corsHeaders });
    }
    if (meta.userId && meta.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const service = createServiceClient();

    const { data: existing } = await service
      .from('gift_bundle_transactions')
      .select('id')
      .eq('reference_type', 'stripe_payment_intent')
      .eq('reference_id', paymentIntentId)
      .maybeSingle();

    if (existing) {
      const { data: balRow } = await service
        .from('gift_bundle_balances')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      return NextResponse.json(
        { success: true, newBalance: (balRow?.balance ?? 0) / 100 },
        { headers: corsHeaders },
      );
    }

    const amountMinor = paymentIntent.amount ?? 0;
    const currency = (paymentIntent.currency || 'usd').toUpperCase();

    const { data: newBalance, error: rpcError } = await service.rpc('credit_gift_bundle', {
      p_user_id: user.id,
      p_amount: amountMinor,
      p_currency: currency,
      p_payment_intent_id: paymentIntentId,
    });

    if (rpcError) {
      console.error('[confirm-gift-bundle-credit] credit_gift_bundle failed:', rpcError);
      return NextResponse.json({ error: 'Could not credit Gift Bundle — contact support' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      { success: true, newBalance: (newBalance as number) / 100 },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[confirm-gift-bundle-credit] error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
