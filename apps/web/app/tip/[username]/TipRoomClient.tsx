'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { CheckCircle, Loader2 } from 'lucide-react';
import { getStripeJsPromise } from '@/src/lib/stripe-js-client';
import { PostTipCommunityPrompt } from '@/src/components/community/PostTipCommunityPrompt';
import { isCommunityTipPromptDismissed } from '@/src/lib/community-join-prompt-storage';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

const PRESETS = [1, 5, 10] as const;
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? getStripeJsPromise() : null;

export type TipRoomClientProps = {
  creatorId: string;
  canonicalUsername: string;
  displayName: string;
  avatarUrl: string | null;
  joinCommunityUrl: string;
};

function TipRoomPaymentForm({
  onDone,
  setFieldError,
}: {
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
        typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: returnUrl || 'https://www.soundbridge.live' },
      });
      if (error) {
        setFieldError(error.message || 'Payment failed');
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
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
    <form onSubmit={handleSubmit} className="mt-5 space-y-4 w-full">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 py-3.5 font-semibold text-white shadow-lg shadow-rose-900/30 disabled:opacity-50"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing…
          </span>
        ) : (
          'Pay'
        )}
      </button>
    </form>
  );
}

export function TipRoomClient({
  creatorId,
  canonicalUsername,
  displayName,
  avatarUrl,
  joinCommunityUrl,
}: TipRoomClientProps) {
  const [tipAmount, setTipAmount] = useState(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bootingPi, setBootingPi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payFieldError, setPayFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCommunityPrompt, setShowCommunityPrompt] = useState(false);
  const [checkingPrompt, setCheckingPrompt] = useState(false);
  const [stripeJs, setStripeJs] = useState<Stripe | null>(null);

  useEffect(() => {
    if (!stripePromise) {
      setStripeJs(null);
      return;
    }
    void stripePromise.then(setStripeJs);
  }, []);

  const amountLabel = useMemo(() => `£${tipAmount.toFixed(tipAmount % 1 === 0 ? 0 : 2)}`, [tipAmount]);

  const startPayment = async () => {
    setError(null);
    setPayFieldError(null);
    if (!stripeJs) {
      setError('Payments are not configured.');
      return;
    }
    setBootingPi(true);
    try {
      const res = await fetch('/api/payments/tip-room-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, amount: tipAmount }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        client_secret?: string;
        clientSecret?: string;
        error?: string;
        details?: string;
      };
      const secret = data.client_secret ?? data.clientSecret;
      if (!res.ok || !secret) {
        setError(data.error || data.details || 'Could not start payment.');
        return;
      }
      setClientSecret(secret);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBootingPi(false);
    }
  };

  const onPaymentSuccess = async () => {
    setSuccess(true);
    setClientSecret(null);
    setCheckingPrompt(true);
    try {
      if (isCommunityTipPromptDismissed(creatorId)) {
        setShowCommunityPrompt(false);
        return;
      }
      const res = await fetchWithSupabaseAuth(
        `/api/community/tip-prompt-eligible?creator_id=${encodeURIComponent(creatorId)}`,
      );
      if (res.ok) {
        const json = await res.json();
        setShowCommunityPrompt(Boolean(json?.eligible));
      }
    } catch {
      setShowCommunityPrompt(false);
    } finally {
      setCheckingPrompt(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 px-5 text-white">
        <div className="w-full max-w-sm text-center">
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h1 className="text-xl font-semibold leading-snug">
            Thank you for supporting {displayName}.
          </h1>

          {checkingPrompt ? (
            <p className="mt-4 text-sm text-gray-400">Loading…</p>
          ) : showCommunityPrompt ? (
            <PostTipCommunityPrompt
              creatorId={creatorId}
              creatorName={displayName}
              onDismiss={() => setShowCommunityPrompt(false)}
              onJoined={() => setShowCommunityPrompt(false)}
            />
          ) : (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5 text-left">
              <p className="text-sm text-gray-300">
                You just supported {displayName}. Join their community to stay connected with their
                journey, upcoming events and exclusive moments.
              </p>
              <Link
                href={joinCommunityUrl}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 py-3 text-sm font-semibold text-white"
              >
                Join {displayName}&apos;s community
              </Link>
              <p className="mt-3 text-center text-xs text-gray-500">
                <Link href={`/signup?community_creator=${encodeURIComponent(canonicalUsername)}`} className="text-pink-400 hover:text-pink-300">
                  Or create a free SoundBridge account
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 px-5 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border-2 border-rose-500/50 bg-gray-800">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={80}
              height={80}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-rose-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <p className="text-sm text-gray-400">{displayName}</p>
        <h1 className="mt-1 text-2xl font-bold">Support {displayName}</h1>

        {!clientSecret ? (
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="tip-amount" className="sr-only">
                Tip amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                  £
                </span>
                <input
                  id="tip-amount"
                  type="number"
                  min={0.3}
                  step={0.5}
                  value={tipAmount}
                  onChange={(e) => setTipAmount(Number(e.target.value) || 1)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-9 pr-4 text-center text-xl font-semibold outline-none ring-rose-500/30 focus:ring-2"
                />
              </div>
            </div>

            <div className="flex justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTipAmount(p)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tipAmount === p
                      ? 'bg-rose-600 text-white'
                      : 'border border-white/15 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  £{p}
                </button>
              ))}
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <button
              type="button"
              disabled={bootingPi}
              onClick={() => void startPayment()}
              className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 py-3.5 text-lg font-semibold shadow-lg shadow-rose-900/30 disabled:opacity-50"
            >
              {bootingPi ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Preparing…
                </span>
              ) : (
                `Pay ${amountLabel}`
              )}
            </button>
          </div>
        ) : stripeJs ? (
          <Elements stripe={stripeJs} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <TipRoomPaymentForm onDone={() => void onPaymentSuccess()} setFieldError={setPayFieldError} />
            {payFieldError ? <p className="mt-3 text-sm text-red-400">{payFieldError}</p> : null}
          </Elements>
        ) : (
          <p className="mt-6 text-sm text-gray-400">Payments unavailable.</p>
        )}

        <p className="mt-8 text-xs text-gray-600">
          Powered by{' '}
          <Link href="/" className="text-pink-400/80 hover:text-pink-300">
            SoundBridge
          </Link>
        </p>
      </div>
    </div>
  );
}
