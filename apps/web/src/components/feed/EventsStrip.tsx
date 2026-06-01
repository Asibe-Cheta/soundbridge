'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

import type { FeedEventRecord } from '@/src/lib/event-feed';
import { EventMiniCard } from '@/src/components/feed/EventMiniCard';

type EventsStripProps = {
  events: FeedEventRecord[];
};

export function EventsStrip({ events }: EventsStripProps) {
  if (events.length < 3) return null;

  return (
    <section className="mb-4 -mx-0 md:mx-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-white text-sm font-bold flex items-center gap-2">
          <MapPin size={16} className="text-red-400" />
          Events near you
        </h3>
        <span className="text-gray-400 text-xs font-medium">{events.length}</span>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20"
        style={{
          /* ~2.5 cards visible on typical mobile (160px card + 12px gap) */
          paddingRight: '40%',
        }}
      >
        {events.map((event) => (
          <div key={event.id} className="snap-start">
            <EventMiniCard event={event} />
          </div>
        ))}
      </div>
    </section>
  );
}
