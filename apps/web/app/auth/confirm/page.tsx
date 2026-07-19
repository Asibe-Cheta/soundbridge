'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/src/lib/supabase';

type Status = 'idle' | 'verifying' | 'redirecting' | 'error';

const isMobileUserAgent = () =>
  /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent.toLowerCase()
  );

function AuthConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/dashboard';
  const isSignup = type === 'signup';
  const isRecovery = type === 'recovery';

  const handleConfirm = async () => {
    if (!tokenHash || (!isSignup && !isRecovery)) return;

    setStatus('verifying');
    setErrorMessage(null);

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: isRecovery ? 'recovery' : 'signup',
      });

      if (error || !data.user) {
        setStatus('error');
        setErrorMessage(error?.message || 'Verification failed. The link may be expired or already used.');
        return;
      }

      setStatus('redirecting');

      if (isRecovery) {
        router.replace('/update-password');
        return;
      }

      const mobile = isMobileUserAgent();

      let needsOnboarding = true;
      try {
        const response = await fetch('/api/auth/post-signup-confirm', { method: 'POST' });
        if (response.ok) {
          const body = await response.json();
          needsOnboarding = Boolean(body.needsOnboarding);
        }
      } catch (postConfirmError) {
        console.error('post-signup-confirm request failed:', postConfirmError);
      }

      if (mobile) {
        router.replace('/signup/continue');
      } else {
        router.replace(needsOnboarding ? '/?onboarding=true' : next);
      }
    } catch (err) {
      console.error('Confirm error:', err);
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  const missingParams = !tokenHash || (!isSignup && !isRecovery);

  if (missingParams || status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {missingParams ? 'Invalid Link' : 'Verification Failed'}
            </h1>
            <p className="text-gray-300">
              {missingParams
                ? 'This confirmation link is missing required information.'
                : errorMessage}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push(isRecovery ? '/forgot-password' : '/login')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isRecovery ? 'Request a New Link' : 'Back to Login'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'verifying' || status === 'redirecting') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white">
            {status === 'verifying' ? 'Verifying…' : 'Redirecting…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">
          {isRecovery ? 'Reset Your Password' : 'Confirm Your Email'}
        </h1>
        <p className="text-gray-300 mb-6">
          {isRecovery
            ? 'Click below to continue resetting your password.'
            : 'Click below to confirm your email address and finish setting up your account.'}
        </p>
        <button
          onClick={handleConfirm}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isRecovery ? 'Continue' : 'Confirm Email'}
        </button>
      </div>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-white">Loading…</p>
          </div>
        </div>
      }
    >
      <AuthConfirmContent />
    </Suspense>
  );
}
