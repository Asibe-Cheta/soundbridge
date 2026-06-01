'use client';

import { useEffect, useState } from 'react';

import type { FeedEventRecord } from '@/src/lib/event-feed';

const CACHE_KEY = 'soundbridge_feed_personalized_events_v1';
const CACHE_TTL_MS = 60 * 60 * 1000;

type CachePayload = {
  fetchedAt: number;
  events: FeedEventRecord[];
};

function readCache(): CachePayload | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed?.fetchedAt || !Array.isArray(parsed.events)) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(events: FeedEventRecord[]) {
  try {
    const payload: CachePayload = { fetchedAt: Date.now(), events };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
}

export function usePersonalizedFeedEvents(userId?: string) {
  const [events, setEvents] = useState<FeedEventRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      return;
    }

    const cached = readCache();
    if (cached) {
      setEvents(cached.events);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch('/api/events/feed-strip', { credentials: 'include', cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const rows = (json?.events ?? []) as FeedEventRecord[];
        const sorted = [...rows].sort(
          (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
        );
        const capped = sorted.slice(0, 10);
        writeCache(capped);
        setEvents(capped);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { events, loading, showStrip: events.length >= 3 };
}
