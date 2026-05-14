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

const STRIPE_SUPPORTED_CURRENCIES = new Set([
  'usd', 'gbp', 'eur', 'cad', 'aud', 'sgd', 'hkd', 'jpy', 'nzd', 'dkk', 'sek', 'nok', 'chf',
  'mxn', 'brl', 'inr', 'pln', 'zar', 'krw', 'try', 'thb', 'myr', 'php', 'idr', 'aed', 'sar', 'ils',
  'egp', 'ars', 'clp', 'cop', 'pen', 'vnd', 'cny',
]);

const STRIPE_MIN_AMOUNTS: Record<string, number> = {
  usd: 0.5,
  gbp: 0.3,
  eur: 0.5,
  jpy: 50,
  krw: 500,
  inr: 0.5,
  mxn: 10,
  brl: 0.5,
  aud: 0.5,
  cad: 0.5,
  chf: 0.5,
  dkk: 2.5,
  nok: 3,
  sek: 3,
  sgd: 0.5,
  hkd: 4,
  nzd: 0.5,
  thb: 15,
  myr: 2,
  php: 25,
  idr: 5000,
  vnd: 10000,
  aed: 2,
  sar: 2,
  ils: 2,
  pln: 2,
  zar: 5,
  try: 2,
  egp: 15,
  ars: 100,
  clp: 500,
  cop: 2000,
  pen: 2,
  cny: 3,
};

function stripeAmountInMinorUnits(amountMajor: number, currencyLower: string): number {
  const zeroDecimal = new Set([
    'jpy', 'krw', 'vnd', 'clp', 'pyg', 'jod', 'kwd', 'omr', 'bif', 'djf', 'gnf', 'kmf', 'xaf', 'xof', 'mad',
  ]);
  if (zeroDecimal.has(currencyLower)) return Math.round(amountMajor);
  return Math.round(amountMajor * 100);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Guest tip from artist fan landing (/[username]/home). No Supabase auth.
 * Persists fan_landing_tips with source fan_landing_page; Stripe webhook finalizes wallet credit.
 */
export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const supabase = createServerClient();
    const body = (await request.json().catch(() => null)) as {
      creatorId?: string;
      amount?: number;
      email?: string;
      name?: string;
      message?: string;
    } | null;

    if (!body?.creatorId || !body.email?.trim()) {
      return NextResponse.json(
        { error: 'creatorId and email are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const creatorId = String(body.creatorId).trim();
    const email = body.email.trim();
    const guestName = typeof body.name === 'string' ? body.name.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!isValidEmail(email)) {
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

    const { data: creatorWallets } = await supabase
      .from('user_wallets')
      .select('currency, balance')
      .eq('user_id', creatorId)
      .order('balance', { ascending: false });

    const creatorCurrencyRaw = creatorWallets?.[0]?.currency ?? 'GBP';
    const creatorCurrencyLower = String(creatorCurrencyRaw).toLowerCase();
    const tipCurrencyLower = STRIPE_SUPPORTED_CURRENCIES.has(creatorCurrencyLower)
      ? creatorCurrencyLower
      : 'gbp';
    const tipCurrency = tipCurrencyLower.toUpperCase();

    const rawAmount = body.amount != null ? Number(body.amount) : 1;
    const tipAmount = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 1;
    if (tipAmount > 10_000) {
      return NextResponse.json({ error: 'Tip amount is too large' }, { status: 400, headers: corsHeaders });
    }
    const minAmount = STRIPE_MIN_AMOUNTS[tipCurrencyLower] ?? STRIPE_MIN_AMOUNTS.gbp ?? 0.3;
    if (tipAmount < minAmount) {
      return NextResponse.json(
        { error: `Minimum tip amount is ${minAmount} ${tipCurrency}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const platformFeeRate = PLATFORM_FEE_DECIMAL;
    const platformFee = Math.round(tipAmount * platformFeeRate * 100) / 100;
    const creatorEarnings = Math.round((tipAmount - platformFee) * 100) / 100;
    const stripeFeeRate = PLATFORM_FEE_DECIMAL;

    const amountMinor = stripeAmountInMinorUnits(tipAmount, tipCurrencyLower);
    const { data: creatorBank } = await supabase
      .from('creator_bank_accounts')
      .select('stripe_account_id')
      .eq('user_id', creatorId)
      .not('stripe_account_id', 'is', null)
      .maybeSingle();
    const stripeAccountId = (creatorBank as { stripe_account_id?: string } | null)?.stripe_account_id;

    const platformFeeMinor = Math.round(amountMinor * stripeFeeRate);
    const creatorPayoutMinor = amountMinor - platformFeeMinor;

    const payer: StripePayerProfile = {
      soundbridgeUserId: `guest_fan_landing:${creatorId}`,
      email,
      displayName: guestName || undefined,
    };

    let customerId: string | null = null;
    let ephemeral_key_secret: string | null = null;
    const customer = await getOrCreateStripeCustomer(stripe, payer);
    if (customer?.id) {
      customerId = customer.id;
      ephemeral_key_secret = await createStripeCustomerEphemeralKey(stripe, customer.id);
    }

    const paymentIntentConfig: Record<string, unknown> = {
      amount: amountMinor,
      currency: tipCurrencyLower,
      ...(customerId ? paymentIntentCustomerOptions(customerId) : {}),
      metadata: {
        creatorId,
        creator_id: creatorId,
        creator_user_id: creatorId,
        guest_tip: 'true',
        tip_source: 'fan_landing_page',
        tipper_email: email,
        guest_tipper_name: guestName,
        userTier: 'free',
        paymentMethod: 'card',
        platformFee: platformFee.toString(),
        creatorEarnings: creatorEarnings.toString(),
        tipMessage: message,
        isAnonymous: 'false',
        charge_type: 'tip',
        platform_fee_amount: String(platformFeeMinor),
        platform_fee_percent: String(PLATFORM_FEE_PERCENT),
        creator_payout_amount: String(creatorPayoutMinor),
      },
      description: `Fan page tip to creator ${creatorId}`,
      automatic_payment_methods: { enabled: true },
    };

    if (stripeAccountId && amountMinor > 0) {
      const applicationFeeMinor = Math.round(amountMinor * stripeFeeRate);
      if (applicationFeeMinor > 0 && applicationFeeMinor < amountMinor) {
        paymentIntentConfig.application_fee_amount = applicationFeeMinor;
        paymentIntentConfig.transfer_data = { destination: stripeAccountId };
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentConfig as Parameters<typeof stripe.paymentIntents.create>[0]
    );
    await addStripePaymentIntentIdToMetadata(
      stripe,
      paymentIntent.id,
      (paymentIntent.metadata ?? {}) as Record<string, string>
    );

    const { error: insertErr } = await supabase.from('fan_landing_tips').insert({
      creator_id: creatorId,
      guest_email: email,
      guest_name: guestName || null,
      amount: tipAmount,
      currency: tipCurrency,
      stripe_payment_intent_id: paymentIntent.id,
      source: 'fan_landing_page',
      status: 'pending',
      message: message || null,
    });

    if (insertErr) {
      console.error('[fan-landing-tip] fan_landing_tips insert failed:', insertErr);
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        { error: 'Could not start payment. Please try again.' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        client_secret: paymentIntent.client_secret,
        stripe_client_secret: paymentIntent.client_secret,
        currency: tipCurrency,
        platformFee,
        creatorEarnings,
        ...(customerId && ephemeral_key_secret ? { customer_id: customerId, ephemeral_key_secret } : {}),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[fan-landing-tip]', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
