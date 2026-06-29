'use client';

import React from 'react';
import Link from 'next/link';
import { Globe, X, ArrowRight } from 'lucide-react';
import type { FeatureNudgeType } from '@/src/lib/feature-nudge-conditions';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

type ContextNudgeModalProps = {
  isOpen: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  nudgeType: FeatureNudgeType;
  trackId?: string;
  relatedUserId?: string;
  bookingId?: string;
  onClose: () => void;
  onCtaClick?: () => void;
};

export function ContextNudgeModal({
  isOpen,
  title,
  body,
  ctaLabel,
  ctaHref,
  nudgeType,
  trackId,
  relatedUserId,
  bookingId,
  onClose,
  onCtaClick,
}: ContextNudgeModalProps) {
  if (!isOpen) return null;

  const mark = async (action: 'mark_shown' | 'mark_dismissed') => {
    try {
      await fetchJsonWithAuth('/api/feature-nudges', {
        method: 'POST',
        body: JSON.stringify({
          action,
          nudgeType,
          trackId,
          relatedUserId,
          bookingId,
        }),
      });
    } catch {
      /* non-fatal */
    }
  };

  const handleDismiss = () => {
    void mark('mark_dismissed');
    onClose();
  };

  const handleCta = () => {
    void mark('mark_shown');
    onCtaClick?.();
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/20">
          <Globe className="h-6 w-6 text-pink-400" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-white">{title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-gray-300">{body}</p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={ctaHref}
            onClick={handleCta}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white hover:from-red-700 hover:to-pink-600"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

type DistributionNudgeProps = {
  trackId: string;
  trackTitle?: string;
  onClose: () => void;
};

export function DistributionNudgeModal({ trackId, trackTitle, onClose }: DistributionNudgeProps) {
  return (
    <ContextNudgeModal
      isOpen
      title="Get this track on Spotify and major platforms"
      body={
        trackTitle
          ? `"${trackTitle}" is live on SoundBridge. Distribute it to Spotify, Apple Music, and 150+ platforms via MBG Sonics.`
          : 'Your track is live on SoundBridge. Distribute it to Spotify, Apple Music, and 150+ platforms via MBG Sonics.'
      }
      ctaLabel="Distribute This Track"
      ctaHref={`/distribution/mbg-sonics?trackId=${encodeURIComponent(trackId)}`}
      nudgeType="post_upload_distribution"
      trackId={trackId}
      onClose={onClose}
    />
  );
}

type AiAdviserNudgeProps = {
  onClose: () => void;
};

export function AiCareerAdviserNudgeModal({ onClose }: AiAdviserNudgeProps) {
  return (
    <ContextNudgeModal
      isOpen
      title="Curious how this is actually performing?"
      body="Your AI Career Adviser has real insight now — plays, tips, and listener signals from your SoundBridge activity."
      ctaLabel="Check My Career Adviser"
      ctaHref="/ai-advisor"
      nudgeType="ai_career_adviser_deferred"
      onClose={onClose}
    />
  );
}

type EventPromotionNudgeProps = {
  providerName: string;
  providerId: string;
  bookingId: string;
  onClose: () => void;
};

export function EventPromotionNudgeModal({
  providerName,
  providerId,
  bookingId,
  onClose,
}: EventPromotionNudgeProps) {
  return (
    <ContextNudgeModal
      isOpen
      title="Share something new with your city"
      body={`Just worked with ${providerName}? If you have something new to share, promoting an event is free and goes straight to people in your city looking for exactly this.`}
      ctaLabel="Promote an Event"
      ctaHref="/events/create?source=service_payment"
      nudgeType="event_promotion"
      relatedUserId={providerId}
      bookingId={bookingId}
      onClose={onClose}
    />
  );
}
