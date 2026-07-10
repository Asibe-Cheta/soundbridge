'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PostSignupAppHandoff } from '@/src/components/auth/PostSignupAppHandoff';
import { isMobileBrowser } from '@/src/lib/mobile-platform';
import { readPartnerReferralFromClient } from '@/src/lib/partner-referrals';
import { useAuth } from '@/src/contexts/AuthContext';

function SignupContinueContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileBrowser()) {
      router.replace('/dashboard');
      return;
    }
    const stored = readPartnerReferralFromClient();
    setReferralCode(stored.referralCode);
  }, [router]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0612]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg-gradient)' }}
    >
      <Link
        href="/"
        className="absolute left-4 top-6 flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white transition hover:bg-white/10 sm:left-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <Link href="/" className="mb-8 block">
        <Image
          src="/images/logos/logo-trans-lockup.png"
          alt="SoundBridge"
          width={150}
          height={40}
          priority
          style={{ height: 'auto' }}
        />
      </Link>

      <PostSignupAppHandoff referralCode={referralCode} webContinueHref="/dashboard" />
    </div>
  );
}

export default function SignupContinuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0612]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        </div>
      }
    >
      <SignupContinueContent />
    </Suspense>
  );
}
