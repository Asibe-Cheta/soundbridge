'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

export default function FoundingMemberPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const toCheck = email.trim();
    if (!toCheck || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toCheck)) {
      setMessage('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/founding-member/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: toCheck }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.message || 'Something went wrong.');
        return;
      }
      setStatus(data.found ? 'found' : 'not_found');
      setMessage(data.message || '');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="w-full max-w-lg mx-auto text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Founding Member
        </h1>
        <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
          You were one of the first 100 to join the SoundBridge waitlist. Confirm your status below.
        </p>

        {status === 'idle' && (
          <form onSubmit={handleCheck} className="space-y-4">
            <label className="block text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email you used on the waitlist
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              autoComplete="email"
            />
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(to right, #DC2626, #EC4899)' }}
            >
              I&apos;m a Founding Member
            </button>
          </form>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--text-secondary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Checking...</p>
          </div>
        )}

        {status === 'found' && (
          <div className="rounded-xl p-6 border text-left" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: '#10b981' }} />
              <div>
                <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>You&apos;re confirmed</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{message}</p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-sm font-medium"
                  style={{ color: '#EC4899' }}
                >
                  View plans and claim 10% off <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {status === 'not_found' && (
          <div className="rounded-xl p-6 border text-left" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <div>
                <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Not on the list</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && message && (
          <p className="text-sm py-4" style={{ color: '#ef4444' }}>{message}</p>
        )}

        {(status === 'not_found' || status === 'error') && (
          <button
            type="button"
            onClick={() => { setStatus('idle'); setMessage(''); }}
            className="mt-6 text-sm underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Try another email
          </button>
        )}

        <p className="mt-12 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="underline">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
