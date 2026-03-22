import Stripe from 'stripe';

// Lazy init so build can run without STRIPE_SECRET_KEY; routes should check stripe before use
const key = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = key
  ? new Stripe(key, { apiVersion: '2025-08-27.basil' })
  : null;


/** Flat 15% platform fee on service & venue bookings (aligned with MOBILE_PRICING_MODEL_UPDATE). */
export const PLATFORM_FEES = {
  service: 0.15,
  venue: 0.15,
};

/** Flat 15% for all service categories (tiered 8–15% retired). */
export function getServicePlatformFee(_serviceCategory: string): number {
  return 0.15;
}

export function calculateFees(
  totalAmount: number,
  bookingType: 'service' | 'venue',
  serviceCategory?: string, // Optional: for service-type based fees
): { platformFee: number; providerPayout: number } {
  let rate: number;
  
  if (bookingType === 'service' && serviceCategory) {
    // Use category-based fee (10-15% range)
    rate = getServicePlatformFee(serviceCategory);
  } else {
    // Use base fee
    rate = PLATFORM_FEES[bookingType];
  }
  
  const platformFee = Math.round(totalAmount * rate * 100) / 100;
  const providerPayout = Math.round((totalAmount - platformFee) * 100) / 100;
  return { platformFee, providerPayout };
}

