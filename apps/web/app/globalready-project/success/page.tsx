'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [state, setState] = useState<'loading' | 'paid' | 'pending' | 'error'>('loading');
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState('error');
      setMessage('Missing payment session.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetchWithSupabaseAuth(
          `/api/globalready-project/verify-session?session_id=${encodeURIComponent(sessionId)}`,
        );
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState('error');
          setMessage(body.error ?? 'Could not verify payment');
          return;
        }

        setAmount(body.amount_total ?? null);
        setCurrency(body.currency ?? null);

        if (body.paid) {
          setState('paid');
        } else {
          setState('pending');
          setMessage(`Payment status: ${body.payment_status ?? 'pending'}`);
        }
      } catch {
        if (!cancelled) {
          setState('error');
          setMessage('Verification failed. Contact support if you were charged.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const priceLabel =
    amount != null
      ? `${currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}${amount.toFixed(2)}`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-400" />
            <p className="text-gray-400">Confirming your payment…</p>
          </>
        )}

        {state === 'paid' && (
          <>
            <CheckCircle className="mb-4 h-14 w-14 text-green-500" />
            <h1 className="text-2xl font-bold">Payment received</h1>
            <p className="mt-2 text-gray-400">
              Thank you — your Global Ready upfront payment was successful.
            </p>
            {priceLabel && (
              <p className="mt-3 text-lg font-semibold text-green-400">{priceLabel}</p>
            )}
            <p className="mt-4 text-sm text-gray-500">
              A receipt will be sent to your email from Stripe.
            </p>
            <Link
              href="/globalready-project"
              className="mt-8 inline-block rounded-lg bg-gray-800 px-5 py-2.5 text-sm hover:bg-gray-700"
            >
              Back to project page
            </Link>
          </>
        )}

        {state === 'pending' && (
          <>
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-amber-400" />
            <h1 className="text-xl font-semibold">Payment processing</h1>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="mb-4 h-12 w-12 text-red-500" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-400">{message}</p>
            <Link
              href="/globalready-project"
              className="mt-8 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm hover:bg-blue-500"
            >
              Return to payment page
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function GlobalReadySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
