'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AppStoreBadgeLink } from '@/src/components/marketing/AppStoreBadgeLink';
const ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=com.soundbridge.mobile&pcampaignid=web_share';

const storageKey = (profileId: string) => `sb_dismiss_open_app_profile:${profileId}`;

type Props = {
  /** `profiles.id` (UUID). Must not be username — mobile `soundbridge://profile/<id>` expects a UUID. */
  profileId: string;
  displayName: string;
};

export function OpenInAppProfileBanner({ profileId, displayName }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem(storageKey(profileId))) return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [profileId]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey(profileId), '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, [profileId]);

  if (!visible) return null;

  const appUrl = `soundbridge://profile/${profileId}`;

  return (
    <div
      className="mb-4 rounded-lg border border-red-500/40 bg-gradient-to-r from-red-950/90 to-gray-900/95 px-3 py-3 shadow-lg sm:px-4"
      role="region"
      aria-label="Open in SoundBridge app"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Open in SoundBridge</p>
          <p className="mt-0.5 text-xs text-gray-300">
            View {displayName}&apos;s profile in the app for the full experience.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <a
              href={appUrl}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
            >
              Open in app
            </a>
            <AppStoreBadgeLink size="sm" className="-my-0.5" />
            <span className="text-xs text-gray-500">·</span>
            <a
              href={ANDROID_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-red-300 underline-offset-2 hover:text-red-200 hover:underline"
            >
              Google Play
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
