'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PostSignupAppHandoff } from '@/src/components/auth/PostSignupAppHandoff';
import { readPartnerReferralFromClient } from '@/src/lib/partner-referrals';

function MobileCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'success' | 'error'>('loading');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is on mobile
    const userAgent = navigator.userAgent.toLowerCase();
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(mobile);

    // Get URL parameters
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next');
    const verified = searchParams.get('verified');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    // If already verified (redirected from /auth/callback), handle mobile app redirect
    if (verified === 'true') {
      setStatus('redirecting');
      
      // Try to open the mobile app immediately
      if (mobile) {
        const nextParam = next || '/';
        const mobileAppUrl = `soundbridge://auth/callback?verified=true&next=${nextParam}`;
        console.log('Attempting to open mobile app with verified status:', mobileAppUrl);
        
        // For development with Expo Go, use the Expo development URL
        const expoUrl = 'exp://192.168.1.122:8081/--/auth/callback?verified=true&next=' + encodeURIComponent(nextParam);
        console.log('Attempting to open Expo app with URL:', expoUrl);
        
        try {
          // Try Expo development URL first (for development)
          window.location.href = expoUrl;
          
          // Fallback to custom scheme after a delay
          setTimeout(() => {
            try {
              window.location.href = mobileAppUrl;
            } catch (error) {
              console.error('Failed to open with custom scheme:', error);
            }
          }, 1000);
        } catch (error) {
          console.error('Failed to open mobile app:', error);
        }
        
        // Fallback: after a delay, show success message
        setTimeout(() => {
          setStatus('success');
        }, 2000);
      } else {
        setStatus('success');
      }
      return;
    }

    // If there's an error, show error
    if (error) {
      setStatus('error');
      return;
    }

    // If no token hash, show error
    if (!tokenHash || !type) {
      setStatus('error');
      return;
    }

    // Raw, unverified token — hand off to the click-to-verify confirm page instead
    // of consuming the single-use token here. Auto-verifying on page load lets
    // link-scanning proxies (mail security scanners, link previewers) exhaust the
    // token before the real user gets to click anything.
    const confirmUrl = new URL('/auth/confirm', window.location.origin);
    confirmUrl.searchParams.set('token_hash', tokenHash);
    confirmUrl.searchParams.set('type', type);
    confirmUrl.searchParams.set('next', next || '/');
    router.replace(confirmUrl.pathname + confirmUrl.search);
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white">Processing authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white">
            {isMobile ? 'Opening SoundBridge app...' : 'Redirecting...'}
          </p>
          {isMobile && (
            <p className="text-gray-400 text-sm mt-2">
              If the app doesn't open, please open SoundBridge manually
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'success') {
    const storedPartner =
      typeof window !== 'undefined' ? readPartnerReferralFromClient() : null;

    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 py-10"
        style={{ background: 'var(--bg-gradient)' }}
      >
        <PostSignupAppHandoff
          variant="verified"
          referralCode={storedPartner?.referralCode ?? null}
          webContinueHref={isMobile ? '/dashboard' : '/'}
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-gray-300">
              There was an error verifying your email. The link may be expired or invalid.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
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

  return null;
}

export default function MobileCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <MobileCallbackContent />
    </Suspense>
  );
}
