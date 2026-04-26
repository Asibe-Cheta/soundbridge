'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useTheme } from '@/src/contexts/ThemeContext';

type SessionPayload = {
  id: string;
  session_name: string | null;
  minimum_tip_amount: number;
  status: 'active' | 'ended';
  creator?: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
};

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({
  clientSecret,
  onSuccess,
  isDark,
}: {
  clientSecret: string;
  onSuccess: () => void;
  isDark: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    setProcessing(false);
    if (result.error) {
      setError(result.error.message || 'Payment failed');
      return;
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleConfirm} className="space-y-4">
      <PaymentElement />
      {error ? <p className={isDark ? 'text-sm text-red-300' : 'text-sm text-red-600'}>{error}</p> : null}
      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {processing ? 'Processing payment...' : 'Pay & Send Request'}
      </button>
    </form>
  );
}

export default function RequestRoomPublicClient({
  sessionId,
  session,
}: {
  sessionId: string;
  session: SessionPayload;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [songRequest, setSongRequest] = useState('');
  const [tipAmount, setTipAmount] = useState(String(session.minimum_tip_amount || 1));
  const [tipperName, setTipperName] = useState('');
  const [email, setEmail] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const minTip = Number(session.minimum_tip_amount || 1);
  const displayName = session.creator?.display_name || session.creator?.username || 'Creator';

  const options = useMemo(() => ({ clientSecret: clientSecret || undefined }), [clientSecret]);

  const beginPayment = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const tip = Number(tipAmount);
    if (tip < minTip) {
      setError(`Minimum tip is ${minTip}`);
      return;
    }
    if (!songRequest.trim()) {
      setError('Song request is required');
      return;
    }

    const res = await fetch('/api/request-room/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        song_request: songRequest.trim(),
        tip_amount: tip,
        tipper_name: tipperName.trim() || 'Anonymous',
        email: email.trim(),
        gdpr_consent: gdprConsent,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'Unable to start payment');
      return;
    }
    setClientSecret(json.client_secret);
  };

  if (session.status !== 'active') {
    return <p className={isDark ? 'text-center text-lg text-white' : 'text-center text-lg text-slate-900'}>This session has ended.</p>;
  }

  return (
    <div className={isDark ? 'mx-auto max-w-xl rounded-2xl border border-white/10 bg-black/30 p-6 text-white' : 'mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm'}>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{session.session_name || `Request Room with ${displayName}`}</h1>
        <p className={isDark ? 'mt-1 text-white/70' : 'mt-1 text-slate-600'}>Make a song request and tip {displayName} live.</p>
      </div>

      {message ? (
        <div className={isDark ? 'rounded-lg bg-emerald-600/20 p-4 text-emerald-200' : 'rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700'}>{message}</div>
      ) : (
        <>
          {!clientSecret ? (
            <form onSubmit={beginPayment} className="space-y-4">
              <label className={isDark ? 'block text-sm font-semibold text-white' : 'block text-sm font-semibold text-slate-800'}>
                Song request
              </label>
              <input
                value={songRequest}
                onChange={e => setSongRequest(e.target.value)}
                placeholder="What song would you like to hear?"
                className={isDark ? 'w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 outline-none focus:border-red-400' : 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400'}
              />
              <label className={isDark ? 'block text-sm font-semibold text-white' : 'block text-sm font-semibold text-slate-800'}>
                Tip amount (minimum ${minTip.toFixed(2)})
              </label>
              <input
                type="number"
                min={minTip}
                step="0.01"
                value={tipAmount}
                onChange={e => setTipAmount(e.target.value)}
                placeholder={`Tip amount (min ${minTip})`}
                className={isDark ? 'w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 outline-none focus:border-red-400' : 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400'}
              />
              <label className={isDark ? 'block text-sm font-semibold text-white' : 'block text-sm font-semibold text-slate-800'}>
                Your name (optional)
              </label>
              <input
                value={tipperName}
                onChange={e => setTipperName(e.target.value)}
                placeholder="Your name (optional)"
                className={isDark ? 'w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 outline-none focus:border-red-400' : 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400'}
              />
              <label className={isDark ? 'block text-sm font-semibold text-white' : 'block text-sm font-semibold text-slate-800'}>
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={`Your email (optional updates from ${displayName})`}
                className={isDark ? 'w-full rounded-lg border border-white/20 bg-black/30 px-4 py-3 outline-none focus:border-red-400' : 'w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-400'}
              />
              <label className={isDark ? 'flex items-start gap-2 text-sm text-white/80' : 'flex items-start gap-2 text-sm text-slate-600'}>
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={e => setGdprConsent(e.target.checked)}
                  className="mt-1"
                />
                <span>I consent to receive occasional updates from SoundBridge and this creator.</span>
              </label>
              {error ? <p className={isDark ? 'text-sm text-red-300' : 'text-sm text-red-600'}>{error}</p> : null}
              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500"
              >
                Continue to payment
              </button>
            </form>
          ) : (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm
                clientSecret={clientSecret}
                isDark={isDark}
                onSuccess={() => {
                  setMessage(`Your request has been sent! ${displayName} will see it now.`);
                }}
              />
            </Elements>
          )}
        </>
      )}
    </div>
  );
}

