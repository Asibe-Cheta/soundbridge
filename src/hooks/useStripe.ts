import { useState } from 'react';
import { getStripe } from '../lib/stripe';

interface UseStripeResult {
  isLoading: boolean;
  error: string | null;
  checkout: (plan: 'pro' | 'enterprise', billingCycle: 'monthly' | 'yearly') => Promise<void>;
}

export const useStripe = (): UseStripeResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (plan: 'pro' | 'enterprise', billingCycle: 'monthly' | 'yearly') => {
    setIsLoading(true);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan, billingCycle }),
      });

      const { sessionId, error: sessionError } = await response.json();

      if (sessionError || !sessionId) {
        throw new Error(sessionError || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe is not configured. Please contact support.');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, checkout };
};
