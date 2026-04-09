'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, ShoppingCart, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '@/src/contexts/AuthContext';
import { getStripeJsPromise } from '@/src/lib/stripe-js-client';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? getStripeJsPromise() : null;

export interface ContentPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'track' | 'album';
  contentId: string;
  title: string;
  price: number;
  currency: string;
  coverUrl?: string | null;
  creatorLabel: string;
  onPurchaseSuccess?: () => void;
}

function formatPrice(amount: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  return `${symbol}${amount.toFixed(2)}`;
}

function CheckoutForm({
  clientSecret,
  onDone,
  setFieldError,
}: {
  clientSecret: string;
  onDone: () => void;
  setFieldError: (msg: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setFieldError(null);

    try {
      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}${window.location.search || ''}`
          : '';

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: returnUrl || 'https://www.soundbridge.live',
        },
      });

      if (error) {
        setFieldError(error.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded' && paymentIntent.id) {
        const res = await fetch('/api/content/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ payment_intent_id: paymentIntent.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          setFieldError(
            data.message || 'Payment succeeded but we could not finalize your purchase. Please contact support.'
          );
          setProcessing(false);
          return;
        }
        onDone();
      } else {
        setFieldError('Payment could not be completed.');
      }
    } catch (err: unknown) {
      setFieldError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-gray-600 bg-gray-900/50 p-3">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing…
          </>
        ) : (
          'Pay now'
        )}
      </button>
    </form>
  );
}

export function ContentPurchaseModal({
  isOpen,
  onClose,
  contentType,
  contentId,
  title,
  price,
  currency,
  coverUrl,
  creatorLabel,
  onPurchaseSuccess,
}: ContentPurchaseModalProps) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [booting, setBooting] = useState(false);

  const reset = useCallback(() => {
    setClientSecret(null);
    setLoadError(null);
    setFormError(null);
    setSuccess(false);
    setBooting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    if (!user) {
      setLoadError('Please log in to purchase.');
      setBooting(false);
      return;
    }

    if (!stripePromise) {
      setLoadError('Payments are not configured.');
      setBooting(false);
      return;
    }

    let cancelled = false;
    setBooting(true);
    setLoadError(null);

    (async () => {
      try {
        const stripe = await stripePromise!;
        if (!stripe) {
          if (!cancelled) setLoadError('Payment system unavailable. Check your network or try disabling content blockers.');
          return;
        }

        const ownRes = await fetch(
          `/api/content/ownership?content_id=${encodeURIComponent(contentId)}&content_type=${encodeURIComponent(contentType)}`,
          { credentials: 'include' }
        );
        const ownData = await ownRes.json();
        if (ownData.success && ownData.data?.owns) {
          if (!cancelled) setLoadError('You already own this content.');
          return;
        }

        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content_id: contentId,
            content_type: contentType,
            price,
            currency,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.client_secret) {
          if (!cancelled) setLoadError(data.error || 'Could not start checkout.');
          return;
        }
        if (!cancelled) setClientSecret(data.client_secret);
      } catch {
        if (!cancelled) setLoadError('Network error.');
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user, contentId, contentType, price, currency, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
      <div className="relative w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Purchase {contentType === 'album' ? 'album' : 'track'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-white mb-2">You&apos;re all set</h3>
              <p className="text-gray-400 text-sm">Your purchase is saved. Enjoy your content.</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-6 p-4 bg-gray-800/60 rounded-xl">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate">{title}</h3>
                  <p className="text-sm text-gray-400">
                    by {creatorLabel}
                  </p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">{formatPrice(price, currency)}</p>
                </div>
              </div>

              {booting && (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Preparing checkout…
                </div>
              )}

              {loadError && !booting && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{loadError}</span>
                </div>
              )}

              {clientSecret && stripePromise && !booting && !loadError && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: 'night', variables: { colorPrimary: '#10b981' } },
                  }}
                >
                  <CheckoutForm
                    clientSecret={clientSecret}
                    setFieldError={setFormError}
                    onDone={() => {
                      setSuccess(true);
                      onPurchaseSuccess?.();
                      setTimeout(() => onClose(), 2000);
                    }}
                  />
                </Elements>
              )}

              {formError && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
