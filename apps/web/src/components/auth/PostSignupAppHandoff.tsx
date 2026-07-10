'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
} from '@/src/lib/app-store-url';
import {
  detectMobilePlatform,
  type MobilePlatform,
} from '@/src/lib/mobile-platform';
import { AppStoreBadgeLink } from '@/src/components/marketing/AppStoreBadgeLink';
import { GooglePlayBadgeLink } from '@/src/components/marketing/GooglePlayBadgeLink';

type Props = {
  referralCode?: string | null;
  webContinueHref?: string;
  /** Email verification path uses slightly different headline copy. */
  variant?: 'signup' | 'verified';
};

function storeLabel(platform: MobilePlatform): string {
  if (platform === 'ios') return 'Continue on iPhone';
  if (platform === 'android') return 'Continue on Android';
  return 'Get the app';
}

function storeUrl(platform: MobilePlatform): string {
  if (platform === 'ios') return IOS_APP_STORE_URL;
  if (platform === 'android') return ANDROID_PLAY_STORE_URL;
  return IOS_APP_STORE_URL;
}

export function PostSignupAppHandoff({
  referralCode,
  webContinueHref = '/dashboard',
  variant = 'signup',
}: Props) {
  const [platform, setPlatform] = useState<MobilePlatform>('other');

  useEffect(() => {
    setPlatform(detectMobilePlatform());
  }, []);

  const title =
    variant === 'verified' ? 'Email verified!' : "You're all set!";
  const subtitle =
    variant === 'verified'
      ? 'Your account is ready. For the easiest experience, continue in the SoundBridge app.'
      : 'Your account is ready. For the easiest experience, join SoundBridge on the app — everything is faster on mobile.';

  return (
    <div
      className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-xl backdrop-blur-xl sm:p-8"
      style={{
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-600/30 to-pink-600/30 border border-pink-500/30">
        <Smartphone className="h-7 w-7 text-pink-300" aria-hidden />
      </div>

      <h1
        className="mb-2 text-2xl font-bold"
        style={{
          background: 'linear-gradient(45deg, #DC2626, #EC4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {title}
      </h1>

      <p className="mb-2 text-sm leading-relaxed text-gray-300">{subtitle}</p>

      {referralCode ? (
        <p className="mb-6 text-xs text-gray-400">
          Your referral (
          <span className="font-mono text-gray-300">{referralCode}</span>) is
          already linked to your account.
        </p>
      ) : (
        <div className="mb-6" />
      )}

      {platform === 'ios' || platform === 'android' ? (
        <div className="space-y-4">
          <a
            href={storeUrl(platform)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 text-base font-semibold text-white transition hover:from-red-500 hover:to-pink-500"
          >
            {storeLabel(platform)}
          </a>

          <div className="flex justify-center">
            {platform === 'ios' ? (
              <AppStoreBadgeLink size="md" />
            ) : (
              <GooglePlayBadgeLink size="md" />
            )}
          </div>

          <p className="text-xs text-gray-500">
            {platform === 'ios'
              ? 'Opens the App Store. Install, then sign in with the same email.'
              : 'Opens Google Play. Install, then sign in with the same email.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Choose your app store:</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <AppStoreBadgeLink size="md" />
            <GooglePlayBadgeLink size="md" />
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-white/10 pt-6">
        <Link
          href={webContinueHref}
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Stay on web
        </Link>
        <p className="mt-2 text-xs text-gray-500">
          You can use SoundBridge in your browser — the app is optional but
          recommended on mobile.
        </p>
      </div>
    </div>
  );
}
