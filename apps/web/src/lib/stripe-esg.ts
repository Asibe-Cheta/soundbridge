import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});


export const PLATFORM_FEES = {
  service: 0.12,
  venue: 0.08,
};

export function calculateFees(
  totalAmount: number,
  bookingType: 'service' | 'venue',
): { platformFee: number; providerPayout: number } {
  const rate = PLATFORM_FEES[bookingType];
  const platformFee = Math.round(totalAmount * rate * 100) / 100;
  const providerPayout = Math.round((totalAmount - platformFee) * 100) / 100;
  return { platformFee, providerPayout };
}

