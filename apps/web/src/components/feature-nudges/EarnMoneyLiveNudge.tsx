'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { QrCode, X } from 'lucide-react';
import {
  EARN_MONEY_LIVE_AI_PROMPT,
  getEarnMoneyLiveCopy,
  markEarnMoneyLiveNudgeShown,
  shouldShowEarnMoneyLiveNudge,
} from '@/src/lib/earn-live-nudge';

const APPEAR_DELAY_MS = 3000;
const AUTO_DISMISS_MS = 12000;

type EarnMoneyLiveNudgeProps = {
  userId: string;
  username: string;
  role: string;
};

export function EarnMoneyLiveNudge({ userId, username, role }: EarnMoneyLiveNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (role !== 'creator' || !shouldShowEarnMoneyLiveNudge(userId)) return;
    const appearTimer = setTimeout(() => {
      setVisible(true);
      markEarnMoneyLiveNudgeShown(userId);
    }, APPEAR_DELAY_MS);
    return () => clearTimeout(appearTimer);
  }, [userId, role]);

  useEffect(() => {
    if (!visible) return;
    const dismissTimer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(dismissTimer);
  }, [visible]);

  if (!visible) return null;

  const aiPromptHref = `/ai-advisor?prompt=${encodeURIComponent(EARN_MONEY_LIVE_AI_PROMPT)}`;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/60 to-pink-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/20">
          <QrCode className="h-5 w-5 text-rose-400" />
        </div>
        <div>
          <p className="font-semibold text-white">{getEarnMoneyLiveCopy()}</p>
          <p className="mt-0.5 text-sm text-gray-300">
            Show fans your Tip Room QR code at your next gig, event, or meetup.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/tip/${username}`}
          className="rounded-lg bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white hover:from-rose-700 hover:to-pink-600"
        >
          Open my Tip Room
        </Link>
        <Link
          href={aiPromptHref}
          className="whitespace-nowrap rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
        >
          Not sure where to start?
        </Link>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
