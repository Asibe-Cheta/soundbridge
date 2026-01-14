import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })
  : null;

// Client-side Stripe instance
export const getStripe = async () => {
  const { loadStripe } = await import('@stripe/stripe-js');
  
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    console.warn('Stripe publishable key not found. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.');
    return null;
  }
  
  return loadStripe(publishableKey);
};

// Map plan names to Stripe Price IDs
// Uses actual environment variable names deployed in Vercel
const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    yearly: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  },
  unlimited: {
    monthly: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_UNLIMITED_MONTHLY,
    yearly: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_UNLIMITED_YEARLY,
  },
  // Legacy Pro tier (for backward compatibility)
  pro: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_MONTHLY || process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || process.env.STRIPE_PRICE_PREMIUM_YEARLY || process.env.STRIPE_PRICE_PRO_YEARLY,
  },
};

// Helper function to get price ID based on plan and billing cycle
export const getPriceId = (plan: 'pro' | 'premium' | 'unlimited', billingCycle: 'monthly' | 'yearly'): string | undefined => {
  const planKey = plan.toLowerCase();
  // Map 'yearly' to 'yearly' for lookup (PRICE_IDS uses 'yearly' key)
  const billingKey = billingCycle.toLowerCase();
  
  const priceId = PRICE_IDS[planKey]?.[billingKey];
  
  // Debug logging
  if (!priceId) {
    console.warn(`[getPriceId] Price ID not found for plan: ${planKey}, billing: ${billingKey}`);
    console.warn('[getPriceId] Available env vars:', {
      STRIPE_PREMIUM_MONTHLY_PRICE_ID: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ? 'set' : 'missing',
      STRIPE_PREMIUM_ANNUAL_PRICE_ID: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID ? 'set' : 'missing',
      STRIPE_UNLIMITED_MONTHLY_PRICE_ID: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID ? 'set' : 'missing',
      STRIPE_UNLIMITED_ANNUAL_PRICE_ID: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID ? 'set' : 'missing',
    });
  }
  
  return priceId;
};
