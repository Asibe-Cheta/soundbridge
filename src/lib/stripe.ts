import Stripe from 'stripe';

// Server-side Stripe instance
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
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
    enterprise: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || 'prod_enterprise_placeholder',
  },
  prices: {
    pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly_placeholder',
    pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly_placeholder',
    enterprise_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly_placeholder',
    enterprise_yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly_placeholder',
  }
};

// Helper function to get price ID based on plan and billing cycle
export const getPriceId = (plan: 'pro' | 'enterprise', billingCycle: 'monthly' | 'yearly'): string => {
  const key = `${plan}_${billingCycle}` as keyof typeof STRIPE_CONFIG.prices;
  return STRIPE_CONFIG.prices[key];
};
