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

// Stripe product and price IDs (you'll need to create these in your Stripe dashboard)
export const STRIPE_CONFIG = {
  products: {
    pro: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_pro_placeholder',
    premium: process.env.STRIPE_PREMIUM_PRODUCT_ID || 'prod_premium_placeholder',
    unlimited: process.env.STRIPE_UNLIMITED_PRODUCT_ID || 'prod_unlimited_placeholder',
  },
  prices: {
    // Legacy Pro tier (for backward compatibility)
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly_placeholder',
    pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly_placeholder',
    // Premium tier (£6.99/month, £69.99/year)
    premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_premium_monthly_placeholder',
    premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_premium_yearly_placeholder',
    // Unlimited tier (£12.99/month, £129.99/year)
    unlimited_monthly: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID || 'price_unlimited_monthly_placeholder',
    unlimited_yearly: process.env.STRIPE_UNLIMITED_YEARLY_PRICE_ID || 'price_unlimited_yearly_placeholder',
  }
};

// Helper function to get price ID based on plan and billing cycle
export const getPriceId = (plan: 'pro' | 'premium' | 'unlimited', billingCycle: 'monthly' | 'yearly'): string => {
  const key = `${plan}_${billingCycle}` as keyof typeof STRIPE_CONFIG.prices;
  return STRIPE_CONFIG.prices[key];
};
