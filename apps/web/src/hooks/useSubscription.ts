import { useState, useEffect } from 'react';

export interface SubscriptionData {
  subscription: {
    tier: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired' | 'trial';
    billing_cycle: 'monthly' | 'yearly';
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    created_at: string;
    updated_at: string;
  };
  usage: {
    music_uploads: number;
    podcast_uploads: number;
    event_uploads: number;
    total_storage_used: number;
    total_plays: number;
    total_followers: number;
    last_upload_at: string | null;
    formatted_storage?: string;
    formatted_plays?: string;
    formatted_followers?: string;
  };
  revenue: {
    total_earned: number;
    total_paid_out: number;
    pending_balance: number;
    last_payout_at: string | null;
    payout_threshold: number;
    available_balance?: number;
    can_request_payout?: boolean;
    formatted_total_earned?: string;
    formatted_total_paid_out?: string;
    formatted_pending_balance?: string;
    formatted_available_balance?: string;
    formatted_payout_threshold?: string;
  };
  features: {
    unlimitedUploads: boolean;
    advancedAnalytics: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    revenueSharing: boolean;
    whiteLabel: boolean;
  };
}

export interface SubscriptionHook {
  data: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upgradeSubscription: (tier: 'pro' | 'enterprise', billingCycle: 'monthly' | 'yearly') => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  updateUsage: (type: 'music' | 'podcast' | 'event' | 'play' | 'follower', amount?: number, storageUsed?: number) => Promise<boolean>;
  addEarnings: (amount: number) => Promise<boolean>;
  requestPayout: () => Promise<boolean>;
}

export const useSubscription = (): SubscriptionHook => {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/status');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch subscription data');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const upgradeSubscription = async (tier: 'pro' | 'enterprise', billingCycle: 'monthly' | 'yearly' = 'monthly'): Promise<boolean> => {
    try {
      // Use SubscriptionService to create checkout session (unified flow)
      const { SubscriptionService } = await import('@/src/services/SubscriptionService');
      const { getPriceId } = await import('@/src/lib/stripe');
      
      const priceId = getPriceId('pro', billingCycle);
      const amount = billingCycle === 'monthly' ? 9.99 : 99.00;

      await SubscriptionService.createCheckoutSession({
        name: billingCycle === 'monthly' ? 'Pro Monthly' : 'Pro Yearly',
        priceId,
        billingCycle,
        amount,
      });

      // User will be redirected to Stripe Checkout
      // Success redirect goes to dashboard with ?success=true
      // Webhook will update subscription
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      console.error('Error upgrading subscription:', err);
      return false;
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      // Refresh data after successful cancellation
      await fetchSubscriptionData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      console.error('Error cancelling subscription:', err);
      return false;
    }
  };

  const updateUsage = async (type: 'music' | 'podcast' | 'event' | 'play' | 'follower', amount: number = 1, storageUsed: number = 0): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, amount, storageUsed }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update usage');
      }

      // Refresh data after successful update
      await fetchSubscriptionData();
      return true;
    } catch (err) {
      console.error('Error updating usage:', err);
      return false;
    }
  };

  const addEarnings = async (amount: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'add_earnings', amount }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add earnings');
      }

      // Refresh data after successful update
      await fetchSubscriptionData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add earnings');
      console.error('Error adding earnings:', err);
      return false;
    }
  };

  const requestPayout = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'request_payout' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to request payout');
      }

      // Refresh data after successful request
      await fetchSubscriptionData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request payout');
      console.error('Error requesting payout:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  return {
    data,
    loading,
    error,
    refresh: fetchSubscriptionData,
    upgradeSubscription,
    cancelSubscription,
    updateUsage,
    addEarnings,
    requestPayout,
  };
};
