/**
 * Standard Stripe PaymentIntent metadata for CSV export and Sigma reporting.
 * Every PaymentIntent should include these so Stripe exports and dashboards are useful.
 *
 * @see Mobile team: charge_type, platform_fee_amount, platform_fee_percent,
 * creator_payout_amount, creator_id, stripe_payment_intent_id
 */

import type Stripe from 'stripe';

export type ChargeType = 'gig_payment' | 'tip' | 'event_ticket' | 'audio_sale' | 'subscription';

export interface StandardPaymentIntentMetadata {
  charge_type: ChargeType;
  platform_fee_amount: string; // pence/cents
  platform_fee_percent: string;
  creator_payout_amount: string; // pence/cents
  creator_id: string; // uuid
  stripe_payment_intent_id?: string; // set after creation via addStripePaymentIntentIdToMetadata
}

/**
 * After creating a PaymentIntent, call this to add stripe_payment_intent_id to its metadata
 * so CSV export and Sigma have the PI id on every charge.
 */
export async function addStripePaymentIntentIdToMetadata(
  stripe: Stripe,
  paymentIntentId: string,
  existingMetadata: Record<string, string> = {}
): Promise<void> {
  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: {
      ...existingMetadata,
      stripe_payment_intent_id: paymentIntentId,
    },
  });
}
