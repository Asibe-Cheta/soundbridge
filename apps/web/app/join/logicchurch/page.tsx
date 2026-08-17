'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AppStoreBadgeLink } from '@/src/components/marketing/AppStoreBadgeLink';
import { GooglePlayBadgeLink } from '@/src/components/marketing/GooglePlayBadgeLink';

type SubmitState = 'idle' | 'loading' | 'activated' | 'registered' | 'error';

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

export default function LogicChurchJoinPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state === 'loading') return;

    setState('loading');
    setResultMessage('');

    try {
      const response = await fetch('/api/partner-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, partnerId: 'logic_church' }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setResultMessage(data?.error || FALLBACK_ERROR);
        setState('error');
        return;
      }

      setResultMessage(data?.message || '');
      setState(data?.activated ? 'activated' : 'registered');
    } catch {
      setResultMessage(FALLBACK_ERROR);
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-purple-950 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl backdrop-blur sm:p-10">
          {/* Logos */}
          <div className="mb-6 flex items-center justify-center gap-4 sm:gap-6">
            <Link href="/">
              <Image
                src="/images/logos/logo-trans-lockup.png"
                alt="SoundBridge"
                width={140}
                height={38}
                className="h-auto w-[120px] sm:w-[140px]"
              />
            </Link>
            <span className="text-2xl font-light text-gray-600">×</span>
            <Image
              src="/images/pro-resources/LG.png"
              alt="Logic Church"
              width={56}
              height={56}
              className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14"
            />
          </div>

          <h1 className="text-center text-2xl font-bold text-white sm:text-3xl">
            Welcome, Logic Church family
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-gray-300 sm:text-base">
            SoundBridge is where independent artists share their music, connect with fans, and get
            paid directly for their work. As a Logic Church member, you're getting exclusive access:
          </p>

          <ul className="mx-auto mt-5 max-w-sm space-y-3">
            <li className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
              <span className="mt-0.5 text-lg text-purple-300">✓</span>
              <span className="text-sm text-gray-200">
                <strong className="text-white">One full year of Premium access</strong> — completely free.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-500/10 p-3">
              <span className="mt-0.5 text-lg text-purple-300">✓</span>
              <span className="text-sm text-gray-200">
                <strong className="text-white">Your own personal referral link</strong>, earning you 10%
                commission on every subscriber who joins SoundBridge through it.
              </span>
            </li>
          </ul>

          {/* Email form */}
          <div className="mt-7">
            {state === 'activated' ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center text-sm text-green-300">
                {resultMessage || 'Your Logic Church benefits are active. Log in to SoundBridge now to see them.'}
                <div className="mt-3">
                  <Link
                    href="/login"
                    className="inline-block rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                  >
                    Log in to SoundBridge
                  </Link>
                </div>
              </div>
            ) : state === 'registered' ? (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center text-sm text-blue-300">
                {resultMessage ||
                  "You're registered. Create your SoundBridge account with this same email and your benefits will be applied automatically."}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="logic-church-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="logic-church-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
                {state === 'error' && (
                  <p className="text-sm text-red-400">{resultMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state === 'loading' ? 'Submitting...' : 'Claim my Premium access'}
                </button>
              </form>
            )}
          </div>

          {/* Download buttons */}
          <div className="mt-8 border-t border-gray-800 pt-6">
            <p className="mb-3 text-center text-xs uppercase tracking-wide text-gray-500">
              Download SoundBridge
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <AppStoreBadgeLink size="lg" />
              <GooglePlayBadgeLink size="lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
