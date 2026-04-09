import type { Stripe } from '@stripe/stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

let cached: Promise<Stripe | null> | null = null;

/**
 * Loads Stripe.js once per page session. Never rejects — returns null when the
 * publishable key is missing or the script cannot load (network, ad blocker, CSP).
 */
export function getStripeJsPromise(): Promise<Stripe | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (!publishableKey) {
    return Promise.resolve(null);
  }
  if (!cached) {
    cached = import('@stripe/stripe-js')
      .then(({ loadStripe }) => loadStripe(publishableKey))
      .catch((cause: unknown) => {
        console.warn('[Stripe] Failed to load Stripe.js', cause);
        return null;
      });
  }
  return cached;
}
