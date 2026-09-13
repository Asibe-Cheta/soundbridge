/**
 * POST /api/payments/create-gift-bundle-credit (WEB_TEAM_GIFT_BUNDLE.MD, Item 36)
 * Creates a Stripe PaymentIntent for topping up the fan's Gift Bundle balance.
 * Tagged charge_type: 'gift_bundle_credit' (not 'tip') so the main Stripe
 * webhook's isTipPaymentIntent() check never mistakes this for a tip.
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import {
  createStripeCustomerEphemeralKey,
  getOrCreateStripeCustomer,
  paymentIntentCustomerOptions,
  type StripePayerProfile,
} from '@/src/lib/stripe-payment-sheet-customer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    const raw = await request.text();
    let body: { amount?: number; currency?: string };
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
    }

    const amount = Number(body.amount);
    const currency = (body.currency || 'USD').toUpperCase();
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'A valid amount is required' }, { status: 400, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const amountMinor = Math.round(amount * 100);

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    const payer: StripePayerProfile = {
      soundbridgeUserId: user.id,
      email: user.email,
      displayName: profile?.display_name ?? (user.user_metadata as { full_name?: string })?.full_name,
    };

    let customerId: string | null = null;
    let ephemeral_key_secret: string | null = null;
    if (payer.email) {
      const customer = await getOrCreateStripeCustomer(stripe, payer);
      if (customer?.id) {
        customerId = customer.id;
        ephemeral_key_secret = await createStripeCustomerEphemeralKey(stripe, customer.id);
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: currency.toLowerCase(),
      ...(customerId ? paymentIntentCustomerOptions(customerId) : {}),
      automatic_payment_methods: { enabled: true },
      metadata: {
        charge_type: 'gift_bundle_credit',
        userId: user.id,
        amount: String(amount),
        currency,
      },
      description: `Gift Bundle credit for ${user.id}`,
    });

    return NextResponse.json(
      {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        ...(customerId && ephemeral_key_secret ? { customer_id: customerId, ephemeral_key_secret } : {}),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[create-gift-bundle-credit] error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
