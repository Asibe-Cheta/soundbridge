import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { addStripePaymentIntentIdToMetadata } from '@/src/lib/stripe-payment-intent-metadata';
import {
  createStripeCustomerEphemeralKey,
  getOrCreateStripeCustomer,
  paymentIntentCustomerOptions,
  type StripePayerProfile,
} from '@/src/lib/stripe-payment-sheet-customer';
import { PLATFORM_FEE_DECIMAL, PLATFORM_FEE_PERCENT } from '@/src/lib/platform-fees';
import { createServerClient } from '@/src/lib/supabase';

const TIP_ROOM_CURRENCY = 'gbp';
const STRIPE_MIN_GBP = 0.3;

function stripeAmountInMinorUnits(amountMajor: number): number {
  return Math.round(amountMajor * 100);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Guest tip from Tip Room QR (/tip/{username}). No Supabase auth.
 * Stripe webhook finalizes wallet + inserts tip_room_tips stat row.
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const supabase = createServerClient();
    const body = (await request.json().catch(() => null)) as {
      creatorId?: string;
      amount?: number;
      email?: string;
    } | null;

    if (!body?.creatorId?.trim()) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400, headers: corsHeaders });
    }

    const creatorId = String(body.creatorId).trim();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400, headers: corsHeaders });
    }

    const { data: creatorProfile, error: creatorError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creatorProfile || String(creatorProfile.role).toLowerCase() !== 'creator') {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404, headers: corsHeaders });
    }

    const rawAmount = body.amount != null ? Number(body.amount) : 1;
    const tipAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 1;
    if (tipAmount > 10_000) {
      return NextResponse.json({ error: 'Tip amount is too large' }, { status: 400, headers: corsHeaders });
    }
    if (tipAmount < STRIPE_MIN_GBP) {
      return NextResponse.json(
        { error: `Minimum tip amount is ${STRIPE_MIN_GBP} GBP` },
        { status: 400, headers: corsHeaders },
      );
    }

    const platformFee = Math.round(tipAmount * PLATFORM_FEE_DECIMAL * 100) / 100;
    const creatorEarnings = Math.round((tipAmount - platformFee) * 100) / 100;
    const amountMinor = stripeAmountInMinorUnits(tipAmount);

    const { data: creatorBank } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id')
      .eq('user_id', creatorId)
      .not('stripe_account_id', 'is', null)
      .maybeSingle();
    const stripeAccountId = (creatorBank as { stripe_account_id?: string } | null)?.stripe_account_id;

    const platformFeeMinor = Math.round(amountMinor * PLATFORM_FEE_DECIMAL);
    const creatorPayoutMinor = amountMinor - platformFeeMinor;

    let customerId: string | null = null;
    let ephemeral_key_secret: string | null = null;
    if (email) {
      const payer: StripePayerProfile = {
        soundbridgeUserId: `guest_tip_room:${creatorId}`,
        email,
      };
      const customer = await getOrCreateStripeCustomer(stripe, payer);
      if (customer?.id) {
        customerId = customer.id;
        ephemeral_key_secret = await createStripeCustomerEphemeralKey(stripe, customer.id);
      }
    }

    const paymentIntentConfig: Record<string, unknown> = {
      amount: amountMinor,
      currency: TIP_ROOM_CURRENCY,
      ...(customerId ? paymentIntentCustomerOptions(customerId) : {}),
      metadata: {
        creatorId,
        creator_id: creatorId,
        creator_user_id: creatorId,
        guest_tip: 'true',
        tip_source: 'tip_room',
        tipper_email: email,
        userTier: 'free',
        paymentMethod: 'card',
        platformFee: platformFee.toString(),
        creatorEarnings: creatorEarnings.toString(),
        isAnonymous: 'false',
        charge_type: 'tip',
        platform_fee_amount: String(platformFeeMinor),
        platform_fee_percent: String(PLATFORM_FEE_PERCENT),
        creator_payout_amount: String(creatorPayoutMinor),
      },
      description: `Tip Room tip to creator ${creatorId}`,
      automatic_payment_methods: { enabled: true },
    };

    if (stripeAccountId && amountMinor > 0) {
      const applicationFeeMinor = Math.round(amountMinor * PLATFORM_FEE_DECIMAL);
      if (applicationFeeMinor > 0 && applicationFeeMinor < amountMinor) {
        paymentIntentConfig.application_fee_amount = applicationFeeMinor;
        paymentIntentConfig.transfer_data = { destination: stripeAccountId };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentConfig as Parameters<typeof stripe.paymentIntents.create>[0],
    );
    await addStripePaymentIntentIdToMetadata(
      stripe,
      paymentIntent.id,
      (paymentIntent.metadata ?? {}) as Record<string, string>,
    );

    const { error: insertErr } = await supabase.from('fan_landing_tips').insert({
      creator_id: creatorId,
      guest_email: email || 'tip-room@guest.soundbridge.live',
      guest_name: null,
      amount: tipAmount,
      currency: 'GBP',
      stripe_payment_intent_id: paymentIntent.id,
      source: 'tip_room',
      status: 'pending',
      message: null,
    });

    if (insertErr) {
      console.error('[tip-room-tip] fan_landing_tips insert failed:', insertErr);
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        { error: 'Could not start payment. Please try again.' },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        client_secret: paymentIntent.client_secret,
        currency: 'GBP',
        platformFee,
        creatorEarnings,
        ...(customerId && ephemeral_key_secret ? { customer_id: customerId, ephemeral_key_secret } : {}),
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[tip-room-tip]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500, headers: corsHeaders },
    );
  }
}
