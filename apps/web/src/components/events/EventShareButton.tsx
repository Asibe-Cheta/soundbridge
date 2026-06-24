'use client';

import { useCallback, useState } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';
import { fetchWithSupabaseAuth } from '@/src/lib/fetch-with-supabase-auth';
import { getSiteUrl } from '@/src/lib/site-url';

type EventShareButtonProps = {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  eventLocation?: string;
  size?: number;
  className?: string;
  variant?: 'icon' | 'button';
};

export function EventShareButton({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  size = 18,
  className = '',
  variant = 'button',
}: EventShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${getSiteUrl()}/events/${eventId}?ref=shared_link`;
  const shareText = [
    `Check out this event on SoundBridge: ${eventTitle}`,
    eventDate ? new Date(eventDate).toLocaleString() : null,
    eventLocation,
  ]
    .filter(Boolean)
    .join(' — ');

  const trackShare = useCallback(
    async (action: 'share_link' | 'share_card') => {
      try {
        await fetchWithSupabaseAuth(`/api/events/${eventId}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
      } catch {
        /* non-blocking */
      }
    },
    [eventId],
  );

  const shareLink = useCallback(async () => {
    await trackShare('share_link');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: eventTitle, text: shareText, url: shareUrl });
        setOpen(false);
        return;
      } catch {
        /* fall through */
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[EventShareButton] copy failed', err);
    }
  }, [eventTitle, shareText, shareUrl, trackShare]);

  const shareCard = useCallback(async () => {
    await trackShare('share_card');
    await shareLink();
  }, [shareLink, trackShare]);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="Share event"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          variant === 'icon'
            ? 'inline-flex items-center justify-center rounded-full p-2 transition-opacity hover:opacity-80'
            : 'btn-secondary inline-flex items-center gap-2'
        }
        style={
          variant === 'icon'
            ? {
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }
            : undefined
        }
      >
        <Share2 size={size} />
        {variant === 'button' ? 'Share' : null}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-xl border border-white/10 bg-[#1a1a2e] p-2 shadow-xl"
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
            onClick={shareLink}
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Link2 size={16} />}
            {copied ? 'Link copied' : 'Copy / share link'}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
            onClick={shareCard}
          >
            <Share2 size={16} />
            Share card (link)
          </button>
        </div>
      )}
    </div>
  );
}
