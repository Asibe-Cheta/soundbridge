'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, Lock, Loader2, AlertCircle } from 'lucide-react';
import { SubscriptionService } from '@/src/services/SubscriptionService';
import { getPriceId } from '@/src/lib/stripe';

interface PaymentCollectionProps {
  isOpen: boolean;
  onSuccess: () => void;
  onBack: () => void;
  selectedTier?: 'premium' | 'unlimited';  // NEW: Pass selected tier from TierSelection
}

// Simplified payment handler - uses Checkout Sessions (unified with pricing page)
function PaymentForm({ period, selectedTier, onSuccess, onBack, setError }: {
  period: 'monthly' | 'annual';
  selectedTier: 'premium' | 'unlimited';
  onSuccess: () => void;
  onBack: () => void;
  setError: (error: string | null) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Use SubscriptionService to create checkout session (unified flow)
      const billingCycle = period === 'annual' ? 'yearly' : 'monthly';
      const priceId = getPriceId(selectedTier, billingCycle);

      // Calculate amount based on tier
      const amounts = {
        premium: billingCycle === 'monthly' ? 6.99 : 69.99,
        unlimited: billingCycle === 'monthly' ? 12.99 : 129.99,
      };
      const amount = amounts[selectedTier];

      await SubscriptionService.createCheckoutSession({
        name: billingCycle === 'monthly'
          ? `${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Monthly`
          : `${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Yearly`,
        priceId,
        billingCycle,
        amount,
      });

      // User will be redirected to Stripe Checkout
      // Success redirect goes to dashboard with ?success=true
      // Don't set submitting to false - keep spinner until redirect

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Trust Badges */}
      <div className="bg-white/5 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Shield size={16} />
          <span>7-day money-back guarantee</span>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Lock size={16} />
          <span>Secure payment via Stripe</span>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Shield size={16} />
          <span>You'll be redirected to Stripe's secure checkout</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          isSubmitting
            ? 'bg-white/10 text-white/50 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Redirecting to checkout...
          </>
        ) : (
          <>
            Upgrade to {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}
            <ArrowRight size={20} />
          </>
        )}
      </button>

      {/* Back to Free Option */}
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-white/70 hover:text-white text-sm transition-colors"
      >
        ← Back to Free plan
      </button>
    </form>
  );
}

export function PaymentCollection({ isOpen, onSuccess, onBack, selectedTier = 'premium' }: PaymentCollectionProps) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [error, setError] = useState<string | null>(null);

  // Reset error when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate amounts based on tier
  const amounts = {
    monthly: selectedTier === 'premium' ? 6.99 : 12.99,
    annual: selectedTier === 'premium' ? 69.99 : 129.99,
  };
  const savings = selectedTier === 'premium' ? 13.89 : 25.89;
  const tierName = selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="relative w-full max-w-2xl bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowRight className="text-white/70 hover:text-white rotate-180" size={20} />
            </button>
            <span className="text-sm text-white/70">Finalizing...</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
            Upgrade to {tierName} - Risk Free
          </h2>

          <p className="text-white/80 text-center mb-6">
            You'll be charged £{amounts[period]} today to start your {tierName} subscription.
            If you're not satisfied within 7 days, simply request a refund from your billing settings for a full refund - no questions asked.
          </p>

          {/* Billing Period Selection */}
          <div className="mb-6 flex gap-4 justify-center">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                period === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Monthly - £{amounts.monthly}/mo
            </button>
            <button
              onClick={() => setPeriod('annual')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                period === 'annual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Annual - £{amounts.annual}/yr
              <span className="ml-2 text-xs">Save £{savings.toFixed(2)}</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-400 font-semibold mb-1">Payment Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Stripe Elements */}
          <PaymentForm
            period={period}
            selectedTier={selectedTier}
            onSuccess={onSuccess}
            onBack={onBack}
            setError={setError}
          />
        </div>
      </div>
    </div>
  );
}
