'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/src/contexts/OnboardingContext';
import { ArrowRight, Shield, Lock, Loader2, AlertCircle, Check } from 'lucide-react';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentCollectionProps {
  isOpen: boolean;
  onSuccess: () => void;
  onBack: () => void;
}

// Inner component that uses Stripe hooks
function PaymentForm({ period, onSuccess, onBack, setError }: {
  period: 'monthly' | 'annual';
  onSuccess: () => void;
  onBack: () => void;
  setError: (error: string | null) => void;
}) {
  const { setCurrentStep } = useOnboarding();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe is not loaded. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create payment method from Stripe Elements
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        elements,
      });

      if (pmError || !paymentMethod) {
        setError(pmError?.message || 'Failed to create payment method. Please check your card details.');
        setIsSubmitting(false);
        return;
      }

      // Send payment method ID to backend
      const { data, error: apiError } = await fetchJsonWithAuth('/api/onboarding/upgrade-pro', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          period: period
        })
      });

      if (apiError || !data?.success) {
        setError(apiError?.message || data?.error || data?.message || 'Payment processing failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success - proceed to welcome confirmation
      setCurrentStep('welcomeConfirmation');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stripe Payment Element */}
      <div className="bg-white/5 rounded-lg p-4">
        <PaymentElement 
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Trust Badges */}
      <div className="bg-white/5 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <Shield size={16} />
          <span>7-day money-back guarantee</span>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Check size={16} />
          <span>Cancel anytime</span>
        </div>
        <div className="flex items-center gap-2 text-white/70 text-sm">
          <Lock size={16} />
          <span>Secure payment via Stripe</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !stripe || !elements}
        className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
          isSubmitting || !stripe || !elements
            ? 'bg-white/10 text-white/50 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Upgrade to Pro
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

export function PaymentCollection({ isOpen, onSuccess, onBack }: PaymentCollectionProps) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Stripe Elements options
  const options: StripeElementsOptions = {
    mode: 'payment',
    currency: 'gbp',
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#9333ea',
        colorBackground: 'rgba(255, 255, 255, 0.05)',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

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
            Upgrade to Pro - Risk Free
          </h2>

          <p className="text-white/80 text-center mb-6">
            You'll be charged £{period === 'monthly' ? '9.99' : '99.00'} today to start your Pro subscription.
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
              Monthly - £9.99/mo
            </button>
            <button
              onClick={() => setPeriod('annual')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                period === 'annual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Annual - £99/yr
              <span className="ml-2 text-xs">Save £20</span>
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
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm 
              period={period}
              onSuccess={onSuccess}
              onBack={onBack}
              setError={setError}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}
