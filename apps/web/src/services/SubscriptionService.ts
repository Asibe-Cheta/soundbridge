import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export interface SubscriptionPlan {
  name: string;
  priceId?: string; // Optional - server will look up from plan name if not provided
  plan: 'premium' | 'unlimited' | 'pro'; // Required - used to look up price ID on server
  billingCycle: 'monthly' | 'yearly';
  amount: number;
}

export interface SubscriptionStatus {
  tier: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  billing_cycle: 'monthly' | 'yearly' | null;
  subscription_start_date: string | null;
  subscription_renewal_date: string | null;
  subscription_ends_at: string | null;
  money_back_guarantee_eligible: boolean;
  refund_count: number;
}

export class SubscriptionService {
  /**
   * Create Stripe Checkout session and redirect to payment page
   */
  static async createCheckoutSession(plan: SubscriptionPlan): Promise<void> {
    try {
      console.log('[SubscriptionService] Creating checkout session for plan:', plan.name);

      // Call backend to create session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan.plan, // Required - server uses this to look up price ID
          billingCycle: plan.billingCycle,
          priceId: plan.priceId, // Optional - if provided, will be used directly
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId, url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        // Fallback: use Stripe.js to redirect
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe failed to load');
        
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) throw error;
      }

    } catch (error: any) {
      console.error('[SubscriptionService] Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Get current user's subscription status
   */
  static async getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    try {
      const response = await fetch('/api/subscription/status');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated
          return null;
        }
        throw new Error('Failed to fetch subscription status');
      }

      const { data } = await response.json();
      return data?.subscription || null;

    } catch (error) {
      console.error('[SubscriptionService] Error fetching status:', error);
      return null;
    }
  }

  /**
   * Check if user has Pro subscription
   */
  static async hasProSubscription(): Promise<boolean> {
    const subscription = await this.getSubscriptionStatus();
    return subscription?.tier === 'pro' && subscription?.status === 'active';
  }
}
