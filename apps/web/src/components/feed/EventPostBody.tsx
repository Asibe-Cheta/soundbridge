'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Music2 } from 'lucide-react';

import type { FeedEvent, PostAuthor } from '@/src/lib/types/post';
import {
  eventCtaLabel,
  formatEventLocation,
  formatEventLongDate,
  incrementEventFeedStat,
} from '@/src/lib/event-feed';
import { trackEventPromotionInteraction } from '@/src/lib/event-promotion-tracking-client';
import { LinkText } from '@/src/components/posts/LinkText';
import { VerifiedBadge } from '@/src/components/ui/VerifiedBadge';

type EventPostBodyProps = {
  event: FeedEvent;
  author?: PostAuthor & { display_name?: string };
  description?: string;
};

export function EventPostBody({ event, author, description }: EventPostBodyProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const impressionSent = useRef(false);

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    void incrementEventFeedStat(event.id, 'feed_impressions');
  }, [event.id]);

  const bodyText = (description || event.description || '').trim();
  const showSeeMore = bodyText.length > 120;

  const handleCta = () => {
    void incrementEventFeedStat(event.id, 'feed_cta_taps');
    trackEventPromotionInteraction(event.id, 'feed_card');
    router.push(`/events/${event.id}`);
  };

  const displayName = author?.display_name || author?.name || author?.username || 'Creator';

  return (
    <div className="overflow-hidden rounded-none">
      <div
        className="flex items-center gap-2 px-4 py-2.5 text-white text-xs font-bold tracking-widest uppercase"
        style={{ background: 'linear-gradient(90deg, #DC2626 0%, #EC4899 100%)' }}
      >
        <Calendar size={16} />
        <span>Event</span>
      </div>

      <div className="relative w-full aspect-[16/10] bg-[#1E1235]">
        {event.image_url ? (
          <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 720px" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #1E1235 0%, #3B1D8A 50%, #1E1235 100%)',
            }}
          />
        )}
      </div>

      <div className="px-4 md:px-6 pt-4 pb-3 space-y-2">
        <h2 className="text-white text-xl font-bold leading-tight">{event.title}</h2>
        <p className="text-gray-300 text-sm flex items-start gap-2">
          <Calendar size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{formatEventLongDate(event.event_date)}</span>
        </p>
        <p className="text-gray-300 text-sm flex items-start gap-2">
          <MapPin size={16} className="shrink-0 mt-0.5 text-red-400" />
          <span>{formatEventLocation(event)}</span>
        </p>
        {event.category ? (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}
          >
            <Music2 size={12} />
            {event.category}
          </span>
        ) : null}
      </div>

      <div className="border-t border-white/10 mx-4 md:mx-6" />

      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        <Link href={`/creator/${author?.username || author?.id}`} className="shrink-0">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-pink-500">
            {author?.avatar_url ? (
              <Image src={author.avatar_url} alt={displayName} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
        </Link>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold inline-flex items-center gap-1">
            {displayName}
            {author?.is_verified ? <VerifiedBadge size={12} /> : null}
          </p>
          <p className="text-gray-400 text-xs">is hosting an event</p>
        </div>
      </div>

      {bodyText ? (
        <div className="px-4 md:px-6 pb-3">
          <div className={`text-gray-200 text-sm whitespace-pre-wrap break-words ${!expanded && showSeeMore ? 'line-clamp-2' : ''}`}>
            <LinkText text={bodyText} />
          </div>
          {showSeeMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-red-400 hover:text-red-300 text-sm font-medium mt-1"
            >
              {expanded ? 'See less' : 'See more'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="px-4 md:px-6 pb-4">
        <button
          type="button"
          onClick={handleCta}
          className="w-full py-3 rounded-[10px] text-white text-[15px] font-bold transition-opacity hover:opacity-95"
          style={{ background: 'linear-gradient(90deg, #DC2626 0%, #EC4899 100%)' }}
        >
          {eventCtaLabel(event)}
        </button>
      </div>

      <div className="border-t border-white/10" />
    </div>
  );
}
