import Stripe from 'stripe';

// Lazy init so build can run without STRIPE_SECRET_KEY; routes should check stripe before use
const key = process.env.STRIPE_SECRET_KEY;
export const stripe: Stripe | null = key
  ? new Stripe(key, { apiVersion: '2025-08-27.basil' })
  : null;


// Base platform fees
export const PLATFORM_FEES = {
  service: 0.10, // Default 10% (can vary by service category)
  venue: 0.08,
};

// Service-type based platform fees (10-15% range per spec)
export function getServicePlatformFee(serviceCategory: string): number {
  const fees: Record<string, number> = {
    mixing: 0.10,        // 10%
    mastering: 0.10,     // 10%
    production: 0.10,    // 10%
    coaching: 0.15,      // 15% (higher touch service)
    session_work: 0.10,  // 10%
    songwriting: 0.10,   // 10%
    arrangement: 0.10,   // 10%
    sound_engineering: 0.10, // 10%
    music_lessons: 0.15,  // 15% (higher touch)
    mixing_mastering: 0.10, // 10%
    session_musician: 0.10, // 10%
    photography: 0.10,   // 10%
    videography: 0.10,   // 10%
    lighting: 0.10,      // 10%
    event_management: 0.12, // 12% (moderate complexity)
  };
  return fees[serviceCategory] || 0.10; // Default 10% if category not found
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

