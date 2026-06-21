import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { addStripePaymentIntentIdToMetadata } from '@/src/lib/stripe-payment-intent-metadata';
import {
  paymentIntentCustomerOptions,
  getOrCreateStripeCustomer,
  type StripePayerProfile,
} from '@/src/lib/stripe-payment-sheet-customer';
import {
  AI_ADVISER_CREDIT_AMOUNT_MINOR,
  AI_ADVISER_CREDIT_CURRENCY,
  AI_ADVISER_CREDITS_PER_PURCHASE,
  AI_ADVISER_CREDIT_METADATA_TYPE,
  UUID_RE,
} from '@/src/lib/ai-adviser-credits';

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
    const amount = Number(body.amount ?? AI_ADVISER_CREDIT_AMOUNT_MINOR);
    const currency = String(body.currency ?? AI_ADVISER_CREDIT_CURRENCY).toLowerCase();
    const credits = Number(body.credits ?? AI_ADVISER_CREDITS_PER_PURCHASE);

    if (!creatorId || !UUID_RE.test(creatorId)) {
      return NextResponse.json({ error: 'Invalid creatorId' }, { status: 400, headers: corsHeaders });
    }
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }
    if (amount !== AI_ADVISER_CREDIT_AMOUNT_MINOR || currency !== AI_ADVISER_CREDIT_CURRENCY) {
      return NextResponse.json(
        { error: `Credits purchase must be ${AI_ADVISER_CREDIT_AMOUNT_MINOR} ${AI_ADVISER_CREDIT_CURRENCY}` },
        { status: 400, headers: corsHeaders },
      );
    }
    if (credits !== AI_ADVISER_CREDITS_PER_PURCHASE) {
      return NextResponse.json(
        { error: `Credits pack must be ${AI_ADVISER_CREDITS_PER_PURCHASE} analyses` },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const payer: StripePayerProfile = {
      soundbridgeUserId: user.id,
      email: user.email,
      displayName: profile?.display_name || profile?.username || undefined,
    };
    const customerId = await getOrCreateStripeCustomer(stripe, payer);

    const metadata: Record<string, string> = {
      type: AI_ADVISER_CREDIT_METADATA_TYPE,
      creatorId: user.id,
      creator_id: user.id,
      credits: String(credits),
      charge_type: 'subscription',
      platform_fee_amount: String(amount),
      platform_fee_percent: '0',
      creator_payout_amount: '0',
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      ...(customerId ? paymentIntentCustomerOptions(customerId) : {}),
      metadata,
      description: 'AI Career Adviser — 5 additional analyses',
    });

    await addStripePaymentIntentIdToMetadata(stripe, paymentIntent.id, metadata);

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: 'Failed to create payment' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret }, { headers: corsHeaders });
  } catch (e) {
    console.error('[ai-adviser/credits/create-payment]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
