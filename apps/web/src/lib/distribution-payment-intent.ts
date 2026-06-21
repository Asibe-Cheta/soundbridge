import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addStripePaymentIntentIdToMetadata } from '@/src/lib/stripe-payment-intent-metadata';
import {
  paymentIntentCustomerOptions,
  getOrCreateStripeCustomer,
  type StripePayerProfile,
} from '@/src/lib/stripe-payment-sheet-customer';
import {
  DISTRIBUTION_CURRENCY,
  DISTRIBUTION_FEE_MINOR,
  DISTRIBUTION_STRIPE_METADATA_TYPE,
} from '@/src/lib/distribution-config';

export const DISTRIBUTION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createDistributionPaymentIntent(args: {
  stripe: Stripe;
  supabase: SupabaseClient;
  userId: string;
  userEmail: string | undefined;
  creatorId: string;
  trackId: string;
}): Promise<
  | { ok: true; clientSecret: string; paymentIntentId: string }
  | { ok: false; status: number; error: string }
> {
  const { stripe, supabase, userId, userEmail, creatorId, trackId } = args;

  if (creatorId !== userId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  const { data: track, error: trackErr } = await supabase
    .from('audio_tracks')
    .select('id, creator_id, title')
    .eq('id', trackId)
    .maybeSingle();

  if (trackErr || !track) {
    return { ok: false, status: 404, error: 'Track not found' };
  }
  if (track.creator_id !== userId) {
    return { ok: false, status: 403, error: 'You can only distribute your own tracks' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', userId)
    .maybeSingle();

  const payer: StripePayerProfile = {
    soundbridgeUserId: userId,
    email: userEmail,
    displayName: profile?.display_name || profile?.username || undefined,
  };
  const customer = await getOrCreateStripeCustomer(stripe, payer);
  const customerId = customer?.id ?? null;

  const metadata: Record<string, string> = {
    type: DISTRIBUTION_STRIPE_METADATA_TYPE,
    charge_type: 'distribution',
    creator_id: userId,
    track_id: trackId,
    platform_fee_amount: String(DISTRIBUTION_FEE_MINOR),
    platform_fee_percent: '0',
    creator_payout_amount: '0',
  };

  const paymentIntent = await stripe.paymentIntents.create({
    amount: DISTRIBUTION_FEE_MINOR,
    currency: DISTRIBUTION_CURRENCY,
    ...(customerId ? paymentIntentCustomerOptions(customerId) : {}),
    metadata,
    description: `MBG Sonics distribution — ${track.title ?? 'Track'}`,
  });

  await addStripePaymentIntentIdToMetadata(stripe, paymentIntent.id, metadata);

  if (!paymentIntent.client_secret) {
    return { ok: false, status: 500, error: 'Failed to create payment' };
  }

  return {
    ok: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}
