'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Heart, X } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'audio_lover_welcome_dismissed_';
const WINDOW_DAYS = 7;

export function getWelcomeLayerStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function wasWelcomeLayerDismissed(userId: string): boolean {
  if (typeof window === 'undefined' || !userId) return true;
  return !!localStorage.getItem(getWelcomeLayerStorageKey(userId));
}

export function setWelcomeLayerDismissed(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  localStorage.setItem(getWelcomeLayerStorageKey(userId), 'true');
}

export function isWithinWelcomeWindow(accountCreatedAt: string | null | undefined): boolean {
  if (!accountCreatedAt) return false;
  const createdMs = new Date(accountCreatedAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  const daysSinceSignup = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
  return daysSinceSignup <= WINDOW_DAYS;
}

// Referral card omitted: web has no user-level referral link system yet (only institutional
// partners get referral links), so there's nothing to conditionally show here.
const CARDS = [
  {
    title: 'Discover artists near you',
    href: '/discover',
    icon: Compass,
  },
  {
    title: 'Support creators directly, keep the connection real',
    href: '/creators',
    icon: Heart,
  },
] as const;

interface AudioLoverWelcomeLayerProps {
  displayName: string;
  userId: string;
  onDismiss: () => void;
}

export function AudioLoverWelcomeLayer({ displayName, userId, onDismiss }: AudioLoverWelcomeLayerProps) {
  const handleDismiss = () => {
    setWelcomeLayerDismissed(userId);
    onDismiss();
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-white font-semibold text-base leading-snug">
          Welcome to SoundBridge, {displayName}. Here&apos;s what&apos;s yours to explore.
        </h3>
        <button
          onClick={handleDismiss}
          className="p-1.5 -mt-1 -mr-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
          aria-label="Dismiss welcome"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="snap-start shrink-0 w-[200px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-colors p-3 flex flex-col gap-2"
            >
              <Icon size={18} className="text-red-400" />
              <span className="text-sm text-gray-200">{card.title}</span>
            </Link>
          );
        })}
      </div>

      <p className="text-gray-400 text-xs mt-3 px-0.5">
        The more you support artists you love, the more you&apos;ll unlock as we grow.
      </p>
    </div>
  );
}
