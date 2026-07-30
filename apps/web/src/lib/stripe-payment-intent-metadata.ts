/**
 * Standard Stripe PaymentIntent metadata for CSV export and Sigma reporting.
 * Every PaymentIntent should include these so Stripe exports and dashboards are useful.
 *
 * @see Mobile team: charge_type, platform_fee_amount, platform_fee_percent,
 * creator_payout_amount, creator_id, stripe_payment_intent_id
 */

import type Stripe from 'stripe';

export type ChargeType = 'gig_payment' | 'tip' | 'event_ticket' | 'audio_sale' | 'subscription' | 'distribution';

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

/**
 * Resolves the actual payment method type used on a succeeded PaymentIntent (e.g. 'card',
 * 'paypal'), for reconciliation now that PayPal is offered alongside card. Webhook event
 * payloads only carry a payment_method ID, not the expanded object, so this may make one
 * extra Stripe API call. Never throws — returns null if it can't be determined, since this
 * is a reporting field and must never block wallet-crediting or purchase finalization.
 */
export async function getPaymentIntentPaymentMethodType(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent
): Promise<string | null> {
  try {
    const pm = paymentIntent.payment_method;
    if (pm && typeof pm === 'object') {
      return pm.type;
    }
    if (typeof pm === 'string') {
      const resolved = await stripe.paymentMethods.retrieve(pm);
      return resolved.type;
    }
    const expanded = await stripe.paymentIntents.retrieve(paymentIntent.id, {
      expand: ['latest_charge.payment_method_details'],
    });
    const charge = expanded.latest_charge;
    if (charge && typeof charge === 'object') {
      return charge.payment_method_details?.type ?? null;
    }
    return null;
  } catch (err) {
    console.warn('[getPaymentIntentPaymentMethodType] failed:', err);
    return null;
  }
}
