'use client';

import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

type FeedCaughtUpMarkerProps = {
  onScrolledPast: () => void;
};

export function FeedCaughtUpMarker({ onScrolledPast }: FeedCaughtUpMarkerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || firedRef.current) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          firedRef.current = true;
          onScrolledPast();
        }
      },
      { threshold: [0, 0.6, 1] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onScrolledPast]);

  return (
    <div
      ref={rootRef}
      data-feed-caught-up-marker
      className="flex flex-col items-center gap-2 py-8 px-4"
      aria-label="You're all caught up"
    >
      <div className="flex items-center gap-2 text-emerald-400">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <Check className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-white">You&apos;re all caught up</span>
      </div>
      <p className="text-center text-xs text-gray-400 max-w-xs">
        New posts from your community will appear here
      </p>
      <div className="mt-2 h-px w-full max-w-xs bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
