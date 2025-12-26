'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Loading component
function BetaLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Verifying access...</h2>
        <p className="text-gray-300">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}

// Main beta access content
function BetaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const validBetaCode = process.env.NEXT_PUBLIC_BETA_CODE;
    const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true';

    // If beta mode is not enabled, redirect to login
    if (!isBetaMode) {
      router.push('/login');
      return;
    }

    // If no code provided, redirect to waitlist
    if (!code) {
      router.push('/waitlist');
      return;
    }

    // Validate beta code
    if (code === validBetaCode) {
      // Grant beta access
      localStorage.setItem('beta_access', 'granted');
      localStorage.setItem('beta_access_granted_at', new Date().toISOString());
      
      // Redirect to login
      router.push('/login');
    } else {
      // Invalid code - redirect to waitlist
      router.push('/waitlist');
    }
  }, [code, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Verifying access...</h2>
        <p className="text-gray-300">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}

// Main page component with Suspense for useSearchParams
export default function BetaAccessPage() {
  return (
    <Suspense fallback={<BetaLoading />}>
      <BetaContent />
    </Suspense>
  );
}

