import type Stripe from 'stripe';

/** Must match `apiVersion` in `apps/web/src/lib/stripe.ts` for EphemeralKey.create */
export const STRIPE_PAYMENT_SHEET_API_VERSION = '2025-08-27.basil' as const;

export type StripePayerProfile = {
  soundbridgeUserId: string;
  email: string | null | undefined;
  displayName?: string | null;
};

/**
 * Find or create a Stripe Customer for the payer (Payment Sheet saved cards).
 */
export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  payer: StripePayerProfile
): Promise<Stripe.Customer | null> {
  const raw = payer.email?.trim();
  if (!raw) return null;

  const listed = await stripe.customers.list({ email: raw, limit: 1 });
  if (listed.data[0]) return listed.data[0];

  return stripe.customers.create({
    email: raw,
    name: payer.displayName?.trim() || undefined,
    metadata: { soundbridge_user_id: payer.soundbridgeUserId },
  });
}

export async function createStripeCustomerEphemeralKey(
  stripe: Stripe,
  customerId: string
): Promise<string> {
  const ek = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: STRIPE_PAYMENT_SHEET_API_VERSION }
  );
  if (!ek.secret) throw new Error('Stripe ephemeral key missing secret');
  return ek.secret;
}

/** Fields to merge onto PaymentIntent.create so cards can be saved for reuse */
export function paymentIntentCustomerOptions(
  customerId: string
): Pick<Stripe.PaymentIntentCreateParams, 'customer' | 'setup_future_usage'> {
  return {
    customer: customerId,
    setup_future_usage: 'off_session',
  };
}

export function stripeCustomerIdFromPaymentIntent(pi: Stripe.PaymentIntent): string | null {
  const c = pi.customer;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'id' in c && typeof (c as Stripe.Customer).id === 'string') {
    return (c as Stripe.Customer).id;
  }
  return null;
}
