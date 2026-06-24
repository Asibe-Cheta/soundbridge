'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import type { FeedEventRecord } from '@/src/lib/event-feed';
import {
  formatEventCity,
  formatEventShortDate,
  formatMiniCardPrice,
} from '@/src/lib/event-feed';
import { trackEventPromotionInteraction } from '@/src/lib/event-promotion-tracking-client';

type EventMiniCardProps = {
  event: FeedEventRecord;
};

export function EventMiniCard({ event }: EventMiniCardProps) {
  const router = useRouter();

  const handleOpen = () => {
    trackEventPromotionInteraction(event.id, 'feed_card');
    router.push(`/events/${event.id}`);
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="shrink-0 w-[160px] h-[220px] rounded-xl overflow-hidden bg-gray-900 border border-white/10 text-left hover:border-white/25 transition-colors"
    >
      <div className="relative h-[105px] w-full bg-[#1E1235]">
        {event.image_url ? (
          <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="160px" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #1E1235 0%, #3B1D8A 50%, #1E1235 100%)',
            }}
          />
        )}
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white bg-black/65">
          {formatMiniCardPrice(event)}
        </span>
      </div>
      <div className="h-[115px] p-2.5 flex flex-col gap-1">
        <p className="text-white text-[13px] font-bold leading-snug line-clamp-2">{event.title}</p>
        <p className="text-gray-300 text-[13px]">{formatEventShortDate(event.event_date)}</p>
        <p className="text-gray-400 text-[11px] truncate">{formatEventCity(event)}</p>
        {event.category ? (
          <span
            className="inline-flex self-start px-2 py-0.5 rounded-full text-[10px] font-semibold mt-auto"
            style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}
          >
            {event.category}
          </span>
        ) : null}
      </div>
    </button>
  );
}
