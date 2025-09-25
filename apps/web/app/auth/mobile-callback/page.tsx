'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/src/lib/supabase';

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
      if (isMobile) {
        const nextParam = next || '/';
        const mobileAppUrl = `soundbridge://auth/callback?verified=true&next=${nextParam}`;
        console.log('Attempting to open mobile app with verified status:', mobileAppUrl);
        
        // Attempt to open the mobile app with multiple methods
        try {
          // Method 1: Direct location change
          window.location.href = mobileAppUrl;
          
          // Method 2: Create a hidden iframe (fallback)
          setTimeout(() => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = mobileAppUrl;
            document.body.appendChild(iframe);
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }, 100);
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

    // Try to handle the auth callback
    handleAuthCallback(tokenHash, type, next);
  }, [searchParams, router]);

  const handleAuthCallback = async (tokenHash: string, type: string, next: string | null) => {
    try {
      setStatus('redirecting');

      // Create Supabase client
      const supabase = createBrowserClient();

      // Handle the auth callback
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });

      if (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        return;
      }

      if (data.user) {
        setStatus('success');
        
        // If on mobile, try to open the app
        if (isMobile) {
          // Try to open the mobile app with deep link
          const mobileAppUrl = `soundbridge://auth/callback?token_hash=${tokenHash}&type=${type}&next=${next || '/'}`;
          
          // Attempt to open the mobile app
          window.location.href = mobileAppUrl;
          
          // Fallback: after a delay, show success message
          setTimeout(() => {
            setStatus('success');
          }, 2000);
        } else {
          // On desktop, redirect to web app
          const redirectUrl = next || '/';
          router.push(redirectUrl);
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setStatus('error');
    }
  };

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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-gray-300">
              Your email has been successfully verified. You can now use SoundBridge.
            </p>
          </div>
          
          {isMobile ? (
            <div className="space-y-3">
              <button
                onClick={() => {
                  try {
                    // Try multiple methods to open the app
                    window.location.href = 'soundbridge://auth/callback';
                    
                    // Fallback method
                    setTimeout(() => {
                      const iframe = document.createElement('iframe');
                      iframe.style.display = 'none';
                      iframe.src = 'soundbridge://auth/callback';
                      document.body.appendChild(iframe);
                      setTimeout(() => document.body.removeChild(iframe), 1000);
                    }, 100);
                  } catch (error) {
                    console.error('Failed to open mobile app:', error);
                    alert('Unable to open SoundBridge app. Please open it manually.');
                  }
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Open SoundBridge App
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Continue on Web
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Continue to SoundBridge
            </button>
          )}
        </div>
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
