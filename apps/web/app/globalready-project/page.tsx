'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Globe, Loader2, Lock, LogIn, Shield } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

function formatMoney(amount: number | null, currency: string | null) {
  if (amount == null) return null;
  const sym =
    currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'NGN' ? '₦' : '$';
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function GlobalReadyProjectContent() {
  const { user, loading: authLoading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [accessState, setAccessState] = useState<'checking' | 'denied' | 'allowed'>('checking');
  const [denyReason, setDenyReason] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [priceConfigured, setPriceConfigured] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!user) {
      setAccessState('checking');
      return;
    }

    setAccessState('checking');
    setDenyReason(null);

    const res = await fetchWithSupabaseAuth('/api/globalready-project/status');
    if (res.status === 401) {
      setAccessState('denied');
      setDenyReason('Please sign in to continue.');
      return;
    }
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      setAccessState('denied');
      setDenyReason(body.error ?? 'Access restricted');
      return;
    }
    if (!res.ok) {
      setAccessState('denied');
      setDenyReason('Unable to verify access. Try again later.');
      return;
    }

    const body = await res.json();
    setAmount(body.amount ?? null);
    setCurrency(body.currency ?? null);
    setPriceConfigured(body.price_configured !== false);
    setAccessState('allowed');
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAccessState('checking');
      return;
    }
    void checkAccess();
  }, [authLoading, user, checkAccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    const { error } = await signIn(email.trim(), password);
    setLoginBusy(false);
    if (error) {
      setLoginError(error.message ?? 'Sign in failed');
      return;
    }
    router.refresh();
  };

  const handleCheckout = async () => {
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetchWithSupabaseAuth('/api/globalready-project/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? 'Could not start checkout');
      }
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
      setCheckoutBusy(false);
    }
  };

  const priceLabel = formatMoney(amount, currency);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 ring-1 ring-blue-500/40">
            <Globe className="h-7 w-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Global Ready Project</h1>
          <p className="mt-2 text-sm text-gray-400">
            Upfront payment for external web app delivery — authorised clients only
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 shadow-xl backdrop-blur">
          {authLoading ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <Loader2 className="mb-3 h-8 w-8 animate-spin" />
              Loading…
            </div>
          ) : !user ? (
            <>
              <div className="mb-5 flex items-center gap-2 text-sm text-gray-300">
                <Lock className="h-4 w-4 text-blue-400" />
                Sign in with your authorised email
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Password</label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-red-400">{loginError}</p>
                )}
                <button
                  type="submit"
                  disabled={loginBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
                >
                  {loginBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Sign in
                </button>
              </form>
              <p className="mt-4 text-center text-xs text-gray-500">
                Already have a session?{' '}
                <Link href="/login?redirectTo=/globalready-project" className="text-blue-400 hover:underline">
                  Use full login page
                </Link>
              </p>
            </>
          ) : accessState === 'checking' ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <Loader2 className="mb-3 h-8 w-8 animate-spin" />
              Verifying access…
            </div>
          ) : accessState === 'denied' ? (
            <div className="py-6 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <p className="font-medium text-amber-200">Access restricted</p>
              <p className="mt-2 text-sm text-gray-400">{denyReason}</p>
              <p className="mt-4 text-xs text-gray-500">
                Signed in as {user.email}
              </p>
            </div>
          ) : (
            <>
              {canceled && (
                <div className="mb-4 rounded-lg border border-amber-800/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
                  Payment was canceled. You can try again below.
                </div>
              )}

              <p className="text-sm text-gray-400">
                Signed in as <span className="text-white">{user.email}</span>
              </p>

              <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Upfront project payment
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  Global Ready web application
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  One-time payment via Stripe. You will receive a receipt by email after
                  successful checkout.
                </p>
                {priceLabel && (
                  <p className="mt-3 text-2xl font-bold text-green-400">{priceLabel}</p>
                )}
              </div>

              {!priceConfigured && (
                <p className="mt-4 text-sm text-red-400">
                  Payment is not configured yet (GLOBALREADY_PRICE_ID missing on server).
                </p>
              )}

              {checkoutError && (
                <p className="mt-4 text-sm text-red-400">{checkoutError}</p>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutBusy || !priceConfigured}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
              >
                {checkoutBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Pay with Stripe
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          SoundBridge Live Ltd · Secure checkout powered by Stripe
        </p>
      </div>
    </div>
  );
}

function GlobalReadyLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function GlobalReadyProjectPage() {
  return (
    <Suspense fallback={<GlobalReadyLoading />}>
      <GlobalReadyProjectContent />
    </Suspense>
  );
}
